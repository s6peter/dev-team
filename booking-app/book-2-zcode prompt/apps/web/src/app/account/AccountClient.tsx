"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, LogOut, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatCents } from "@/lib/pricing";
import { formatDateLabel, formatTimeLabel } from "@/lib/time";
import { ReschedulePicker } from "@/components/ReschedulePicker";

export interface AccountAppointment {
  id: string;
  date: string;
  start_time: string;
  status: string;
  serviceName: string;
  serviceId: string;
  minutes: number;
  depositCents: number;
  balanceCents: number;
  manageToken: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-brand-100 text-brand-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-brand-50 text-brand-600",
  declined: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  no_show: "bg-red-100 text-red-700",
};

export function AccountClient({ email, appointments }: { email: string; appointments: AccountAppointment[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(params.get("review") === "1");
  const [rescheduling, setRescheduling] = useState<AccountAppointment | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter((a) => a.date >= today && ["pending", "confirmed"].includes(a.status));
  const past = appointments.filter((a) => !upcoming.includes(a));

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this appointment? Your deposit may be refunded depending on timing.")) return;
    setBusy(id);
    const res = await fetch("/api/account/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) alert(data.error || "Could not cancel.");
    else {
      alert(data.refunded ? "Cancelled — your deposit was refunded." : "Cancelled. (Deposit forfeit per policy.)");
      router.refresh();
    }
  }

  async function reschedule(date: string, startTime: string) {
    if (!rescheduling) return;
    setBusy(rescheduling.id);
    const res = await fetch("/api/account/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: rescheduling.id, date, startTime }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) alert(data.error || "Could not reschedule.");
    else {
      setRescheduling(null);
      alert(`Rescheduled to ${formatDateLabel(date)} at ${formatTimeLabel(startTime)}.`);
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Appointments</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}><Star className="mr-1 h-4 w-4" />Leave a review</Button>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <CalendarDays className="mx-auto mb-2 h-6 w-6" />
            No upcoming appointments. <Link href="/book" className="text-brand-600 underline">Book one →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.serviceName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[a.status] ?? ""}`}>{a.status.replace("_", " ")}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{formatDateLabel(a.date)} · {formatTimeLabel(a.start_time)}</div>
                  {a.balanceCents > 0 && <div className="text-sm text-muted-foreground">Balance due in person: {formatCents(a.balanceCents)}</div>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setRescheduling(a)}>Reschedule</Button>
                  <Button variant="outline" size="sm" disabled={busy === a.id} onClick={() => cancel(a.id)}>Cancel</Button>
                  <a href={`/api/ics/${a.manageToken}`}><Button variant="outline" size="sm">Add to calendar</Button></a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past appointments yet.</p>
        ) : (
          <div className="space-y-2">
            {past.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                <span>{a.serviceName}</span>
                <span className="text-muted-foreground">{formatDateLabel(a.date)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[a.status] ?? ""}`}>{a.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {rescheduling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRescheduling(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Reschedule {rescheduling.serviceName}</h3>
              <button onClick={() => setRescheduling(null)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <ReschedulePicker serviceId={rescheduling.serviceId} minutes={rescheduling.minutes} onConfirm={reschedule} submitting={busy === rescheduling.id} />
            <p className="mt-2 text-xs text-muted-foreground">You may reschedule once, at least 24 hours ahead.</p>
          </div>
        </div>
      )}

      {reviewOpen && <ReviewModal onClose={() => setReviewOpen(false)} />}
    </div>
  );
}

function ReviewModal({ onClose }: { onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else alert((await res.json()).error || "Could not submit review.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center">
            <p className="mb-3 text-lg font-semibold">Thank you! 💕</p>
            <p className="mb-4 text-sm text-muted-foreground">Your review will appear once approved.</p>
            <Button className="bg-brand-500 hover:bg-brand-600" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <h3 className="mb-4 text-lg font-semibold">Leave a review</h3>
            <div className="mb-4 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                  <Star className={`h-8 w-8 ${n <= rating ? "fill-brand-500 text-brand-500" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="How was your experience?" className="mb-4 w-full rounded-lg border border-border p-2.5 text-sm" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button className="bg-brand-500 hover:bg-brand-600" disabled={busy} onClick={submit}>Submit</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
