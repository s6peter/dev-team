"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarClock,
  CalendarOff,
  Check,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import { formatDateLabel, formatTimeLabel } from "@/lib/time";

/* ------------------------------------------------------------------ */
/* Fetched shapes (same-origin /api/admin/*)                          */
/* ------------------------------------------------------------------ */

interface WeeklyRow {
  day_of_week: number;
  start_time: string; // "HH:MM[:SS]"
  end_time: string; // "HH:MM[:SS]"
  is_active: boolean;
}

interface OverrideRow {
  id: string;
  date: string; // "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  reason: string | null;
}

interface AvailabilityResponse {
  weekly: WeeklyRow[];
  overrides: OverrideRow[];
}

interface ServiceTier {
  id: string;
  service_id: string;
  name: string;
  price_addon: number; // integer cents
  duration_addon: number;
}

interface AdminService {
  id: string;
  name: string;
  category: string;
  base_price: number; // integer cents
  duration_minutes: number;
  tiers: ServiceTier[];
}

interface ServicesResponse {
  services: AdminService[];
}

/* Local editor row for the weekly grid. */
interface DayEditor {
  dayOfWeek: number;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  isActive: boolean;
}

interface ApptForm {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: string;
  tierId: string; // "" = none
  date: string;
  startTime: string;
  status: "confirmed" | "pending";
  depositDollars: string; // DOLLARS, converted to cents on submit
}

type Notice = { kind: "error" | "success"; text: string } | null;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const EMPTY_APPT: ApptForm = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  serviceId: "",
  tierId: "",
  date: "",
  startTime: "",
  status: "confirmed",
  depositDollars: "0",
};

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/** "HH:MM:SS" | "HH:MM" -> "HH:MM" (safe for empty/null). */
function toHhMm(time: string | null | undefined): string {
  return (time ?? "").slice(0, 5);
}

/** Pull {error} out of a non-ok response for display. */
async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error.length > 0) return data.error;
  } catch {
    /* body was not JSON */
  }
  return `Request failed (${res.status})`;
}

/* ------------------------------------------------------------------ */

