"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Loader2,
  Trophy,
  UserX,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";

/** Shapes returned by GET /api/admin/analytics?months=N. */
interface AnalyticsTotals {
  revenueCents: number;
  depositsCents: number;
  bookings: number;
  completed: number;
  noShows: number;
  cancelled: number;
  noShowRate: number;
  newClients: number;
  returning: number;
}

interface MonthlyPoint {
  month: string; // "YYYY-MM"
  bookings: number;
  revenueCents: number;
}

interface TopService {
  name: string;
  count: number;
}

interface AnalyticsResponse {
  months: number;
  totals: AnalyticsTotals;
  monthly: MonthlyPoint[];
  topServices: TopService[];
}

const RANGES = [3, 6, 12] as const;
type RangeMonths = (typeof RANGES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Same-origin fetch that surfaces the server {error} on non-ok responses. */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = isRecord(data) && typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

/** "2026-09" -> "Sep" (timezone-safe). */
function monthShort(month: string): string {
  const [y = 0, m = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

/** "2026-09" -> "September 2026" (timezone-safe). */
function monthLong(month: string): string {
  const [y = 0, m = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function AdminAnalytics() {
  const [months, setMonths] = useState<RangeMonths>(6);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AnalyticsResponse>(`/api/admin/analytics?months=${months}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals ?? null;
  const monthly = data?.monthly ?? [];
  const topServices = data?.topServices ?? [];

  const maxRevenue = monthly.reduce((max, m) => Math.max(max, m.revenueCents), 0);
  const maxCount = topServices.reduce((max, s) => Math.max(max, s.count), 0);
  const hasBookings = (totals?.bookings ?? 0) > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance over the last {months} months.</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Reporting range">
          {RANGES.map((n) => (
            <button
              key={n}
              onClick={() => setMonths(n)}
              aria-pressed={months === n}
              className={`rounded-full px-3 py-1 text-sm ${
                months === n ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {n} months
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : !totals ? (
        <p className="rounded-xl border border-border py-16 text-center text-muted-foreground">
          No analytics to show yet.
        </p>
      ) : (
        <div className="space-y-8">
          {/* KPI ROW */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi
              icon={<DollarSign className="h-4 w-4" />}
              label="Revenue"
              value={formatCents(totals.revenueCents)}
              hint="completed"
              accent
            />
            <Kpi
              icon={<Wallet className="h-4 w-4" />}
              label="Deposits collected"
              value={formatCents(totals.depositsCents)}
              hint="incl. tax"
            />
            <Kpi icon={<CalendarClock className="h-4 w-4" />} label="Bookings" value={String(totals.bookings)} />
            <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={String(totals.completed)} />
            <Kpi
              icon={<UserX className="h-4 w-4" />}
              label="No-show rate"
              value={`${totals.noShowRate}%`}
              hint={`${totals.noShows} of ${totals.completed + totals.noShows}`}
            />
            <Kpi
              icon={<Users className="h-4 w-4" />}
              label="New vs Returning"
              value={`${totals.newClients} / ${totals.returning}`}
              hint="new / returning"
            />
          </div>

          {/* MONTHLY REVENUE BAR CHART */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-semibold">Monthly revenue</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-3 w-3 rounded-sm bg-brand-500" />
                Revenue (completed)
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              {monthly.length === 0 || maxRevenue <= 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No revenue in this period yet.
                </p>
              ) : (
                <>
                  <div className="flex h-56 items-end gap-1 border-b border-border pt-6 sm:gap-2">
                    {monthly.map((m) => {
                      const pct = (m.revenueCents / maxRevenue) * 100;
                      const height = m.revenueCents > 0 ? Math.max(pct, 3) : 0;
                      return (
                        <div
                          key={m.month}
                          className="group flex h-full flex-1 flex-col items-center justify-end"
                        >
                          <div
                            className="relative w-full max-w-[3rem]"
                            style={{ height: `${height}%` }}
                          >
                            <span className="pointer-events-none absolute inset-x-0 -top-5 whitespace-nowrap text-center text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
                              {formatCents(m.revenueCents)}
                            </span>
                            <div
                              title={`${monthLong(m.month)} — ${formatCents(m.revenueCents)} · ${m.bookings} ${
                                m.bookings === 1 ? "booking" : "bookings"
                              }`}
                              className="h-full w-full rounded-t bg-brand-500 transition-colors group-hover:bg-brand-600"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-1 sm:gap-2">
                    {monthly.map((m) => (
                      <div key={m.month} className="flex-1 text-center text-xs text-muted-foreground">
                        {monthShort(m.month)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* TOP SERVICES */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold">Top services</h2>
            </div>

            <div className="rounded-xl border border-border p-4">
              {topServices.length === 0 || maxCount <= 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No completed services in this period yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {topServices.map((s) => {
                    const width = Math.max((s.count / maxCount) * 100, 4);
                    return (
                      <li key={s.name} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate text-sm sm:w-40" title={s.name}>
                          {s.name}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
                          {s.count}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {!hasBookings && (
            <p className="text-center text-sm text-muted-foreground">
              No bookings in this range yet — figures update as appointments come in.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

function Kpi({ icon, label, value, hint, accent }: KpiProps) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-brand-200 bg-brand-50" : "border-border"}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-xl font-bold leading-tight tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
