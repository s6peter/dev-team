import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeEarnings } from "@/lib/payouts";
import { createTransfer } from "@/lib/connect";
import type { Database } from "@/types/database.types";

type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"];

/** YYYY-MM-DD for "today" (server local date). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add one day to a 'YYYY-MM-DD' string, returning 'YYYY-MM-DD'. */
function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Earliest date we scan when a stylist has never been paid out. */
const EPOCH = "2000-01-01";

/**
 * The current UNPAID period for a stylist: it begins the day after the most
 * recent PAID payout's period_end (or the epoch if never paid) and runs through
 * today. computeEarnings only counts completed appointments in that window, so
 * already-paid work is naturally excluded.
 */
function pendingWindow(lastPaidEnd: string | null): { from: string; to: string } {
  return { from: lastPaidEnd ? nextDay(lastPaidEnd) : EPOCH, to: today() };
}

/**
 * GET — OWNER ONLY. Every stylist with their current pending totals (computed
 * over the unpaid period), bank/payout status, and full payout history.
 */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stylist.is_owner) {
    return NextResponse.json({ error: "Only the owner can manage payouts." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: stylists, error: sErr } = await supabase
    .from("stylists")
    .select("id, name, commission_rate, is_w2, payouts_enabled, stripe_account_id")
    .order("is_owner", { ascending: false })
    .order("name", { ascending: true });
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const { data: allPayouts, error: pErr } = await supabase
    .from("payouts")
    .select("*")
    .order("created_at", { ascending: false });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const byStylist = new Map<string, PayoutRow[]>();
  for (const row of allPayouts ?? []) {
    const list = byStylist.get(row.stylist_id) ?? [];
    list.push(row);
    byStylist.set(row.stylist_id, list);
  }

  const rows = await Promise.all(
    (stylists ?? []).map(async (s) => {
      const history = byStylist.get(s.id) ?? [];
      const lastPaidEnd =
        history.find((h) => h.status === "paid")?.period_end ?? null;
      const { from, to } = pendingWindow(lastPaidEnd);
      const earnings = await computeEarnings(s.id, from, to);
      return {
        stylist: {
          id: s.id,
          name: s.name,
          commission_rate: Number(s.commission_rate ?? 0),
          is_w2: Boolean(s.is_w2),
          payouts_enabled: Boolean(s.payouts_enabled),
        },
        pending: {
          from,
          to,
          count: earnings.totals.count,
          gross_cents: earnings.totals.gross_cents,
          commission_cents: earnings.totals.commission_cents,
          withholding_cents: earnings.totals.withholding_cents,
          net_cents: earnings.totals.net_cents,
        },
        history,
      };
    })
  );

  return NextResponse.json(rows);
}

const createSchema = z.object({
  stylistId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["stripe", "manual"]),
});

/**
 * POST — OWNER ONLY. Pay a stylist for [from, to]:
 * compute totals, (stripe) create a Connect transfer if the stylist is
 * payouts_enabled, insert a paid payout row (with a commission_rate snapshot),
 * and return it. 409 if a paid payout already covers that exact period.
 */
export async function POST(request: Request) {
  const owner = await getAdminStylist();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!owner.is_owner) {
    return NextResponse.json({ error: "Only the owner can send payouts." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { stylistId, from, to, method } = parsed.data;
  if (from > to) {
    return NextResponse.json({ error: "Start date must be on or before end date." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: stylist, error: sErr } = await supabase
    .from("stylists")
    .select("id, name, commission_rate, payouts_enabled, stripe_account_id")
    .eq("id", stylistId)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!stylist) return NextResponse.json({ error: "Stylist not found." }, { status: 404 });

  // Idempotency: never double-pay the same exact period.
  const { data: existing, error: exErr } = await supabase
    .from("payouts")
    .select("id")
    .eq("stylist_id", stylistId)
    .eq("period_start", from)
    .eq("period_end", to)
    .eq("status", "paid")
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (existing) {
    return NextResponse.json(
      { error: "A paid payout already covers that period." },
      { status: 409 }
    );
  }

  const earnings = await computeEarnings(stylistId, from, to);
  const totals = earnings.totals;
  if (totals.net_cents <= 0) {
    return NextResponse.json(
      { error: "There is nothing to pay out for that period." },
      { status: 400 }
    );
  }

  // For a Stripe payout, require the linked bank BEFORE creating any ledger row.
  if (method === "stripe" && (!stylist.payouts_enabled || !stylist.stripe_account_id)) {
    return NextResponse.json(
      {
        error:
          "This stylist hasn't linked a bank account yet. Ask them to link Stripe, or mark this payout as paid manually.",
      },
      { status: 400 }
    );
  }

  // Insert a PENDING row FIRST so money can never move without a durable record,
  // and the partial unique index (stylist_id, period_start, period_end) blocks a
  // concurrent double-pay for the same window.
  const { data: pending, error: insErr } = await supabase
    .from("payouts")
    .insert({
      stylist_id: stylistId,
      period_start: from,
      period_end: to,
      appointment_count: totals.count,
      gross_cents: totals.gross_cents,
      commission_cents: totals.commission_cents,
      withholding_cents: totals.withholding_cents,
      net_cents: totals.net_cents,
      commission_rate: earnings.rate, // snapshot the rate at pay time
      status: "pending",
      method,
    })
    .select("*")
    .single();
  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json(
        { error: "A payout for that period already exists or is in progress." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Manual payout: no money moves through us — just finalize the row as paid.
  if (method === "manual") {
    const { data: paid, error: upErr } = await supabase
      .from("payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", pending.id)
      .select("*")
      .single();
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json(paid);
  }

  // Stripe payout: transfer, then finalize the pending row — 'paid' on success,
  // 'failed' (with the error) on failure. Never a silent money move without a record.
  const transfer = await createTransfer(stylist.stripe_account_id!, totals.net_cents, {
    stylist_id: stylistId,
    period_start: from,
    period_end: to,
    payout_id: pending.id,
  });
  if (!transfer.ok) {
    await supabase.from("payouts").update({ status: "failed", note: transfer.error }).eq("id", pending.id);
    return NextResponse.json({ error: transfer.error }, { status: 502 });
  }
  const { data: paid, error: upErr } = await supabase
    .from("payouts")
    .update({ status: "paid", stripe_transfer_id: transfer.transferId, paid_at: new Date().toISOString() })
    .eq("id", pending.id)
    .select("*")
    .single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json(paid);
}
