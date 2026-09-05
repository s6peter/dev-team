"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, DollarSign, Loader2, LogOut, Star, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatCents } from "@/lib/pricing";
import { formatDateLabel, formatTimeLabel } from "@/lib/time";
import { AdminServices } from "./AdminServices";
import { AdminSchedule } from "./AdminSchedule";
import { AdminCalendar } from "./AdminCalendar";
import { AdminClients } from "./AdminClients";
import { AdminAnalytics } from "./AdminAnalytics";
import { AdminSettings } from "./AdminSettings";
import { AdminPortfolio } from "./AdminPortfolio";
import { AdminWaitlist } from "./AdminWaitlist";
import { AdminMessages } from "./AdminMessages";
import { AdminStaff } from "./AdminStaff";

interface Appt {
  id: string;
  date: string;
  start_time: string;
  status: string;
  service_total_cents: number;
  deposit_cents: number;
  balance_due_cents: number;
  notes: string | null;
  inspiration_photos: string[];
  service: { name: string; category: string } | null;
  tier: { name: string } | null;
  client: { name: string; email: string; phone: string | null; tags: string[]; allergies: string | null; notes: string | null; lifetime_spend: number } | null;
}

interface Review {
  id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  stylist_response: string | null;
  is_published: boolean;
  created_at: string;
}

const FILTERS = ["pending", "confirmed", "completed", "cancelled", "declined", "no_show"] as const;
const ACTIONS: Record<string, { action: string; label: string }[]> = {
  pending: [{ action: "confirm", label: "Confirm" }, { action: "decline", label: "Decline (refund)" }],
  confirmed: [{ action: "complete", label: "Complete" }, { action: "no_show", label: "No-show" }, { action: "cancel", label: "Cancel (refund)" }],
  completed: [{ action: "revert", label: "Revert" }],
  no_show: [{ action: "revert", label: "Revert" }],
  cancelled: [{ action: "revert", label: "Revert" }],
  declined: [{ action: "revert", label: "Revert" }],
};

type AdminTab = "calendar" | "appointments" | "clients" | "waitlist" | "analytics" | "services" | "portfolio" | "schedule" | "messages" | "staff" | "settings" | "reviews";

export function AdminDashboard({ stylistName, isOwner }: { stylistName: string; isOwner: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("calendar");
  const [filter, setFilter] = useState<string>("pending");
  const [appts, setAppts] = useState<Appt[]>([]);
  const [allAppts, setAllAppts] = useState<Appt[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [filtered, all] = await Promise.all([
      fetch(`/api/admin/appointments?status=${filter}`).then((r) => r.json()),
      fetch(`/api/admin/appointments`).then((r) => r.json()),
    ]);
    setAppts(filtered.appointments ?? []);
    setAllAppts(all.appointments ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (tab === "reviews") fetch("/api/admin/reviews").then((r) => r.json()).then((d) => setReviews(d.reviews ?? []));
  }, [tab]);

  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    pending: allAppts.filter((a) => a.status === "pending").length,
    confirmed: allAppts.filter((a) => a.status === "confirmed").length,
    today: allAppts.filter((a) => a.date === today && ["pending", "confirmed", "completed"].includes(a.status)).length,
    deposits: allAppts.filter((a) => ["pending", "confirmed", "completed"].includes(a.status)).reduce((n, a) => n + a.deposit_cents, 0),
  };

  async function act(id: string, action: string) {
    setBusy(id + action);
    const res = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id, action }),
    });
    setBusy(null);
    if (!res.ok) alert("Action failed.");
    else load();
  }

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {stylistName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<CalendarClock className="h-4 w-4" />} label="Pending" value={String(stats.pending)} accent />
        <Stat icon={<Check className="h-4 w-4" />} label="Confirmed" value={String(stats.confirmed)} />
        <Stat icon={<Users className="h-4 w-4" />} label="Today" value={String(stats.today)} />
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Deposits collected" value={formatCents(stats.deposits)} />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-border">
        {(["calendar", "appointments", "clients", "waitlist", "analytics", "services", "portfolio", "schedule", "messages", ...(isOwner ? (["staff"] as const) : []), "settings", "reviews"] as AdminTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium capitalize ${tab === t ? "border-brand-500 text-brand-600" : "border-transparent text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {tab === "appointments" && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-sm capitalize ${filter === f ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground"}`}>
                {f.replace("_", " ")}{f === "pending" && stats.pending > 0 ? ` (${stats.pending})` : ""}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
          ) : appts.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No {filter.replace("_", " ")} appointments.</p>
          ) : (
            <div className="space-y-3">
              {appts.map((a) => (
                <div key={a.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{a.service?.name}{a.tier ? ` · ${a.tier.name}` : ""}</div>
                      <div className="text-sm text-muted-foreground">{formatDateLabel(a.date)} · {formatTimeLabel(a.start_time)}</div>
                      <div className="mt-1 text-sm">
                        <span className="font-medium">{a.client?.name}</span>
                        <span className="text-muted-foreground"> · {a.client?.email}{a.client?.phone ? ` · ${a.client.phone}` : ""}</span>
                      </div>
                      {a.client?.allergies && <div className="mt-1 text-sm text-red-600">⚠ {a.client.allergies}</div>}
                      {a.notes && <div className="mt-1 text-sm text-muted-foreground">Note: {a.notes}</div>}
                      {a.inspiration_photos?.length > 0 && (
                        <div className="mt-2 flex gap-1">
                          {a.inspiration_photos.map((u) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={u} src={u} alt="" className="h-12 w-12 rounded object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">{formatCents(a.service_total_cents)}</div>
                      <div className="text-muted-foreground">deposit {formatCents(a.deposit_cents)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(ACTIONS[a.status] ?? []).map((b) => (
                      <Button key={b.action} size="sm" variant={b.action === "confirm" || b.action === "complete" ? "default" : "outline"}
                        className={b.action === "confirm" || b.action === "complete" ? "bg-brand-500 hover:bg-brand-600" : ""}
                        disabled={busy === a.id + b.action} onClick={() => act(a.id, b.action)}>
                        {busy === a.id + b.action ? <Loader2 className="h-4 w-4 animate-spin" /> : b.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "calendar" && <AdminCalendar />}
      {tab === "clients" && <AdminClients />}
      {tab === "waitlist" && <AdminWaitlist />}
      {tab === "portfolio" && <AdminPortfolio />}
      {tab === "messages" && <AdminMessages />}
      {tab === "staff" && <AdminStaff />}
      {tab === "analytics" && <AdminAnalytics />}
      {tab === "settings" && <AdminSettings />}
      {tab === "schedule" && <AdminSchedule />}
      {tab === "services" && <AdminServices />}

      {tab === "reviews" && <ReviewsPanel reviews={reviews} onChange={() => fetch("/api/admin/reviews").then((r) => r.json()).then((d) => setReviews(d.reviews ?? []))} />}
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-brand-200 bg-brand-50" : "border-border"}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ReviewsPanel({ reviews, onChange }: { reviews: Review[]; onChange: () => void }) {
  async function patch(reviewId: string, body: Record<string, unknown>) {
    await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, ...body }) });
    onChange();
  }
  if (reviews.length === 0) return <p className="py-16 text-center text-muted-foreground">No reviews yet.</p>;
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{r.author_name || "Client"}</span>
              <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}</span>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs ${r.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{r.is_published ? "Published" : "Pending"}</span>
          </div>
          {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => patch(r.id, { isPublished: !r.is_published })}>
              {r.is_published ? <><X className="mr-1 h-4 w-4" />Unpublish</> : <><Check className="mr-1 h-4 w-4" />Publish</>}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
