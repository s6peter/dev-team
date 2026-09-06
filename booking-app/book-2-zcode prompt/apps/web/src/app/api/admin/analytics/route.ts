import { NextResponse } from "next/server";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** GET reporting metrics for the last N months (default 6). */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const months = Math.min(12, Math.max(1, Number(new URL(request.url).searchParams.get("months")) || 6));

  const supabase = createSupabaseAdminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: appts } = await supabase
    .from("appointments")
    .select("id,date,status,service_total_cents,deposit_cents,tax_cents,client_id,created_at,service:services(name,category)")
    .eq("stylist_id", stylist.id)
    .gte("date", sinceStr);

  const rows = appts ?? [];
  const completed = rows.filter((a) => a.status === "completed");
  const noShows = rows.filter((a) => a.status === "no_show");
  const cancelled = rows.filter((a) => ["cancelled", "declined"].includes(a.status));

  // revenue = completed service totals; deposits collected = deposit+tax on non-cancelled
  const revenueCents = completed.reduce((n, a) => n + a.service_total_cents, 0);
  const depositsCents = rows
    .filter((a) => ["pending", "confirmed", "completed"].includes(a.status))
    .reduce((n, a) => n + a.deposit_cents + a.tax_cents, 0);

  // bookings per month (by created date)
  const byMonth: Record<string, { bookings: number; revenueCents: number }> = {};
  for (const a of rows) {
    const m = (a.created_at ?? a.date).slice(0, 7);
    const bucket = (byMonth[m] ??= { bookings: 0, revenueCents: 0 });
    bucket.bookings++;
    if (a.status === "completed") bucket.revenueCents += a.service_total_cents;
  }
  const monthly = Object.entries(byMonth).sort().map(([month, v]) => ({ month, ...v }));

  // top services (by completed count)
  const svcCount: Record<string, number> = {};
  for (const a of completed) {
    const name = (a.service as unknown as { name: string } | null)?.name ?? "Unknown";
    svcCount[name] = (svcCount[name] ?? 0) + 1;
  }
  const topServices = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));

  // new vs returning (clients with >1 completed booking are returning)
  const perClient: Record<string, number> = {};
  for (const a of completed) perClient[a.client_id] = (perClient[a.client_id] ?? 0) + 1;
  const returning = Object.values(perClient).filter((n) => n > 1).length;
  const newClients = Object.values(perClient).filter((n) => n === 1).length;

  const totalFinished = completed.length + noShows.length;
  const noShowRate = totalFinished ? Math.round((noShows.length / totalFinished) * 100) : 0;

  return NextResponse.json({
    months,
    totals: {
      revenueCents,
      depositsCents,
      bookings: rows.length,
      completed: completed.length,
      noShows: noShows.length,
      cancelled: cancelled.length,
      noShowRate,
      newClients,
      returning,
    },
    monthly,
    topServices,
  });
}
