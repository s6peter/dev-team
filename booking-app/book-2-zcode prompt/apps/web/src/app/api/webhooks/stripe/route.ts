import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { markShopOrderPaid } from "@/lib/shop";
import { materializeBooking } from "@/lib/booking";

/**
 * Stripe webhook. Signature-verified + idempotent. On deposit success it
 * materializes the booking as PENDING (the stylist still confirms/declines).
 * On failure/cancel it releases the slot hold.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Event-level idempotency (materializeBooking also guards on the PI id).
  const supabase = createSupabaseAdminClient();
  const { error: dupErr } = await supabase
    .from("processed_stripe_events")
    .insert({ event_id: event.id });
  if (dupErr) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.kind === "deposit") {
          await materializeBooking(pi.id, { verifyPayment: false });
        } else if (pi.metadata?.kind === "shop_order" && pi.metadata.order_id) {
          // Full-payment shop order → mark 'paid'. Idempotent: only rows still
          // 'pending' are flipped, so a duplicate delivery (or the client-side
          // /api/shop/confirm) can't double-process.
          await markShopOrderPaid(pi.metadata.order_id, pi.id);
        }
        break;
      }
      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabase.from("slot_holds").delete().eq("stripe_payment_intent_id", pi.id);
        break;
      }
      case "account.updated": {
        // A stylist finished (or advanced) Stripe Connect onboarding. Mirror
        // whether the account can receive payouts onto the stylists row.
        const account = event.data.object as Stripe.Account;
        const payoutsEnabled = Boolean(account.charges_enabled && account.payouts_enabled);
        await supabase
          .from("stylists")
          .update({ payouts_enabled: payoutsEnabled })
          .eq("stripe_account_id", account.id);
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