export function AdminSchedule() {
  const [days, setDays] = useState<DayEditor[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      startTime: "09:00",
      endTime: "17:00",
      isActive: false,
    }))
  );
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [hoursMsg, setHoursMsg] = useState<Notice>(null);
  const [savingHours, setSavingHours] = useState(false);

  const [blockMsg, setBlockMsg] = useState<Notice>(null);
  const [addingBlock, setAddingBlock] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [block, setBlock] = useState<{ date: string; startTime: string; endTime: string; reason: string }>({
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  const [apptMsg, setApptMsg] = useState<Notice>(null);
  const [creatingAppt, setCreatingAppt] = useState(false);
  const [appt, setAppt] = useState<ApptForm>(EMPTY_APPT);

  const loadAvailability = useCallback(async () => {
    const res = await fetch("/api/admin/availability");
    if (!res.ok) throw new Error(await readError(res));
    const data = (await res.json()) as AvailabilityResponse;
    const weekly = data.weekly ?? [];
    setDays(
      Array.from({ length: 7 }, (_, i) => {
        const row = weekly.find((w) => w.day_of_week === i);
        return row
          ? {
              dayOfWeek: i,
              startTime: toHhMm(row.start_time) || "09:00",
              endTime: toHhMm(row.end_time) || "17:00",
              isActive: row.is_active,
            }
          : { dayOfWeek: i, startTime: "09:00", endTime: "17:00", isActive: false };
      })
    );
    setOverrides(data.overrides ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const servicesRes = await fetch("/api/admin/services");
      if (!servicesRes.ok) throw new Error(await readError(servicesRes));
      const servicesData = (await servicesRes.json()) as ServicesResponse;
      setServices(servicesData.services ?? []);
      await loadAvailability();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load schedule.");
    } finally {
      setLoading(false);
    }
  }, [loadAvailability]);

  useEffect(() => {
    load();
  }, [load]);

  /* ------------------------------- weekly hours ------------------------------- */

  function updateDay(index: number, patch: Partial<DayEditor>): void {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
    setHoursMsg(null);
  }

  async function saveHours(): Promise<void> {
    for (const d of days) {
      if (!d.startTime || !d.endTime) {
        setHoursMsg({ kind: "error", text: `${DAY_NAMES[d.dayOfWeek]}: set both a start and end time.` });
        return;
      }
      if (d.endTime <= d.startTime) {
        setHoursMsg({ kind: "error", text: `${DAY_NAMES[d.dayOfWeek]}: end time must be after start time.` });
        return;
      }
    }
    setSavingHours(true);
    setHoursMsg(null);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: days.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            startTime: d.startTime,
            endTime: d.endTime,
            isActive: d.isActive,
          })),
        }),
      });
      if (!res.ok) {
        setHoursMsg({ kind: "error", text: await readError(res) });
        return;
      }
      setHoursMsg({ kind: "success", text: "Weekly hours saved." });
    } finally {
      setSavingHours(false);
    }
  }

  /* ------------------------------- time off ------------------------------- */

  async function addBlock(): Promise<void> {
    if (!block.date) {
      setBlockMsg({ kind: "error", text: "Pick a date to block." });
      return;
    }
    const hasWindow = block.startTime !== "" && block.endTime !== "";
    if (block.startTime !== "" && block.endTime === "") {
      setBlockMsg({ kind: "error", text: "Enter an end time (or clear both for a whole day)." });
      return;
    }
    if (block.endTime !== "" && block.startTime === "") {
      setBlockMsg({ kind: "error", text: "Enter a start time (or clear both for a whole day)." });
      return;
    }
    if (hasWindow && block.endTime <= block.startTime) {
      setBlockMsg({ kind: "error", text: "End time must be after start time." });
      return;
    }

    setAddingBlock(true);
    setBlockMsg(null);
    try {
      const body: {
        date: string;
        isAvailable: false;
        reason?: string;
        startTime?: string;
        endTime?: string;
      } = { date: block.date, isAvailable: false };
      if (block.reason.trim()) body.reason = block.reason.trim();
      if (hasWindow) {
        body.startTime = block.startTime;
        body.endTime = block.endTime;
      }
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setBlockMsg({ kind: "error", text: await readError(res) });
        return;
      }
      setBlock({ date: "", startTime: "", endTime: "", reason: "" });
      setBlockMsg({ kind: "success", text: "Time blocked off." });
      await loadAvailability();
    } catch (err) {
      setBlockMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not block time." });
    } finally {
      setAddingBlock(false);
    }
  }

  async function unblock(id: string): Promise<void> {
    setUnblockingId(id);
    setBlockMsg(null);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        setBlockMsg({ kind: "error", text: await readError(res) });
        return;
      }
      await loadAvailability();
    } catch (err) {
      setBlockMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not unblock." });
    } finally {
      setUnblockingId(null);
    }
  }

  /* ------------------------------- create appt ------------------------------- */

  const selectedService = useMemo(
    () => services.find((s) => s.id === appt.serviceId) ?? null,
    [services, appt.serviceId]
  );
  const tiers = selectedService?.tiers ?? [];

  function updateAppt(patch: Partial<ApptForm>): void {
    setAppt((prev) => ({ ...prev, ...patch }));
    setApptMsg(null);
  }

  async function createAppt(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!appt.clientName.trim() || !appt.clientEmail.trim()) {
      setApptMsg({ kind: "error", text: "Client name and email are required." });
      return;
    }
    if (!appt.serviceId) {
      setApptMsg({ kind: "error", text: "Choose a service." });
      return;
    }
    if (!appt.date || !appt.startTime) {
      setApptMsg({ kind: "error", text: "Pick a date and a start time." });
      return;
    }

    const dollars = Number(appt.depositDollars);
    const depositPaidCents = Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;

    setCreatingAppt(true);
    setApptMsg(null);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: appt.clientName.trim(),
          clientEmail: appt.clientEmail.trim(),
          clientPhone: appt.clientPhone.trim(),
          serviceId: appt.serviceId,
          tierId: appt.tierId || null,
          date: appt.date,
          startTime: appt.startTime,
          status: appt.status,
          depositPaidCents,
        }),
      });
      if (!res.ok) {
        // 409 = overlaps an existing appointment; API returns a friendly {error}.
        setApptMsg({ kind: "error", text: await readError(res) });
        return;
      }
      setAppt(EMPTY_APPT);
      setApptMsg({ kind: "success", text: "Appointment created." });
    } catch (err) {
      setApptMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not create appointment." });
    } finally {
      setCreatingAppt(false);
    }
  }

  /* ------------------------------- render ------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading schedule…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="mb-3">{loadError}</p>
        <Button size="sm" variant="outline" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* (1) WEEKLY HOURS -------------------------------------------------- */}
      <section className="rounded-xl border border-border p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold">Weekly hours</h2>
        </div>

        <div className="space-y-2">
          {days.map((d, i) => (
            <div
              key={d.dayOfWeek}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <label className="flex min-w-[9rem] items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={d.isActive}
                  onChange={(e) => updateDay(i, { isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-brand-500"
                />
                {DAY_NAMES[d.dayOfWeek]}
              </label>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={d.startTime}
                  disabled={!d.isActive}
                  onChange={(e) => updateDay(i, { startTime: e.target.value })}
                  className={INPUT_CLASS + " max-w-[9rem]"}
                  aria-label={`${DAY_NAMES[d.dayOfWeek]} start time`}
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="time"
                  value={d.endTime}
                  disabled={!d.isActive}
                  onChange={(e) => updateDay(i, { endTime: e.target.value })}
                  className={INPUT_CLASS + " max-w-[9rem]"}
                  aria-label={`${DAY_NAMES[d.dayOfWeek]} end time`}
                />
                {!d.isActive && <span className="text-xs text-muted-foreground">Closed</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={saveHours}
            disabled={savingHours}
            className="bg-brand-500 hover:bg-brand-600"
          >
            {savingHours ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Save hours
          </Button>
          {hoursMsg && (
            <span className={`text-sm ${hoursMsg.kind === "error" ? "text-red-600" : "text-green-600"}`}>
              {hoursMsg.text}
            </span>
          )}
        </div>
      </section>

      {/* (2) TIME OFF / BLOCKED ------------------------------------------- */}
      <section className="rounded-xl border border-border p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <CalendarOff className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold">Time off & blocked dates</h2>
        </div>

        {overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming time off.</p>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => {
              const whole = !o.start_time || !o.end_time;
              return (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 text-sm">
                    <div className="font-medium">{formatDateLabel(o.date)}</div>
                    <div className="text-muted-foreground">
                      {whole
                        ? "All day"
                        : `${formatTimeLabel(o.start_time as string)} – ${formatTimeLabel(o.end_time as string)}`}
                      {o.reason ? ` · ${o.reason}` : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={unblockingId === o.id}
                    onClick={() => unblock(o.id)}
                  >
                    {unblockingId === o.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Unblock
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-dashed border-border p-3">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <Ban className="h-4 w-4 text-muted-foreground" />
            Block time off
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Date</label>
              <input
                type="date"
                value={block.date}
                onChange={(e) => {
                  setBlock((b) => ({ ...b, date: e.target.value }));
                  setBlockMsg(null);
                }}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Reason <span className="text-muted-foreground/70">(optional)</span>
              </label>
              <input
                type="text"
                value={block.reason}
                maxLength={200}
                placeholder="Vacation, holiday…"
                onChange={(e) => {
                  setBlock((b) => ({ ...b, reason: e.target.value }));
                  setBlockMsg(null);
                }}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Start <span className="text-muted-foreground/70">(optional)</span>
              </label>
              <input
                type="time"
                value={block.startTime}
                onChange={(e) => {
                  setBlock((b) => ({ ...b, startTime: e.target.value }));
                  setBlockMsg(null);
                }}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                End <span className="text-muted-foreground/70">(optional)</span>
              </label>
              <input
                type="time"
                value={block.endTime}
                onChange={(e) => {
                  setBlock((b) => ({ ...b, endTime: e.target.value }));
                  setBlockMsg(null);
                }}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Leave start &amp; end empty to block the whole day.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={addBlock}
              disabled={addingBlock}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {addingBlock ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add block
            </Button>
            {blockMsg && (
              <span className={`text-sm ${blockMsg.kind === "error" ? "text-red-600" : "text-green-600"}`}>
                {blockMsg.text}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* (3) CREATE APPOINTMENT ------------------------------------------- */}
      <section className="rounded-xl border border-border p-4 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold">Create appointment</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">For walk-ins and phone bookings.</p>

        <form onSubmit={createAppt} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Client name</label>
            <input
              type="text"
              value={appt.clientName}
              onChange={(e) => updateAppt({ clientName: e.target.value })}
              className={INPUT_CLASS}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <input
              type="email"
              value={appt.clientEmail}
              onChange={(e) => updateAppt({ clientEmail: e.target.value })}
              className={INPUT_CLASS}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Phone <span className="text-muted-foreground/70">(optional)</span>
            </label>
            <input
              type="tel"
              value={appt.clientPhone}
              onChange={(e) => updateAppt({ clientPhone: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Service</label>
            <select
              value={appt.serviceId}
              onChange={(e) => updateAppt({ serviceId: e.target.value, tierId: "" })}
              className={INPUT_CLASS}
              required
            >
              <option value="">Select a service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatCents(s.base_price)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Tier <span className="text-muted-foreground/70">(optional)</span>
            </label>
            <select
              value={appt.tierId}
              onChange={(e) => updateAppt({ tierId: e.target.value })}
              className={INPUT_CLASS}
              disabled={!selectedService || tiers.length === 0}
            >
              <option value="">No tier</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · +{formatCents(t.price_addon)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Status</label>
            <select
              value={appt.status}
              onChange={(e) => updateAppt({ status: e.target.value === "pending" ? "pending" : "confirmed" })}
              className={INPUT_CLASS}
            >
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Date</label>
            <input
              type="date"
              value={appt.date}
              onChange={(e) => updateAppt({ date: e.target.value })}
              className={INPUT_CLASS}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Start time</label>
            <input
              type="time"
              value={appt.startTime}
              onChange={(e) => updateAppt({ startTime: e.target.value })}
              className={INPUT_CLASS}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Deposit collected ($)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={appt.depositDollars}
              onChange={(e) => updateAppt({ depositDollars: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={creatingAppt} className="bg-brand-500 hover:bg-brand-600">
              {creatingAppt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Create appointment
            </Button>
            {apptMsg && (
              <span className={`text-sm ${apptMsg.kind === "error" ? "text-red-600" : "text-green-600"}`}>
                {apptMsg.text}
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
