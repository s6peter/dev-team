import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rescheduleAppointment } from "@/lib/reschedule";
import { stripe } from "@/lib/stripe";

const schema = z.object({
  token: z.string().uuid(),
  action: z.enum(["reschedule", "cancel"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

/** Guest manage-by-token (from confirmation email link) — reschedule or cancel. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { token, action, date, startTime } = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id,date,start_time,status,stylist_id")
    .eq("manage_token", token)
    .maybeSingle();
  if (!appt) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  if (!["pending", "confirmed"].includes(appt.status))
    return NextResponse.json({ error: "This appointment can no longer be changed." }, { status: 400 });

  if (action === "reschedule") {
    if (!date || !startTime) return NextResponse.json({ error: "Pick a new time." }, { status: 400 });
    const result = await rescheduleAppointment(appt.id, date, startTime, { enforcePolicy: true });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }

  // cancel: refund deposit only if outside the notice window
  const { data: policy } = await supabase
    .from("cancellation_policy").select("cancel_notice_hours").eq("stylist_id", appt.stylist_id).maybeSingle();
  const hoursUntil = (new Date(`${appt.date}T${appt.start_time}`).getTime() - Date.now()) / 3.6e6;
  let refunded = false;
  if (hoursUntil >= (policy?.cancel_notice_hours ?? 24)) {
    const { data: payment } = await supabase
      .from("payments").select("id,stripe_payment_id").eq("appointment_id", appt.id).eq("type", "deposit").eq("status", "completed").maybeSingle();
    if (payment?.stripe_payment_id) {
      try {
        const r = await stripe.refunds.create({ payment_intent: payment.stripe_payment_id });
        await supabase.from("payments").update({ status: "refunded", stripe_refund_id: r.id }).eq("id", payment.id);
        refunded = true;
      } catch (e) { console.error("manage cancel refund failed", e); }
    }
  }
  await supabase.from("appointments").update({ status: "cancelled", cancelled_reason: "Cancelled by client" }).eq("id", appt.id);
  return NextResponse.json({ ok: true, refunded });
}
