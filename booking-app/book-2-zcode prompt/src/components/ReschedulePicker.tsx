"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimeLabel } from "@/lib/time";

/** Reusable date + open-slot picker for rescheduling (client account + guest link). */
export function ReschedulePicker({
  serviceId,
  minutes,
  onConfirm,
  submitting,
}: {
  serviceId: string;
  minutes: number;
  onConfirm: (date: string, startTime: string) => void;
  submitting?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  const [reason, setReason] = useState<string | undefined>();

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setStart(null);
    const p = new URLSearchParams({ date, serviceId, minutes: String(minutes) });
    fetch(`/api/availability?${p}`)
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots ?? []);
        setReason(d.reason);
      })
      .finally(() => setLoading(false));
  }, [date, serviceId, minutes]);

  return (
    <div className="space-y-3">
      <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-border p-2.5 text-sm" />
      {date &&
        (loading ? (
          <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finding open times…</div>
        ) : slots.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((t) => (
              <button key={t} onClick={() => setStart(t)} className={`rounded-lg border py-2 text-sm ${start === t ? "border-brand-500 bg-brand-500 text-white" : "border-border hover:border-brand-300"}`}>
                {formatTimeLabel(t)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{reason || "No open times"} — try another day.</p>
        ))}
      <Button className="w-full bg-brand-500 hover:bg-brand-600" disabled={!start || submitting} onClick={() => start && onConfirm(date, start)}>
        {submitting ? "Saving…" : "Confirm new time"}
      </Button>
    </div>
  );
}
