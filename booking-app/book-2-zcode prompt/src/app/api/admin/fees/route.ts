import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

const bodySchema = z.object({
  appointmentId: z.string().uuid(),
  kind: z.enum(["no_show", "late_cancel", "custom"]),
  amountCents: z.number().int().min(50).max(1000000).optional(),
});

/** GET preview of the fee amount that would be charged. */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get("appointmentId");
  const kind = searchParams.get("kind") as "no_show" | "late_cancel" | null;
  if (!appointmentId || !kind) return NextResponse.json({ error: "appointmentId and kind required" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("service_total_cents,stripe_payment_method_id")
    .eq("id", appointmentId).eq("stylist_id", stylist.id).maybeSingle();
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: policy } = await supabase.from("cancellation_policy").select("no_show_fee_percent,late_cancel_fee_percent").eq("stylist_id", stylist.id).maybeSingle();
  const pct = kind === "no_show" ? Number(policy?.no_show_fee_percent ?? 100) : Number(policy?.late_cancel_fee_percent ?? 100);
  return NextResponse.json({ feeCents: Math.round(appt.service_total_cents * pct / 100), hasCard: Boolean(appt.stripe_payment_method_id) });
}

/** POST — charge the saved card off-session for a no-show / late-cancel / custom fee. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { appointmentId, kind, amountCents } = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id,service_total_cents,stripe_payment_method_id,fee_charged_cents,client:clients(stripe_customer_id,email,name)")
    .eq("id", appointmentId).eq("stylist_id", stylist.id).maybeSingle();
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = appt.client as unknown as { stripe_customer_id: string | null; email: string; name: string } | null;
  if (!appt.stripe_payment_method_id || !client?.stripe_customer_id) {
    return NextResponse.json({ error: "No card on file for this appointment." }, { status: 400 });
  }

  let feeCents = amountCents ?? 0;
  if (!amountCents) {
    const { data: policy } = await supabase.from("cancellation_policy").select("no_show_fee_percent,late_cancel_fee_percent").eq("stylist_id", stylist.id).maybeSingle();
    const pct = kind === "no_show" ? Number(policy?.no_show_fee_percent ?? 100) : Number(policy?.late_cancel_fee_percent ?? 100);
    feeCents = Math.round(appt.service_total_cents * pct / 100);
  }
  if (feeCents < 50) return NextResponse.json({ error: "Fee amount too small." }, { status: 400 });

  try {
    const pi = await stripe.paymentIntents.create({
      amount: feeCents,
      currency: "usd",
      customer: client.stripe_customer_id,
      payment_method: appt.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: `${kind.replace("_", " ")} fee — ${client.name}`,
      metadata: { appointment_id: appointmentId, kind: `fee_${kind}` },
    });
    await supabase.from("payments").insert({
      appointment_id: appointmentId, type: "fee", amount: feeCents, stripe_payment_id: pi.id, status: pi.status === "succeeded" ? "completed" : "pending",
    });
    await supabase.from("appointments").update({ fee_charged_cents: appt.fee_charged_cents + feeCents }).eq("id", appointmentId);
    return NextResponse.json({ ok: true, feeCents, status: pi.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Charge failed";
    // record the failed attempt
    await supabase.from("payments").insert({ appointment_id: appointmentId, type: "fee", amount: feeCents, status: "failed" });
    return NextResponse.json({ error: `Card charge failed: ${msg}` }, { status: 402 });
  }
}
