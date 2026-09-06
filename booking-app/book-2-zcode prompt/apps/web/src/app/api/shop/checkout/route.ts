import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe, stripeConfigured, ensureStripeCustomer } from "@/lib/stripe";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(99),
      })
    )
    .min(1),
  customer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z
      .string()
      .max(40)
      .refine((v) => v.replace(/\D/g, "").length >= 10, "A valid phone number is required."),
  }),
});

/**
 * POST /api/shop/checkout — recompute the subtotal from the DB (NEVER trust
 * client prices), insert a 'pending' product_orders row, and create a Stripe
 * PaymentIntent for the FULL subtotal (no deposit/tax/hold). Returns the
 * clientSecret so the browser Payment Element can confirm.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { items, customer } = parsed.data;

  const supabase = createSupabaseAdminClient();

  // Collapse duplicate product ids into summed quantities.
  const qtyById = new Map<string, number>();
  for (const it of items) qtyById.set(it.productId, (qtyById.get(it.productId) ?? 0) + it.qty);

  // Load the authoritative product rows (active + owned by this stylist).
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id,name,price_cents,stock,is_active")
    .eq("stylist_id", STYLIST_ID)
    .eq("is_active", true)
    .in("id", Array.from(qtyById.keys()));

  if (prodErr) {
    console.error("shop checkout product load failed", prodErr);
    return NextResponse.json({ error: "Could not load products." }, { status: 500 });
  }

  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  // Recompute the subtotal server-side; reject anything unavailable / out of stock.
  const orderItems: { product_id: string; name: string; price_cents: number; qty: number }[] = [];
  let subtotalCents = 0;
  for (const [productId, qty] of Array.from(qtyById.entries())) {
    const p = byId.get(productId);
    if (!p) {
      return NextResponse.json({ error: "One or more items are no longer available." }, { status: 409 });
    }
    if (p.stock != null && p.stock < qty) {
      return NextResponse.json({ error: `Only ${p.stock} of “${p.name}” left in stock.` }, { status: 409 });
    }
    subtotalCents += p.price_cents * qty;
    orderItems.push({ product_id: p.id, name: p.name, price_cents: p.price_cents, qty });
  }

  if (subtotalCents <= 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  if (!stripeConfigured) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }

  // Persist the pending order first so the order_id exists for PI metadata.
  const { data: order, error: orderErr } = await supabase
    .from("product_orders")
    .insert({
      stylist_id: STYLIST_ID,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      items: orderItems,
      subtotal_cents: subtotalCents,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    console.error("shop order insert failed", orderErr);
    return NextResponse.json({ error: "Could not create your order." }, { status: 500 });
  }

  const customerId = await ensureStripeCustomer(customer.email, customer.name);
  const pi = await stripe.paymentIntents.create({
    amount: subtotalCents, // FULL payment — no deposit, no tax
    currency: "usd",
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { kind: "shop_order", order_id: order.id, stylist_id: STYLIST_ID },
  });

  await supabase
    .from("product_orders")
    .update({ stripe_payment_intent_id: pi.id })
    .eq("id", order.id);

  return NextResponse.json({
    clientSecret: pi.client_secret,
    orderId: order.id,
    subtotalCents,
  });
}
