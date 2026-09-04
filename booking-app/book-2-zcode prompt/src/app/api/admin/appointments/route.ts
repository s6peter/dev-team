import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { notifyConfirmed, notifyDeclined, type ApptNotice } from "@/lib/notifications";
import { computePricing } from "@/lib/pricing";
import { minutesToTime, timeToMinutes } from "@/lib/time";
import { rescheduleAppointment } from "@/lib/reschedule";
import type { Database } from "@/types/database.types";

type ApptUpdate = Database["public"]["Tables"]["appointments"]["Update"];
type ApptStatus = Database["public"]["Tables"]["appointments"]["Row"]["status"];

const patchSchema = z.object({
  appointmentId: z.string().uuid(),
  action: z.enum(["confirm", "decline", "complete", "no_show", "cancel", "revert"]),
  reason: z.string().max(500).optional(),
});

const STATUS_BY_ACTION: Record<string, string> = {
  confirm: "confirmed",
  decline: "declined",
  complete: "completed",
  no_show: "no_show",
  cancel: "cancelled",
  revert: "pending",
};

/** GET /api/admin/appointments?status=pending — stylist-scoped list. */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = new URL(request.url).searchParams.get("status");
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("appointments")
    .select(
      "*, service:services(name,category,duration_minutes), tier:service_tiers(name), client:clients(name,email,phone,tags,allergies,notes,lifetime_spend)"
    )
    .eq("stylist_id", stylist.id)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data ?? [] });
}

/** PATCH — confirm/decline/complete/no_show/cancel/revert. Decline & cancel refund. */
export async function PATCH(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { appointmentId, action, reason } = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("*, service:services(name), client:clients(name,email,phone)")
    .eq("id", appointmentId)
    .eq("stylist_id", stylist.id) // ownership check
    .maybeSingle();
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let refunded = false;
  if (action === "decline" || action === "cancel") {
    refunded = await refundDeposit(appointmentId);
  }

  const update: ApptUpdate = { status: STATUS_BY_ACTION[action] as ApptStatus };
  if (action === "cancel" || action === "decline") update.cancelled_reason = reason ?? null;

  const { error: updErr } = await supabase
    .from("appointments")
    .update(update)
    .eq("id", appointmentId)
    .eq("stylist_id", stylist.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Notify client (best effort).
  const client = appt.client as unknown as { name: string; email: string; phone: string | null } | null;
  const service = appt.service as unknown as { name: string } | null;
  if (client?.email) {
    const notice: ApptNotice = {
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      serviceName: service?.name ?? "your appointment",
      date: appt.date,
      startTime: appt.start_time,
      balanceCents: appt.balance_due_cents,
    };
    if (action === "confirm") await notifyConfirmed(notice).catch(() => {});
    else if (action === "decline") await notifyDeclined(notice, refunded).catch(() => {});
  }

  return NextResponse.json({ ok: true, refunded });
}

const createSchema = z.object({
  clientName: z.string().min(1).max(120),
  clientEmail: z.string().email(),
  clientPhone: z.string().max(40).optional().default(""),
  serviceId: z.string().uuid(),
  tierId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(["pending", "confirmed"]).default("confirmed"),
  depositPaidCents: z.number().int().min(0).optional().default(0),
});

/** POST — stylist creates an appointment directly on the calendar (walk-in / phone). */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const b = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", b.serviceId)
    .eq("stylist_id", stylist.id)
    .maybeSingle();
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  let minutes = service.duration_minutes;
  let tierAddon = 0;
  if (b.tierId) {
    const { data: tier } = await supabase
      .from("service_tiers")
      .select("price_addon,duration_addon")
      .eq("id", b.tierId)
      .maybeSingle();
    if (tier) {
      minutes += tier.duration_addon;
      tierAddon = tier.price_addon;
    }
  }
  const endTime = minutesToTime(timeToMinutes(b.startTime) + minutes);
  const pricing = computePricing({
    basePriceCents: service.base_price,
    tierPriceAddonCents: tierAddon,
    taxRate: service.tax_rate,
    depositPercent: service.deposit_percent,
    requiresDeposit: service.requires_deposit,
    depositFlatCents: service.deposit_flat_cents,
  });

  const { data: client, error: cErr } = await supabase
    .from("clients")
    .upsert(
      { stylist_id: stylist.id, name: b.clientName, email: b.clientEmail, phone: b.clientPhone || null },
      { onConflict: "stylist_id,email" }
    )
    .select("id")
    .single();
  if (cErr || !client) return NextResponse.json({ error: "Could not save client" }, { status: 500 });

  const { data: appt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: client.id,
      stylist_id: stylist.id,
      service_id: b.serviceId,
      service_tier_id: b.tierId ?? null,
      date: b.date,
      start_time: b.startTime,
      end_time: endTime,
      status: b.status,
      service_total_cents: pricing.serviceTotalCents,
      tax_cents: pricing.taxCents,
      deposit_cents: pricing.depositCents,
      balance_due_cents: pricing.balanceDueCents,
      notes: "Created by stylist",
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23P01") return NextResponse.json({ error: "That time overlaps an existing appointment." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (b.depositPaidCents > 0) {
    await supabase.from("payments").insert({
      appointment_id: appt.id,
      type: "deposit",
      amount: b.depositPaidCents,
      status: "completed",
    });
  }
  return NextResponse.json({ ok: true, appointmentId: appt.id });
}

async function refundDeposit(appointmentId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id,stripe_payment_id,status")
    .eq("appointment_id", appointmentId)
    .eq("type", "deposit")
    .eq("status", "completed")
    .maybeSingle();
  if (!payment?.stripe_payment_id) return false;
  try {
    const refund = await stripe.refunds.create({ payment_intent: payment.stripe_payment_id });
    await supabase
      .from("payments")
      .update({ status: "refunded", stripe_refund_id: refund.id })
      .eq("id", payment.id);
    return true;
  } catch (e) {
    console.error("refund failed", e);
    return false;
  }
}

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

/** PUT — admin reschedules an appointment (no client-policy restriction). */
export async function PUT(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = rescheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const result = await rescheduleAppointment(parsed.data.appointmentId, parsed.data.date, parsed.data.startTime, { stylistId: stylist.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
