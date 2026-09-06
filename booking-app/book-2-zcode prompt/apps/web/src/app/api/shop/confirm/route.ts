import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { markShopOrderPaid } from "@/lib/shop";

const schema = z.object({ paymentIntentId: z.string().min(1) });

/**
 * POST /api/shop/confirm — called by the checkout step after Stripe confirms.
 * Verifies the PaymentIntent actually succeeded (server-side, cannot be
 * spoofed) and marks the order 'paid'. Idempotent with the Stripe webhook:
 * the update only touches rows still 'pending', so a double call is a no-op.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const pi = await stripe.paymentIntents.retrieve(parsed.data.paymentIntentId).catch(() => null);
  if (!pi) return NextResponse.json({ ok: false, error: "Payment not found." }, { status: 404 });
  if (pi.status !== "succeeded") {
    return NextResponse.json({ ok: false, error: "Payment not completed yet." }, { status: 402 });
  }
  if (pi.metadata?.kind !== "shop_order" || !pi.metadata.order_id) {
    return NextResponse.json({ ok: false, error: "Not a shop order." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: order } = await supabase
    .from("product_orders")
    .select("id,status")
    .eq("id", pi.metadata.order_id)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order could not be found." }, { status: 404 });
  }

  // Mark paid + decrement stock, idempotently (shared with the Stripe webhook).
  await markShopOrderPaid(order.id, pi.id);

  return NextResponse.json({ ok: true, orderId: order.id });
}
