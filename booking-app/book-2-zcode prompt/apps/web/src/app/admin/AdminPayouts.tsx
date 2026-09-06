"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet, Send, CheckCircle2, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import { formatDateLabel } from "@/lib/time";

interface PayoutHistoryRow {
  id: string;
  period_start: string;
  period_end: string;
  appointment_count: number;
  gross_cents: number;
  commission_cents: number;
  withholding_cents: number;
  net_cents: number;
  commission_rate: number;
  status: string;
  method: string | null;
  stripe_transfer_id: string | null;
  paid_at: string | null;
  created_at: string | null;
}

interface PayoutStylist {
  stylist: {
    id: string;
    name: string;
    commission_rate: number;
    is_w2: boolean;
    payouts_enabled: boolean;
  };
  pending: {
    from: string;
    to: string;
    count: number;
    gross_cents: number;
    commission_cents: number;
    withholding_cents: number;
    net_cents: number;
  };
  history: PayoutHistoryRow[];
}

export function AdminPayouts() {
  const [rows, setRows] = useState<PayoutStylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/payouts");
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to load payouts.");
      setLoading(false);
      return;
    }
    setRows(await res.json());
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pay(row: PayoutStylist, method: "stripe" | "manual") {
    const label = method === "stripe" ? "send this Stripe payout" : "mark this payout as paid";
    if (!confirm(`Are you sure you want to ${label} of ${formatCents(row.pending.net_cents)} to ${row.stylist.name}?`)) return;
    setBusy(row.stylist.id + method);
    setError(null);
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stylistId: row.stylist.id,
        from: row.pending.from,
        to: row.pending.to,
        method,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Payout failed.");
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-brand-500" />
        <h2 className="text-lg font-bold">Payouts</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Pay each stylist their commission on completed appointments. Send via Stripe when they&apos;ve linked a bank
        account, or mark a payout as paid manually (cash, Venmo, etc.).
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No stylists yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const s = row.stylist;
            const hasPending = row.pending.net_cents > 0;
            const isOpen = open === s.id;
            return (
              <div key={s.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {Math.round(s.commission_rate * 100)}% commission
                      </span>
                      {s.payouts_enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <Banknote className="h-3 w-3" /> Bank linked
                        </span>
                      ) : (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                          No bank linked
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Pending: {row.pending.count} completed appt{row.pending.count === 1 ? "" : "s"} ·{" "}
                      {formatDateLabel(row.pending.from)} – {formatDateLabel(row.pending.to)}
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="text-muted-foreground">Gross {formatCents(row.pending.gross_cents)}</span>
                      {" · "}
                      <span className="text-muted-foreground">Commission {formatCents(row.pending.commission_cents)}</span>
                      {row.pending.withholding_cents > 0 && (
                        <>
                          {" · "}
                          <span className="text-muted-foreground">
                            Withholding −{formatCents(row.pending.withholding_cents)}
                          </span>
                        </>
                      )}
                      {" · "}
                      <span className="font-semibold text-foreground">Net {formatCents(row.pending.net_cents)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-brand-500 hover:bg-brand-600"
                        disabled={!hasPending || !s.payouts_enabled || busy === s.id + "stripe"}
                        onClick={() => pay(row, "stripe")}
                        title={!s.payouts_enabled ? "Stylist must link a bank account first" : undefined}
                      >
                        {busy === s.id + "stripe" ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-1 h-4 w-4" />
                        )}
                        Send payout
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!hasPending || busy === s.id + "manual"}
                        onClick={() => pay(row, "manual")}
                      >
                        {busy === s.id + "manual" ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                        )}
                        Mark paid
                      </Button>
                    </div>
                    {row.history.length > 0 && (
                      <button
                        className="text-xs text-brand-600 hover:underline"
                        onClick={() => setOpen(isOpen ? null : s.id)}
                      >
                        {isOpen ? "Hide" : "Show"} history ({row.history.length})
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && row.history.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    {row.history.map((h) => (
                      <div
                        key={h.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">
                            {formatDateLabel(h.period_start)} – {formatDateLabel(h.period_end)}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {h.appointment_count} appt{h.appointment_count === 1 ? "" : "s"} · {h.method ?? "—"}
                            {h.paid_at ? ` · ${new Date(h.paid_at).toLocaleDateString()}` : ""}
                          </span>
                          {h.stripe_transfer_id && (
                            <span className="ml-1 font-mono text-xs text-muted-foreground">{h.stripe_transfer_id}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatCents(h.net_cents)}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              h.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : h.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-brand-100 text-brand-700"
                            }`}
                          >
                            {h.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
