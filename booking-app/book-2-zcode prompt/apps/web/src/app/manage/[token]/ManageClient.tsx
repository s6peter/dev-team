"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReschedulePicker } from "@/components/ReschedulePicker";
import { formatCents } from "@/lib/pricing";
import { formatDateLabel, formatTimeLabel } from "@/lib/time";

interface Appt {
  status: string;
  date: string;
  startTime: string;
  serviceName: string;
  serviceId: string;
  minutes: number;
  depositCents: number;
  balanceCents: number;
}

export function ManageClient({ token, appointment }: { token: string; appointment: Appt }) {
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const active = ["pending", "confirmed"].includes(appointment.status);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...body }),
    });
    const data = await res.json();
    setBusy(false);
    return { ok: res.ok, data };
  }

  async function reschedule(date: string, startTime: string) {
    const { ok, data } = await call({ action: "reschedule", date, startTime });
    setResult(ok ? { ok: true, msg: `Rescheduled to ${formatDateLabel(date)} at ${formatTimeLabel(startTime)}.` } : { ok: false, msg: data.error });
    if (ok) setMode("view");
  }
  async function cancel() {
    if (!confirm("Cancel this appointment?")) return;
    const { ok, data } = await call({ action: "cancel" });
    setResult(ok ? { ok: true, msg: data.refunded ? "Cancelled — your deposit was refunded." : "Cancelled. (Deposit forfeit per policy.)" } : { ok: false, msg: data.error });
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Your appointment</h1>
      <p className="mb-6 text-muted-foreground">Manage your booking with QueenG Braids.</p>

      <div className="rounded-xl border border-border p-5">
        <div className="font-semibold">{appointment.serviceName}</div>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          {formatDateLabel(appointment.date)} · {formatTimeLabel(appointment.startTime)}
        </div>
        <div className="mt-2 text-sm">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{appointment.status.replace("_", " ")}</span>
        </div>
        {appointment.balanceCents > 0 && <div className="mt-2 text-sm text-muted-foreground">Balance due in person: {formatCents(appointment.balanceCents)}</div>}
      </div>

      {result && (
        <p className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {result.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {result.msg}
        </p>
      )}

      {active && mode === "view" && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="bg-brand-500 hover:bg-brand-600" onClick={() => setMode("reschedule")}>Reschedule</Button>
          <Button variant="outline" disabled={busy} onClick={cancel}>Cancel appointment</Button>
          <a href={`/api/ics/${token}`}><Button variant="outline">Add to calendar</Button></a>
        </div>
      )}

      {active && mode === "reschedule" && (
        <div className="mt-6 rounded-xl border border-border p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Pick a new time</h2>
            <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode("view")}>Cancel</button>
          </div>
          <ReschedulePicker serviceId={appointment.serviceId} minutes={appointment.minutes} onConfirm={reschedule} submitting={busy} />
          <p className="mt-2 text-xs text-muted-foreground">You may reschedule once, at least 24 hours ahead.</p>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Questions? <Link href="/contact" className="text-brand-600 underline">Contact us</Link>
      </p>
    </div>
  );
}
