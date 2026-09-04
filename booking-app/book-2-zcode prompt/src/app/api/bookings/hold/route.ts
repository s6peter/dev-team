import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe, stripeConfigured, ensureStripeCustomer } from "@/lib/stripe";
import { materializeFreeBooking } from "@/lib/booking";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;
const HOLD_TTL_MINUTES = 15;

const bodySchema = z.object({
  serviceId: z.string().uuid(),
  tierId: z.string().uuid().nullable().optional(),
  addonIds: z.array(z.string().uuid()).optional().default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().min(1).max(120),
  clientEmail: z.string().email(),
  clientPhone: z.string().max(40).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
  intake: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .max(30)
    .optional()
    .default([]),
  inspirationPhotos: z.array(z.string().url()).max(6).optional().default([]),
  policyConsented: z.boolean(),
});

/**
 * POST /api/bookings/hold — reserve the slot (concurrency-safe RPC) and either:
 *  - create a Stripe PaymentIntent for the deposit (returns clientSecret), or
 *  - for deposit-free services, book immediately.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  if (!b.policyConsented) {
    return NextResponse.json({ error: "You must accept the cancellation policy." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Reserve the slot + stash the booking payload (raises on conflict/past).
  const { data: hold, error: holdErr } = await supabase.rpc("hold_slot", {
    p_stylist: STYLIST_ID,
    p_service: b.serviceId,
    p_tier: (b.tierId ?? null) as string,
    p_date: b.date,
    p_start: b.startTime,
    p_client_name: b.clientName,
    p_client_email: b.clientEmail,
    p_client_phone: b.clientPhone || (null as unknown as string),
    p_notes: b.notes || (null as unknown as string),
    p_intake: b.intake,
    p_photos: b.inspirationPhotos,
    p_policy_consented: b.policyConsented,
    p_ttl_minutes: HOLD_TTL_MINUTES,
  });

  if (holdErr || !hold) {
    const msg = holdErr?.message || "";
    if (msg.includes("slot_unavailable")) return NextResponse.json({ error: "That time was just taken. Please pick another slot." }, { status: 409 });
    if (msg.includes("slot_in_past")) return NextResponse.json({ error: "That time is in the past." }, { status: 400 });
    if (msg.includes("service_not_found")) return NextResponse.json({ error: "Service not found." }, { status: 404 });
    console.error("hold_slot failed", holdErr);
    return NextResponse.json({ error: "Could not hold that slot." }, { status: 500 });
  }

  const h = hold as {
    id: string;
    deposit_cents: number;
    service_total_cents: number;
    tax_cents: number;
    balance_due_cents: number;
    end_time: string;
  };

  // Deposit-free service → book immediately, no Stripe.
  if (!h.deposit_cents) {
    const result = await materializeFreeBooking(h.id);
    if (result.status !== "booked") {
      return NextResponse.json({ error: "That time was just taken." }, { status: 409 });
    }
    return NextResponse.json({
      requiresPayment: false,
      appointmentId: result.appointmentId,
      holdId: h.id,
      amounts: pickAmounts(h),
    });
  }

  if (!stripeConfigured) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }

  const customerId = await ensureStripeCustomer(b.clientEmail, b.clientName);
  const pi = await stripe.paymentIntents.create({
    amount: h.deposit_cents + h.tax_cents, // deposit + tax-on-deposit
    currency: "usd",
    customer: customerId,
    setup_future_usage: "off_session", // save the card for no-show / late-cancel fees
    automatic_payment_methods: { enabled: true },
    metadata: { hold_id: h.id, stylist_id: STYLIST_ID, kind: "deposit", customer_id: customerId },
  });

  await supabase.from("slot_holds").update({ stripe_payment_intent_id: pi.id }).eq("id", h.id);

  return NextResponse.json({
    requiresPayment: true,
    holdId: h.id,
    paymentIntentId: pi.id,
    clientSecret: pi.client_secret,
    amounts: pickAmounts(h),
  });
}

function pickAmounts(h: {
  deposit_cents: number;
  service_total_cents: number;
  tax_cents: number;
  balance_due_cents: number;
}) {
  return {
    depositCents: h.deposit_cents,
    serviceTotalCents: h.service_total_cents,
    taxCents: h.tax_cents,
    chargedNowCents: h.deposit_cents + h.tax_cents,
    balanceDueCents: h.balance_due_cents,
  };
}
