"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateLabel } from "@/lib/time";

interface WaitlistEntry {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  desired_date: string | null;
  flexibility: "exact" | "plus_minus_1" | "plus_minus_3" | "any";
  status: "waiting" | "notified" | "booked" | "expired" | "cancelled";
  notified_at: string | null;
  created_at: string;
  service: { name: string } | null;
}

const FLEX_LABEL: Record<WaitlistEntry["flexibility"], string> = {
  exact: "Exact date",
  plus_minus_1: "±1 day",
  plus_minus_3: "±3 days",
  any: "Any date",
};
const STATUS_STYLE: Record<string, string> = {
  waiting: "bg-brand-100 text-brand-700",
  notified: "bg-brand-50 text-brand-600",
  booked: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-600",
};
const FILTERS = ["all", "waiting", "notified", "booked", "cancelled"] as const;

export function AdminWaitlist() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/waitlist${filter !== "all" ? `?status=${filter}` : ""}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: WaitlistEntry["status"]) {
    setBusy(id + status);
    const res = await fetch("/api/admin/waitlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusy(null);
    if (!res.ok) alert("Update failed.");
    else load();
  }

  const waitingCount = entries.filter((e) => e.status === "waiting").length;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Clock className="h-5 w-5 text-brand-500" />
        <h2 className="text-lg font-bold">Waitlist</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        When a booked slot is cancelled, matching waiting clients are automatically emailed/texted that a spot opened up.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-sm capitalize ${filter === f ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground"}`}>
            {f}{f === "waiting" && waitingCount > 0 ? ` (${waitingCount})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
      ) : entries.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No waitlist entries{filter !== "all" ? ` (${filter})` : ""} yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{e.client_name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[e.status] ?? ""}`}>{e.status}</span>
                </div>
                <div className="text-sm text-muted-foreground">{e.client_email}{e.client_phone ? ` · ${e.client_phone}` : ""}</div>
                <div className="mt-1 text-sm">
                  <span className="font-medium">{e.service?.name ?? "Any service"}</span>
                  <span className="text-muted-foreground"> · {e.desired_date ? formatDateLabel(e.desired_date) : "Any date"} · {FLEX_LABEL[e.flexibility]}</span>
                </div>
              </div>
              {["waiting", "notified"].includes(e.status) && (
                <div className="flex gap-2">
                  <Button size="sm" className="bg-brand-500 hover:bg-brand-600" disabled={busy === e.id + "booked"} onClick={() => setStatus(e.id, "booked")}>
                    <Check className="mr-1 h-4 w-4" />Mark booked
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === e.id + "cancelled"} onClick={() => setStatus(e.id, "cancelled")}>
                    <X className="mr-1 h-4 w-4" />Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
