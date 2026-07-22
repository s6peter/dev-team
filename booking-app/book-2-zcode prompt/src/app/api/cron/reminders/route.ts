import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addDays, nowInSalonTz, timeToMinutes } from "@/lib/time";
import {
  notifyReminder,
  notifyReviewRequest,
  type ApptNotice,
} from "@/lib/notifications";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

interface Row {
  id: string;
  date: string;
  start_time: string;
  balance_due_cents: number;
  service: { name: string } | null;
  client: { name: string; email: string; phone: string | null } | null;
}

const toNotice = (r: Row): ApptNotice => ({
  clientName: r.client?.name ?? "there",
  clientEmail: r.client?.email ?? "",
  clientPhone: r.client?.phone,
  serviceName: r.service?.name ?? "your appointment",
  date: r.date,
  startTime: r.start_time,
  balanceCents: r.balance_due_cents,
});

const SELECT =
  "id,date,start_time,balance_due_cents,service:services(name),client:clients(name,email,phone)";

/**
 * Cron entrypoint (guarded by CRON_SECRET). Idempotent: each message type is
 * gated by its *_sent_at column so repeated runs never double-send.
 * Schedule every ~15-30 min on Vercel Cron.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = nowInSalonTz();
  const results = { holdsCleaned: 0, sent24h: 0, sent2h: 0, reviewReqs: 0, errors: [] as string[] };

  const { data: cleaned } = await supabase.rpc("cleanup_expired_holds");
  results.holdsCleaned = cleaned ?? 0;

  // --- 24h reminders: confirmed appts tomorrow, not yet reminded ---
  const tomorrow = addDays(now.dateStr, 1);
  const { data: appts24 } = await supabase
    .from("appointments")
    .select(SELECT)
    .eq("stylist_id", STYLIST_ID)
    .eq("status", "confirmed")
    .eq("date", tomorrow)
    .is("reminder_24h_sent_at", null);
  for (const r of (appts24 ?? []) as unknown as Row[]) {
    try {
      await notifyReminder(toNotice(r), "24h");
      await supabase.from("appointments").update({ reminder_24h_sent_at: new Date().toISOString() }).eq("id", r.id);
      results.sent24h++;
    } catch (e) {
      results.errors.push(`24h ${r.id}: ${e}`);
    }
  }

  // --- 2h reminders: confirmed appts today starting in ~90-150 min ---
  const { data: apptsToday } = await supabase
    .from("appointments")
    .select(SELECT)
    .eq("stylist_id", STYLIST_ID)
    .eq("status", "confirmed")
    .eq("date", now.dateStr)
    .is("reminder_2h_sent_at", null);
  for (const r of (apptsToday ?? []) as unknown as Row[]) {
    const diff = timeToMinutes(r.start_time) - now.minutes;
    if (diff >= 90 && diff <= 150) {
      try {
        await notifyReminder(toNotice(r), "2h");
        await supabase.from("appointments").update({ reminder_2h_sent_at: new Date().toISOString() }).eq("id", r.id);
        results.sent2h++;
      } catch (e) {
        results.errors.push(`2h ${r.id}: ${e}`);
      }
    }
  }

  // --- Review requests: completed appts not yet asked ---
  const { data: done } = await supabase
    .from("appointments")
    .select(SELECT)
    .eq("stylist_id", STYLIST_ID)
    .eq("status", "completed")
    .is("review_request_sent_at", null);
  for (const r of (done ?? []) as unknown as Row[]) {
    try {
      await notifyReviewRequest(toNotice(r));
      await supabase.from("appointments").update({ review_request_sent_at: new Date().toISOString() }).eq("id", r.id);
      results.reviewReqs++;
    } catch (e) {
      results.errors.push(`review ${r.id}: ${e}`);
    }
  }

  return NextResponse.json(results);
}

// Allow manual GET trigger in local dev (same auth).
export const GET = POST;
