import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { notifyBookingReceived } from "@/lib/notifications";

export type MaterializeResult =
  | { status: "booked"; appointmentId: string }
  | { status: "already"; appointmentId: string | null }
  | { status: "slot_taken" }
  | { status: "not_paid" }
  | { status: "no_hold" };

/**
 * Turns a paid (or deposit-free) hold into a pending appointment. Idempotent:
 * guarded by processed_stripe_events keyed on the PaymentIntent id, so the Stripe
 * webhook and the client-side confirm route can both call it safely.
 *
 * If verifyPayment is true, the PaymentIntent must be `succeeded` in Stripe.
 */
export async function materializeBooking(
  paymentIntentId: string,
  opts: { verifyPayment?: boolean } = {}
): Promise<MaterializeResult> {
  const supabase = createSupabaseAdminClient();
  const guardKey = `pi_${paymentIntentId}`;

  // Idempotency gate.
  const { error: guardErr } = await supabase
    .from("processed_stripe_events")
    .insert({ event_id: guardKey });
  if (guardErr) {
    // Already processed — return the existing appointment if we can find it.
    const { data } = await supabase
      .from("payments")
      .select("appointment_id")
      .eq("stripe_payment_id", paymentIntentId)
      .maybeSingle();
    return { status: "already", appointmentId: data?.appointment_id ?? null };
  }

  if (opts.verifyPayment) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        await supabase.from("processed_stripe_events").delete().eq("event_id", guardKey);
        return { status: "not_paid" };
      }
    } catch {
      await supabase.from("processed_stripe_events").delete().eq("event_id", guardKey);
      return { status: "not_paid" };
    }
  }

  const { data: hold } = await supabase
    .from("slot_holds")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!hold) {
    await supabase.from("processed_stripe_events").delete().eq("event_id", guardKey);
    return { status: "no_hold" };
  }

  const { data: appointmentId, error: rpcErr } = await supabase.rpc(
    "confirm_booking_from_hold",
    { p_hold_id: hold.id, p_payment_intent: paymentIntentId }
  );

  if (rpcErr) {
    // Slot got taken between hold and payment, or hold expired -> refund the deposit.
    await supabase.from("processed_stripe_events").delete().eq("event_id", guardKey);
    try {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    } catch {
      /* best effort */
    }
    return { status: "slot_taken" };
  }

  await saveCardOnFile(appointmentId as string, paymentIntentId);
  await sendReceivedNotice(appointmentId as string);
  return { status: "booked", appointmentId: appointmentId as string };
}

/** Deposit-free (e.g. takedown) booking: no Stripe, materialize the hold directly. */
export async function materializeFreeBooking(holdId: string): Promise<MaterializeResult> {
  const supabase = createSupabaseAdminClient();
  const synthetic = `free_${holdId}`;
  await supabase.from("processed_stripe_events").insert({ event_id: `pi_${synthetic}` });
  const { data: appointmentId, error } = await supabase.rpc("confirm_booking_from_hold", {
    p_hold_id: holdId,
    p_payment_intent: synthetic,
  });
  if (error) return { status: "slot_taken" };
  await sendReceivedNotice(appointmentId as string);
  return { status: "booked", appointmentId: appointmentId as string };
}

/** Persist the saved card (customer + payment method) so fees can be charged later. */
async function saveCardOnFile(appointmentId: string, paymentIntentId: string) {
  const supabase = createSupabaseAdminClient();
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
    const custId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id;
    if (pmId) await supabase.from("appointments").update({ stripe_payment_method_id: pmId }).eq("id", appointmentId);
    if (custId) {
      const { data: appt } = await supabase.from("appointments").select("client_id").eq("id", appointmentId).maybeSingle();
      if (appt?.client_id) await supabase.from("clients").update({ stripe_customer_id: custId }).eq("id", appt.client_id);
    }
  } catch (e) {
    console.error("saveCardOnFile failed", e);
  }
}

async function sendReceivedNotice(appointmentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "date,start_time,deposit_cents,balance_due_cents,manage_token,service:services(name),client:clients(name,email,phone)"
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || !appt.client) return;
  const client = appt.client as unknown as { name: string; email: string; phone: string | null };
  const service = appt.service as unknown as { name: string } | null;
  await notifyBookingReceived({
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone,
    serviceName: service?.name ?? "your appointment",
    date: appt.date,
    startTime: appt.start_time,
    depositCents: appt.deposit_cents,
    balanceCents: appt.balance_due_cents,
    manageToken: appt.manage_token,
  }).catch((e) => console.error("notify failed", e));
}
