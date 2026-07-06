import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;
    case "payment_intent.payment_failed":
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(failedPayment);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const appointmentId = paymentIntent.metadata.appointment_id;

  if (appointmentId) {
    // Update payment status
    await supabase
      .from("payments")
      .update({ status: "completed", stripe_payment_id: paymentIntent.id })
      .eq("appointment_id", appointmentId)
      .eq("type", "deposit");

    // Update appointment status
    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appointmentId);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const appointmentId = paymentIntent.metadata.appointment_id;

  if (appointmentId) {
    await supabase
      .from("payments")
      .update({ status: "failed", stripe_payment_id: paymentIntent.id })
      .eq("appointment_id", appointmentId)
      .eq("type", "deposit");
  }
}
