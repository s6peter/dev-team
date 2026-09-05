import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { hoursUntilSalon } from "@/lib/time";
import { notifyWaitlistOnOpening } from "@/lib/waitlist";

const schema = z.object({ appointmentId: z.string().uuid() });

/** Client cancels their own appointment. Deposit is refunded only if outside the
 *  policy notice window; inside the window it is forfeit (as consented at booking). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ownership via RLS: this select only returns the row if it's the user's.
  const { data: appt } = await supabase
    .from("appointments")
    .select("id,date,start_time,status,stylist_id,service_id")
    .eq("id", parsed.data.appointmentId)
    .maybeSingle();
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["pending", "confirmed"].includes(appt.status)) {
    return NextResponse.json({ error: "This appointment can't be cancelled." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: policy } = await admin
    .from("cancellation_policy")
    .select("cancel_notice_hours")
    .eq("stylist_id", appt.stylist_id)
    .maybeSingle();

  const hoursUntil = hoursUntilSalon(appt.date, appt.start_time);
  const withinWindow = hoursUntil < (policy?.cancel_notice_hours ?? 24);

  let refunded = false;
  if (!withinWindow) {
    const { data: payment } = await admin
      .from("payments")
      .select("id,stripe_payment_id")
      .eq("appointment_id", appt.id)
      .eq("type", "deposit")
      .eq("status", "completed")
      .maybeSingle();
    if (payment?.stripe_payment_id) {
      try {
        const r = await stripe.refunds.create({ payment_intent: payment.stripe_payment_id });
        await admin.from("payments").update({ status: "refunded", stripe_refund_id: r.id }).eq("id", payment.id);
        refunded = true;
      } catch (e) {
        console.error("client cancel refund failed", e);
      }
    }
  }

  await admin
    .from("appointments")
    .update({ status: "cancelled", cancelled_reason: "Cancelled by client" })
    .eq("id", appt.id);

  await notifyWaitlistOnOpening(appt.stylist_id, appt.date, appt.service_id).catch(() => {});

  return NextResponse.json({ ok: true, refunded, withinWindow });
}
