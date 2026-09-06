"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Download,
  Loader2,
  Percent,
  Receipt,
  Scissors,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import { addDays, dayOfWeek, nowInSalonTz } from "@/lib/time";
import type { EarningsLineItem, EarningsTotals } from "@/lib/payouts";

interface EarningsResponse {
  from: string;
  to: string;
  rate: number;
  isW2: boolean;
  withholdingRate: number;
  lineItems: EarningsLineItem[];
  totals: EarningsTotals;
}

interface ConnectStatus {
  accountId: string | null;
  payoutsEnabled: boolean;
}

const dateInputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

/** First and last day (YYYY-MM-DD) of the current calendar month. */
function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(y, m + 1, 0).getDate();
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
}

/** Current calendar week (Sun–Sat) in the salon timezone, as YYYY-MM-DD. */
function currentWeekRangeTz(): { from: string; to: string } {
  const { dateStr } = nowInSalonTz();
  const from = addDays(dateStr, -dayOfWeek(dateStr));
  return { from, to: addDays(from, 6) };
}

/** Current calendar month in the salon timezone, as YYYY-MM-DD. */
function currentMonthRangeTz(): { from: string; to: string } {
  const { dateStr } = nowInSalonTz();
  const [y, m] = dateStr.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function AdminEarnings() {
  const defaults = useMemo(currentMonthRange, []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  // Net payout for the current salon-tz week and month, independent of the range above.
  const [weekNet, setWeekNet] = useState<number | null>(null);
  const [monthNet, setMonthNet] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await apiFetch<EarningsResponse>(`/api/admin/earnings?${params.toString()}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load earnings.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Bank / Connect status is loaded once, independent of the date range.
  const loadConnect = useCallback(async () => {
    setConnectError(null);
    try {
      const res = await apiFetch<ConnectStatus>("/api/admin/connect");
      setConnect(res);
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Could not load bank status.");
    }
  }, []);

  useEffect(() => {
    loadConnect();
  }, [loadConnect]);

  // Week/month net totals are anchored to "now" in the salon tz, not the picked range.
  const loadPeriodTotals = useCallback(async () => {
    const week = currentWeekRangeTz();
    const month = currentMonthRangeTz();
    try {
      const [w, m] = await Promise.all([
        apiFetch<EarningsResponse>(
          `/api/admin/earnings?${new URLSearchParams({ from: week.from, to: week.to }).toString()}`
        ),
        apiFetch<EarningsResponse>(
          `/api/admin/earnings?${new URLSearchParams({ from: month.from, to: month.to }).toString()}`
        ),
      ]);
      setWeekNet(w.totals.net_cents);
      setMonthNet(m.totals.net_cents);
    } catch {
      // Non-fatal: the range statement (loaded separately) remains usable.
      setWeekNet(null);
      setMonthNet(null);
    }
  }, []);

  useEffect(() => {
    loadPeriodTotals();
  }, [loadPeriodTotals]);

  /** Navigate to the CSV route so the browser downloads it (auth cookie rides along). */
  const downloadCsv = useCallback(() => {
    const params = new URLSearchParams({ from, to, format: "csv" });
    window.location.assign(`/api/admin/earnings?${params.toString()}`);
  }, [from, to]);

  /** Start Stripe hosted onboarding: POST returns a URL we redirect the browser to. */
  const linkBank = useCallback(async () => {
    setLinking(true);
    setConnectError(null);
    try {
      const res = await apiFetch<{ url: string }>("/api/admin/connect", { method: "POST" });
      if (res.url) {
        window.location.assign(res.url);
      } else {
        setConnectError("Could not start bank onboarding.");
        setLinking(false);
      }
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Could not start bank onboarding.");
      setLinking(false);
    }
  }, []);

  const totals = data?.totals ?? null;
  const lineItems = data?.lineItems ?? [];
  const ratePct = data ? Math.round(data.rate * 100) : 0;
  const withholdingPct = data ? Math.round(data.withholdingRate * 100) : 0;
  const payoutsEnabled = connect?.payoutsEnabled ?? false;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-sm text-muted-foreground">
          Your commission on completed appointments. You keep {ratePct}% of each service.
        </p>
      </div>

      {/* BANK / PAYOUTS */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-brand-600" />
          <div>
            <h2 className="text-sm font-semibold leading-tight">Payout account</h2>
            <p className="text-xs text-muted-foreground">
              Link a bank account with Stripe to receive your payouts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connectError && <span className="text-xs text-red-600">{connectError}</span>}
          {payoutsEnabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Bank linked
            </span>
          ) : (
            <Button className="bg-brand-500 hover:bg-brand-600" onClick={linkBank} disabled={linking}>
              {linking ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="mr-1 h-4 w-4" />
              )}
              Link bank account
            </Button>
          )}
        </div>
      </div>

      {/* DATE RANGE + CSV */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">From</span>
            <input
              type="date"
              className={dateInputClass}
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Statement start date"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">To</span>
            <input
              type="date"
              className={dateInputClass}
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Statement end date"
            />
          </label>
        </div>
        <Button
          variant="outline"
          onClick={downloadCsv}
          disabled={loading || (totals?.count ?? 0) === 0}
        >
          <Download className="mr-1 h-4 w-4" />
          Download statement (CSV)
        </Button>
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
          No earnings to show yet.
        </p>
      ) : (
        <div className="space-y-8">
          {/* PERIOD TOTALS: net payout for the current week & month (salon tz). */}
          <div className="grid grid-cols-2 gap-3">
            <Stat
              icon={<CalendarDays className="h-4 w-4" />}
              label="This week (net)"
              value={weekNet == null ? "—" : formatCents(weekNet)}
              hint="Sun–Sat, salon time"
              accent
            />
            <Stat
              icon={<CalendarRange className="h-4 w-4" />}
              label="This month (net)"
              value={monthNet == null ? "—" : formatCents(monthNet)}
              hint="Calendar month, salon time"
              accent
            />
          </div>

          {/* TOTALS: gross -> commission -> withholding -> net */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              icon={<Receipt className="h-4 w-4" />}
              label="Gross services"
              value={formatCents(totals.gross_cents)}
              hint={`${totals.count} completed`}
            />
            <Stat
              icon={<Percent className="h-4 w-4" />}
              label={`Commission (${ratePct}%)`}
              value={formatCents(totals.commission_cents)}
            />
            <Stat
              icon={<Wallet className="h-4 w-4" />}
              label={data?.isW2 ? `Withholding (${withholdingPct}%)` : "Withholding"}
              value={data?.isW2 ? `−${formatCents(totals.withholding_cents)}` : "—"}
              hint={data?.isW2 ? "W-2 tax" : "1099 (none)"}
            />
            <Stat
              icon={<Banknote className="h-4 w-4" />}
              label="Net payout"
              value={formatCents(totals.net_cents)}
              accent
            />
          </div>

          {/* LINE ITEMS */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Scissors className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold">Completed services</h2>
            </div>
            {lineItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
                No completed appointments in this range.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Service</th>
                      <th className="px-4 py-2 text-right font-medium">Gross</th>
                      <th className="px-4 py-2 text-right font-medium">Calculation</th>
                      <th className="px-4 py-2 text-right font-medium">Commission</th>
                      <th className="px-4 py-2 text-right font-medium">Withholding</th>
                      <th className="px-4 py-2 text-right font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li) => (
                      <tr key={li.appointmentId} className="border-b border-border last:border-0">
                        <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                          {formatDate(li.date)}
                        </td>
                        <td className="px-4 py-2">{li.service}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCents(li.gross_cents)}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {formatCents(li.gross_cents)} × {ratePct}%
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCents(li.commission_cents)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {li.withholding_cents ? `−${formatCents(li.withholding_cents)}` : "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">
                          {formatCents(li.net_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-brand-50 font-semibold">
                      <td className="px-4 py-2" colSpan={2}>
                        Total ({totals.count})
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCents(totals.gross_cents)}</td>
                      <td className="px-4 py-2" aria-hidden="true" />
                      <td className="px-4 py-2 text-right tabular-nums">{formatCents(totals.commission_cents)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {totals.withholding_cents ? `−${formatCents(totals.withholding_cents)}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-brand-600">
                        {formatCents(totals.net_cents)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

function Stat({ icon, label, value, hint, accent }: StatProps) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-brand-200 bg-brand-50" : "border-border"}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={`mt-1 text-xl font-bold leading-tight tabular-nums ${accent ? "text-brand-600" : ""}`}
      >
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
