import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

const schema = z.object({
  appointmentId: z.string().uuid(),
  tipCents: z.number().int().min(0).max(1000000).optional().default(0),
  amountCents: z.number().int().min(0).max(1000000).optional(), // override balance
});

/** GET preview: remaining balance + whether a card is on file / already paid. */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("appointmentId");
  if (!id) return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase.from("appointments")
    .select("balance_due_cents,stripe_payment_method_id").eq("id", id).eq("stylist_id", stylist.id).maybeSingle();
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: paid } = await supabase.from("payments")
    .select("id").eq("appointment_id", id).eq("type", "balance").eq("status", "completed").maybeSingle();
  return NextResponse.json({ balanceCents: appt.balance_due_cents, hasCard: Boolean(appt.stripe_payment_method_id), alreadyPaid: Boolean(paid) });
}

/** POST — charge the remaining balance (+ optional tip) on the saved card. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { appointmentId, tipCents } = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase.from("appointments")
    .select("id,status,balance_due_cents,stripe_payment_method_id,client:clients(stripe_customer_id,name)")
    .eq("id", appointmentId).eq("stylist_id", stylist.id).maybeSingle();
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["confirmed", "completed"].includes(appt.status)) {
    return NextResponse.json({ error: "Balance can only be charged for confirmed or completed appointments." }, { status: 400 });
  }

  const client = appt.client as unknown as { stripe_customer_id: string | null; name: string } | null;
  if (!appt.stripe_payment_method_id || !client?.stripe_customer_id) {
    return NextResponse.json({ error: "No card on file for this appointment." }, { status: 400 });
  }
  // Guard: don't double-charge the balance.
  const { data: alreadyPaid } = await supabase.from("payments")
    .select("id").eq("appointment_id", appointmentId).eq("type", "balance").eq("status", "completed").maybeSingle();
  if (alreadyPaid) return NextResponse.json({ error: "Balance already paid." }, { status: 409 });

  const balanceCents = parsed.data.amountCents ?? appt.balance_due_cents;
  const totalCents = balanceCents + tipCents;
  if (totalCents < 50) return NextResponse.json({ error: "Nothing to charge." }, { status: 400 });

  try {
    const pi = await stripe.paymentIntents.create({
      amount: totalCents, currency: "usd",
      customer: client.stripe_customer_id, payment_method: appt.stripe_payment_method_id,
      off_session: true, confirm: true,
      description: `Balance${tipCents ? " + tip" : ""} — ${client.name}`,
      metadata: { appointment_id: appointmentId, kind: "balance" },
    }, { idempotencyKey: `bal_${appointmentId}` });

    const { error: payErr } = await supabase.from("payments").insert({ appointment_id: appointmentId, type: "balance", amount: balanceCents, stripe_payment_id: pi.id, status: "completed" });
    if (payErr) return NextResponse.json({ error: "Balance already charged." }, { status: 409 });
    if (tipCents > 0) await supabase.from("payments").insert({ appointment_id: appointmentId, type: "tip", amount: tipCents, stripe_payment_id: pi.id, status: "completed" });
    return NextResponse.json({ ok: true, chargedCents: totalCents, status: pi.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Charge failed";
    return NextResponse.json({ error: `Card charge failed: ${msg}` }, { status: 402 });
  }
}
