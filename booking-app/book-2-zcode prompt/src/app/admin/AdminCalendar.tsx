"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import {
  addDays,
  dayOfWeek,
  formatDateLabel,
  formatTimeLabel,
  minutesToTime,
  nowInSalonTz,
  timeToMinutes,
} from "@/lib/time";

/* ------------------------------------------------------------------ */
/* Fetched shapes (same-origin /api/admin/*)                          */
/* ------------------------------------------------------------------ */

interface ApptService {
  name: string;
  category: string;
  duration_minutes: number;
}

interface ApptTier {
  name: string;
}

interface ApptClient {
  name: string;
  email: string;
  phone: string | null;
}

interface Appointment {
  id: string;
  date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  status: string;
  notes: string | null;
  deposit_cents: number;
  balance_due_cents: number;
  service: ApptService | null;
  tier: ApptTier | null;
  client: ApptClient | null;
}

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

interface FormServiceTier {
  id: string;
  name: string;
  price_addon: number; // integer cents
  duration_addon: number;
}

interface FormService {
  id: string;
  name: string;
  category: string;
  base_price: number; // integer cents
  duration_minutes: number;
  tiers: FormServiceTier[];
}

interface ServicesResponse {
  services: FormService[];
}

interface AppointmentsResponse {
  appointments: Appointment[];
}

type ApptAction = "confirm" | "decline" | "complete" | "no_show" | "cancel" | "revert";

interface NewApptPayload {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: string;
  tierId: string | null;
  date: string;
  startTime: string;
  status: "confirmed" | "pending";
  depositPaidCents: number;
}

/** Fee-charge (no-show / late-cancel) shapes. Money is integer CENTS. */
type FeeKind = "no_show" | "late_cancel";

interface FeeQuote {
  feeCents: number;
  hasCard: boolean;
}

interface FeeChargeResult {
  feeCents: number;
  status: string;
}

/** Where a dragged appointment starts, plus the grab offset for drop math. */
interface DragState {
  apptId: string;
  date: string;
  startTime: string; // "HH:MM"
  durationMin: number;
  grabOffsetY: number;
}

type ViewMode = "day" | "week";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const DAY_START_MIN = 7 * 60; // 07:00
const DAY_END_MIN = 21 * 60; // 21:00
const PX_PER_HOUR = 56;
const PX_PER_MIN = PX_PER_HOUR / 60;
const MIN_BLOCK_PX = 28;
const GRID_HEIGHT = ((DAY_END_MIN - DAY_START_MIN) / 60) * PX_PER_HOUR;
const SNAP_MIN = 15;
const MIN_FEE_CENTS = 50; // Stripe / API floor for a fee charge.

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Hour + half-hour grid lines never change — compute once.
const HOUR_MARKS: number[] = [];
for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 60) HOUR_MARKS.push(m);
const HALF_MARKS: number[] = [];
for (let m = DAY_START_MIN + 30; m < DAY_END_MIN; m += 60) HALF_MARKS.push(m);

// Statuses that can be charged a no-show / late-cancel fee.
const FEE_STATUSES = new Set(["confirmed", "no_show", "cancelled"]);

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface StatusMeta {
  block: string;
  pill: string;
  label: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  pending: { block: "border-l-amber-400 bg-amber-50 text-amber-900", pill: "bg-amber-100 text-amber-700", label: "Pending" },
  confirmed: { block: "border-l-brand-500 bg-brand-50 text-brand-900", pill: "bg-brand-100 text-brand-700", label: "Confirmed" },
  completed: { block: "border-l-blue-400 bg-blue-50 text-blue-900", pill: "bg-blue-100 text-blue-700", label: "Completed" },
  cancelled: { block: "border-l-gray-400 bg-gray-100 text-gray-500", pill: "bg-gray-200 text-gray-600", label: "Cancelled" },
  declined: { block: "border-l-gray-400 bg-gray-100 text-gray-500", pill: "bg-gray-200 text-gray-600", label: "Declined" },
  no_show: { block: "border-l-red-400 bg-red-50 text-red-900", pill: "bg-red-100 text-red-700", label: "No-show" },
};

const FALLBACK_META: StatusMeta = { block: "border-l-gray-400 bg-gray-50 text-gray-700", pill: "bg-gray-100 text-gray-600", label: "—" };

function statusMeta(status: string): StatusMeta {
  const found = STATUS_META[status];
  if (found) return found;
  return { ...FALLBACK_META, label: status.replace(/_/g, " ") };
}

const STATUS_ACTIONS: Record<string, Array<{ action: ApptAction; label: string; primary?: boolean }>> = {
  pending: [
    { action: "confirm", label: "Confirm", primary: true },
    { action: "decline", label: "Decline (refund)" },
  ],
  confirmed: [
    { action: "complete", label: "Complete", primary: true },
    { action: "no_show", label: "No-show" },
    { action: "cancel", label: "Cancel (refund)" },
  ],
  completed: [{ action: "revert", label: "Revert to pending" }],
  no_show: [{ action: "revert", label: "Revert to pending" }],
  cancelled: [{ action: "revert", label: "Revert to pending" }],
  declined: [{ action: "revert", label: "Revert to pending" }],
};

const HATCH_STYLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(120,120,120,0.16) 0, rgba(120,120,120,0.16) 6px, transparent 6px, transparent 12px)",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

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

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function toHhMm(time: string | null | undefined): string {
  return (time ?? "").slice(0, 5);
}

/** Short hour-of-day label, e.g. 780 -> "1 PM". */
function hourLabel(min: number): string {
  const h = Math.floor(min / 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${suffix}`;
}

/** Compact "Aug 3" label for a 'YYYY-MM-DD' string (TZ-safe). */
function shortMonthDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function centsFromDollars(input: string): number {
  const n = Number(input.trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

interface LayoutItem {
  appt: Appointment;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
}

/**
 * Pack a day's appointments into side-by-side columns so overlapping
 * bookings never cover each other (Google/Square-calendar style).
 */
function computeLayout(appts: Appointment[]): LayoutItem[] {
  const sorted = [...appts].sort((a, b) => {
    const sa = timeToMinutes(a.start_time);
    const sb = timeToMinutes(b.start_time);
    if (sa !== sb) return sa - sb;
    return timeToMinutes(b.end_time) - timeToMinutes(a.end_time);
  });

  const result: LayoutItem[] = [];
  let cluster: LayoutItem[] = [];
  let columnsEnd: number[] = []; // last end-minute per column, current cluster
  let clusterMaxEnd = -1;

  const flush = () => {
    const cols = Math.max(columnsEnd.length, 1);
    for (const item of cluster) item.cols = cols;
    result.push(...cluster);
    cluster = [];
    columnsEnd = [];
    clusterMaxEnd = -1;
  };

  for (const appt of sorted) {
    const startMin = timeToMinutes(appt.start_time);
    const endMin = Math.max(timeToMinutes(appt.end_time), startMin + 1);
    if (clusterMaxEnd !== -1 && startMin >= clusterMaxEnd) flush();

    let col = columnsEnd.findIndex((end) => end <= startMin);
    if (col === -1) {
      col = columnsEnd.length;
      columnsEnd.push(endMin);
    } else {
      columnsEnd[col] = endMin;
    }
    cluster.push({ appt, startMin, endMin, col, cols: 1 });
    clusterMaxEnd = Math.max(clusterMaxEnd, endMin);
  }
  flush();
  return result;
}

interface DayAvailability {
  weeklyRow: WeeklyRow | null;
  weekdayActive: boolean;
  closed: boolean;
  closedReason: string;
  openStartMin: number;
  openEndMin: number;
  windowBlocks: OverrideRow[];
}

/** Resolve opening hours + blocked windows for one 'YYYY-MM-DD'. */
function availabilityForDate(date: string, availability: AvailabilityResponse): DayAvailability {
  const weekday = dayOfWeek(date);
  const weeklyRow = availability.weekly.find((w) => w.day_of_week === weekday) ?? null;
  const weekdayActive = weeklyRow?.is_active ?? false;
  const dayOverrides = availability.overrides.filter((o) => o.date === date && !o.is_available);
  const wholeDayBlock = dayOverrides.find((o) => !o.start_time || !o.end_time) ?? null;
  const windowBlocks = dayOverrides.filter((o) => o.start_time && o.end_time);
  const closed = !weekdayActive || Boolean(wholeDayBlock);
  const closedReason = wholeDayBlock?.reason || (!weekdayActive ? `${DAY_NAMES[weekday]} is not a working day` : "Closed");
  const openStartMin = weeklyRow ? timeToMinutes(weeklyRow.start_time) : DAY_START_MIN;
  const openEndMin = weeklyRow ? timeToMinutes(weeklyRow.end_time) : DAY_END_MIN;
  return { weeklyRow, weekdayActive, closed, closedReason, openStartMin, openEndMin, windowBlocks };
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export function AdminCalendar() {
  const [selectedDate, setSelectedDate] = useState<string>(() => nowInSalonTz().dateStr);
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<AvailabilityResponse>({ weekly: [], overrides: [] });
  const [services, setServices] = useState<FormService[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<ApptAction | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  const [newAppt, setNewAppt] = useState<{ date: string; time: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Drag-to-reschedule.
  const dragInfoRef = useRef<DragState | null>(null);
  const justDraggedRef = useRef(false);
  const [dropHint, setDropHint] = useState<{ date: string; startMin: number } | null>(null);
  const [moveBusyId, setMoveBusyId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [now, setNow] = useState(() => nowInSalonTz());

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [appts, avail, svcs] = await Promise.all([
        apiFetch<AppointmentsResponse>("/api/admin/appointments"),
        apiFetch<AvailabilityResponse>("/api/admin/availability"),
        apiFetch<ServicesResponse>("/api/admin/services"),
      ]);
      setAppointments(appts.appointments ?? []);
      setAvailability({ weekly: avail.weekly ?? [], overrides: avail.overrides ?? [] });
      setServices(svcs.services ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load the calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the "now" indicator fresh without a hard reload.
  useEffect(() => {
    const id = setInterval(() => setNow(nowInSalonTz()), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayStr = now.dateStr;

  /* ------------------------------- derived ------------------------------- */

  const selectedAppt = useMemo(
    () => appointments.find((a) => a.id === selectedApptId) ?? null,
    [appointments, selectedApptId]
  );

  const weekStart = useMemo(() => addDays(selectedDate, -dayOfWeek(selectedDate)), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDays[6] ?? weekStart;

  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of appointments) {
      if (a.status === "cancelled" || a.status === "declined" || a.status === "no_show") continue;
      map[a.date] = (map[a.date] ?? 0) + 1;
    }
    return map;
  }, [appointments]);

  // Group appointments by day once so every column can pull its own list.
  const apptsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      (map[a.date] ??= []).push(a);
    }
    return map;
  }, [appointments]);

  const dayAppointments = apptsByDate[selectedDate] ?? [];
  const dayAvail = useMemo(() => availabilityForDate(selectedDate, availability), [selectedDate, availability]);

  /* ------------------------------- navigation ------------------------------- */

  function selectDate(date: string): void {
    setSelectedDate(date);
    setSelectedApptId(null);
    setPanelError(null);
    setNewAppt(null);
  }

  function goToday(): void {
    selectDate(nowInSalonTz().dateStr);
  }

  function stepBy(direction: 1 | -1): void {
    selectDate(addDays(selectedDate, direction * (viewMode === "week" ? 7 : 1)));
  }

  function defaultNewTime(): string {
    const base = dayAvail.weekdayActive
      ? clamp(dayAvail.openStartMin, DAY_START_MIN, DAY_END_MIN - SNAP_MIN)
      : DAY_START_MIN + 120;
    return minutesToTime(base);
  }

  function openNewAppt(time: string): void {
    setFormError(null);
    setNewAppt({ date: selectedDate, time });
  }

  /** Empty-slot click on any column → open the New appointment modal for that day+time. */
  function handleColumnClick(date: string, e: MouseEvent<HTMLDivElement>): void {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const abs = DAY_START_MIN + y / PX_PER_MIN;
    const snapped = clamp(Math.round(abs / SNAP_MIN) * SNAP_MIN, DAY_START_MIN, DAY_END_MIN - SNAP_MIN);
    setFormError(null);
    setNewAppt({ date, time: minutesToTime(snapped) });
  }

  function handleBlockClick(apptId: string): void {
    if (justDraggedRef.current) return; // swallow the click that trails a drag
    setPanelError(null);
    setSelectedApptId(apptId);
  }

  /* ------------------------------- drag-to-reschedule ------------------------------- */

  function onBlockDragStart(appt: Appointment, e: DragEvent<HTMLDivElement>): void {
    const rect = e.currentTarget.getBoundingClientRect();
    const startMin = timeToMinutes(appt.start_time);
    const endMin = Math.max(timeToMinutes(appt.end_time), startMin + SNAP_MIN);
    dragInfoRef.current = {
      apptId: appt.id,
      date: appt.date,
      startTime: toHhMm(appt.start_time),
      durationMin: endMin - startMin,
      grabOffsetY: e.clientY - rect.top,
    };
    justDraggedRef.current = true;
    try {
      e.dataTransfer.setData("text/plain", appt.id);
      e.dataTransfer.effectAllowed = "move";
    } catch {
      /* some browsers restrict dataTransfer during dragstart — safe to ignore */
    }
  }

  function onBlockDragEnd(): void {
    dragInfoRef.current = null;
    setDropHint(null);
    // Let the trailing click (if any) get swallowed, then re-enable clicks.
    window.setTimeout(() => {
      justDraggedRef.current = false;
    }, 50);
  }

  /** Snapped start-minute for the block's TOP if dropped over `date` at this pointer. */
  function dropStartMin(e: DragEvent<HTMLDivElement>): number {
    const info = dragInfoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const topY = e.clientY - rect.top - (info?.grabOffsetY ?? 0);
    const raw = DAY_START_MIN + topY / PX_PER_MIN;
    const snapped = Math.round(raw / SNAP_MIN) * SNAP_MIN;
    const dur = info?.durationMin ?? SNAP_MIN;
    return clamp(snapped, DAY_START_MIN, Math.max(DAY_START_MIN, DAY_END_MIN - dur));
  }

  function onColumnDragOver(date: string, e: DragEvent<HTMLDivElement>): void {
    if (!dragInfoRef.current) return; // ignore drags that didn't start on a block
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const startMin = dropStartMin(e);
    setDropHint((prev) => (prev && prev.date === date && prev.startMin === startMin ? prev : { date, startMin }));
  }

  function onColumnDrop(date: string, e: DragEvent<HTMLDivElement>): void {
    const info = dragInfoRef.current;
    if (!info) return;
    e.preventDefault();
    const startTime = minutesToTime(dropStartMin(e));
    setDropHint(null);
    dragInfoRef.current = null;
    if (date === info.date && startTime === info.startTime) return; // dropped where it already was
    void runReschedule(info.apptId, date, startTime, "drag");
  }

  /* ------------------------------- mutations ------------------------------- */

  async function runAction(action: ApptAction): Promise<void> {
    if (!selectedAppt) return;
    setBusyAction(action);
    setPanelError(null);
    try {
      await apiFetch("/api/admin/appointments", jsonInit("PATCH", { appointmentId: selectedAppt.id, action }));
      await load();
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  /**
   * PUT a reschedule. `source` decides where the error surfaces:
   * the detail panel (form) vs a top-level banner (drag, no panel needed).
   */
  async function runReschedule(
    appointmentId: string,
    date: string,
    startTime: string,
    source: "panel" | "drag"
  ): Promise<void> {
    if (source === "panel") {
      setRescheduling(true);
      setPanelError(null);
    } else {
      setMoveBusyId(appointmentId);
      setMoveError(null);
    }
    try {
      await apiFetch("/api/admin/appointments", jsonInit("PUT", { appointmentId, date, startTime }));
      await load();
      // Follow the appointment to its new day so it stays in view (day view).
      if (date !== selectedDate && viewMode === "day") setSelectedDate(date);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not reschedule.";
      if (source === "panel") setPanelError(msg);
      else setMoveError(msg); // block never moved locally, so this is the "revert"
    } finally {
      if (source === "panel") setRescheduling(false);
      else setMoveBusyId(null);
    }
  }

  async function runCreate(payload: NewApptPayload): Promise<void> {
    setCreating(true);
    setFormError(null);
    try {
      await apiFetch("/api/admin/appointments", jsonInit("POST", payload));
      if (payload.date !== selectedDate) setSelectedDate(payload.date);
      setNewAppt(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create appointment.");
    } finally {
      setCreating(false);
    }
  }

  /* ------------------------------- render ------------------------------- */

  const columnProps = {
    now,
    todayStr,
    moveBusyId,
    dropHint,
    onEmptyClick: handleColumnClick,
    onBlockClick: handleBlockClick,
    onBlockDragStart,
    onBlockDragEnd,
    onColumnDragOver,
    onColumnDrop,
  };

  return (
    <div className="space-y-4">
      {/* Header + controls -------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold">Calendar</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {viewMode === "week" ? `${shortMonthDay(weekStart)} – ${shortMonthDay(weekEnd)}` : formatDateLabel(selectedDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Day / Week toggle */}
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`h-9 rounded-l-md px-3 text-sm font-medium transition-colors ${
                viewMode === "day" ? "bg-brand-500 text-white" : "hover:bg-muted"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`h-9 rounded-r-md border-l border-border px-3 text-sm font-medium transition-colors ${
                viewMode === "week" ? "bg-brand-500 text-white" : "hover:bg-muted"
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              aria-label={viewMode === "week" ? "Previous week" : "Previous day"}
              onClick={() => stepBy(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-l-md hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="h-9 border-x border-border px-3 text-sm font-medium hover:bg-muted"
            >
              Today
            </button>
            <button
              type="button"
              aria-label={viewMode === "week" ? "Next week" : "Next day"}
              onClick={() => stepBy(1)}
              className="flex h-9 w-9 items-center justify-center rounded-r-md hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && selectDate(e.target.value)}
            className={INPUT_CLASS + " h-9 w-auto"}
            aria-label="Jump to date"
          />
          <Button className="bg-brand-500 hover:bg-brand-600" onClick={() => openNewAppt(defaultNewTime())}>
            <Plus className="mr-1 h-4 w-4" />
            New appointment
          </Button>
        </div>
      </div>

      {/* Week strip --------------------------------------------------------- */}
      <div className="overflow-x-auto">
        <div className="flex w-full gap-2">
          {weekDays.map((d) => {
            const isSel = d === selectedDate;
            const isToday = d === todayStr;
            const wd = dayOfWeek(d);
            const count = countByDate[d] ?? 0;
            return (
              <button
                key={d}
                type="button"
                onClick={() => selectDate(d)}
                className={`flex min-w-[3.25rem] flex-1 flex-col items-center rounded-lg border px-2 py-1.5 transition-colors ${
                  isSel ? "border-brand-500 bg-brand-500 text-white" : "border-border hover:bg-muted"
                }`}
              >
                <span className={`text-[11px] uppercase ${isSel ? "text-white/80" : "text-muted-foreground"}`}>
                  {DAY_SHORT[wd]}
                </span>
                <span className={`mt-0.5 text-base font-semibold ${isToday && !isSel ? "text-brand-600" : ""}`}>
                  {Number(d.slice(8, 10))}
                </span>
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    count > 0 ? (isSel ? "bg-white" : "bg-brand-500") : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {loadError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {moveError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{moveError}</span>
          <button
            type="button"
            onClick={() => setMoveError(null)}
            className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium hover:bg-red-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {viewMode === "day" && dayAvail.closed && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Ban className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Closed</span> · {dayAvail.closedReason}
          </span>
        </div>
      )}

      {/* Time grid (day = 1 column, week = 7) ------------------------------- */}
      <div className="rounded-xl border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading calendar…
          </div>
        ) : viewMode === "day" ? (
          <div className="overflow-x-auto">
            <div className="flex min-w-[320px]">
              <TimeGutter />
              <DayColumn
                date={selectedDate}
                appts={dayAppointments}
                avail={dayAvail}
                className="flex-1 border-l border-border"
                {...columnProps}
              />
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Column headers */}
              <div className="flex border-b border-border">
                <div className="w-14 shrink-0" />
                {weekDays.map((d) => {
                  const isToday = d === todayStr;
                  const isSel = d === selectedDate;
                  const wd = dayOfWeek(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => selectDate(d)}
                      className={`flex-1 border-l border-border px-1 py-1.5 text-center transition-colors hover:bg-muted ${
                        isSel ? "bg-brand-50" : ""
                      }`}
                    >
                      <div className={`text-[11px] uppercase ${isToday ? "text-brand-600" : "text-muted-foreground"}`}>
                        {DAY_SHORT[wd]}
                      </div>
                      <div className={`text-sm font-semibold ${isToday ? "text-brand-600" : ""}`}>
                        {Number(d.slice(8, 10))}
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Column bodies (shared time gutter) */}
              <div className="flex">
                <TimeGutter />
                {weekDays.map((d) => (
                  <DayColumn
                    key={d}
                    date={d}
                    appts={apptsByDate[d] ?? []}
                    avail={availabilityForDate(d, availability)}
                    className="flex-1 border-l border-border"
                    {...columnProps}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && viewMode === "day" && dayAppointments.length === 0 && !dayAvail.closed && (
        <p className="text-center text-sm text-muted-foreground">
          No appointments on {formatDateLabel(selectedDate)}. Click any time slot to add one.
        </p>
      )}

      {/* Detail panel / bottom sheet */}
      {selectedAppt && (
        <AppointmentDetail
          appt={selectedAppt}
          onClose={() => {
            setSelectedApptId(null);
            setPanelError(null);
          }}
          onAction={runAction}
          onReschedule={(date, startTime) => runReschedule(selectedAppt.id, date, startTime, "panel")}
          busyAction={busyAction}
          rescheduling={rescheduling}
          error={panelError}
        />
      )}

      {/* New appointment modal */}
      {newAppt && (
        <NewAppointmentModal
          initialDate={newAppt.date}
          initialTime={newAppt.time}
          services={services}
          submitting={creating}
          error={formError}
          onClose={() => setNewAppt(null)}
          onSubmit={runCreate}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Time gutter (hour labels, shared by both views)                    */
/* ------------------------------------------------------------------ */

function TimeGutter() {
  return (
    <div className="relative w-14 shrink-0" style={{ height: GRID_HEIGHT }}>
      {HOUR_MARKS.map((m) => (
        <div
          key={m}
          className="absolute right-1 -translate-y-1/2 text-[11px] text-muted-foreground"
          style={{ top: (m - DAY_START_MIN) * PX_PER_MIN }}
        >
          {hourLabel(m)}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Day column — one day's time-grid body (reused by day + week views) */
/* ------------------------------------------------------------------ */

interface DayColumnProps {
  date: string;
  appts: Appointment[];
  avail: DayAvailability;
  className?: string;
  now: { dateStr: string; minutes: number };
  todayStr: string;
  moveBusyId: string | null;
  dropHint: { date: string; startMin: number } | null;
  onEmptyClick: (date: string, e: MouseEvent<HTMLDivElement>) => void;
  onBlockClick: (apptId: string) => void;
  onBlockDragStart: (appt: Appointment, e: DragEvent<HTMLDivElement>) => void;
  onBlockDragEnd: () => void;
  onColumnDragOver: (date: string, e: DragEvent<HTMLDivElement>) => void;
  onColumnDrop: (date: string, e: DragEvent<HTMLDivElement>) => void;
}

function DayColumn({
  date,
  appts,
  avail,
  className,
  now,
  todayStr,
  moveBusyId,
  dropHint,
  onEmptyClick,
  onBlockClick,
  onBlockDragStart,
  onBlockDragEnd,
  onColumnDragOver,
  onColumnDrop,
}: DayColumnProps) {
  const layout = useMemo(() => computeLayout(appts), [appts]);
  const { closed, weeklyRow, openStartMin, openEndMin, windowBlocks } = avail;
  const showNowLine = date === todayStr && now.minutes >= DAY_START_MIN && now.minutes <= DAY_END_MIN;

  return (
    <div
      onClick={(e) => onEmptyClick(date, e)}
      onDragOver={(e) => onColumnDragOver(date, e)}
      onDrop={(e) => onColumnDrop(date, e)}
      title="Click an empty slot to add an appointment"
      className={`relative cursor-pointer select-none ${closed ? "bg-muted/20" : ""} ${className ?? ""}`}
      style={{ height: GRID_HEIGHT }}
    >
      {/* Off-hours shading (before opening / after closing) */}
      {!closed && weeklyRow && openStartMin > DAY_START_MIN && (
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: 0,
            height: (clamp(openStartMin, DAY_START_MIN, DAY_END_MIN) - DAY_START_MIN) * PX_PER_MIN,
            backgroundColor: "rgba(120,120,120,0.06)",
          }}
        />
      )}
      {!closed && weeklyRow && openEndMin < DAY_END_MIN && (
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: (clamp(openEndMin, DAY_START_MIN, DAY_END_MIN) - DAY_START_MIN) * PX_PER_MIN,
            bottom: 0,
            backgroundColor: "rgba(120,120,120,0.06)",
          }}
        />
      )}

      {/* Hour + half-hour lines */}
      {HOUR_MARKS.map((m) => (
        <div
          key={`h-${m}`}
          className="pointer-events-none absolute inset-x-0 border-t border-border"
          style={{ top: (m - DAY_START_MIN) * PX_PER_MIN }}
        />
      ))}
      {HALF_MARKS.map((m) => (
        <div
          key={`hh-${m}`}
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/40"
          style={{ top: (m - DAY_START_MIN) * PX_PER_MIN }}
        />
      ))}

      {/* Blocked windows (hatched) */}
      {windowBlocks.map((o) => {
        const s = clamp(timeToMinutes(o.start_time as string), DAY_START_MIN, DAY_END_MIN);
        const en = clamp(timeToMinutes(o.end_time as string), DAY_START_MIN, DAY_END_MIN);
        const top = (s - DAY_START_MIN) * PX_PER_MIN;
        const height = Math.max((en - s) * PX_PER_MIN, 4);
        return (
          <div
            key={o.id}
            className="pointer-events-none absolute inset-x-0 border-y border-gray-300/60"
            style={{ top, height, ...HATCH_STYLE }}
            title={o.reason ?? "Blocked"}
          >
            <span className="absolute left-2 top-1 text-[11px] font-medium text-gray-500">{o.reason ?? "Blocked"}</span>
          </div>
        );
      })}

      {/* Now indicator */}
      {showNowLine && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
          style={{ top: (now.minutes - DAY_START_MIN) * PX_PER_MIN }}
        >
          <div className="h-2 w-2 -translate-x-1 rounded-full bg-red-500" />
          <div className="h-px flex-1 bg-red-500" />
        </div>
      )}

      {/* Drop hint while dragging over this column */}
      {dropHint && dropHint.date === date && (
        <div
          className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
          style={{ top: (dropHint.startMin - DAY_START_MIN) * PX_PER_MIN }}
        >
          <div className="h-2 w-2 -translate-x-1 rounded-full bg-brand-500" />
          <div className="h-0.5 flex-1 bg-brand-500" />
        </div>
      )}

      {/* Appointment blocks */}
      {layout.map((item) => {
        const { appt } = item;
        const top = clamp((item.startMin - DAY_START_MIN) * PX_PER_MIN, 0, GRID_HEIGHT - MIN_BLOCK_PX);
        const rawHeight = (item.endMin - item.startMin) * PX_PER_MIN;
        const height = clamp(Math.max(rawHeight, MIN_BLOCK_PX), MIN_BLOCK_PX, GRID_HEIGHT - top);
        const meta = statusMeta(appt.status);
        const compact = height < 46;
        const widthPct = 100 / item.cols;
        const timeText = `${formatTimeLabel(appt.start_time)} – ${formatTimeLabel(appt.end_time)}`;
        const clientName = appt.client?.name ?? "Client";
        const serviceName = appt.service?.name ?? "Service";
        const moving = moveBusyId === appt.id;
        return (
          <div
            key={appt.id}
            role="button"
            tabIndex={0}
            draggable
            aria-label={`${clientName}, ${serviceName}, ${timeText}`}
            onClick={(e) => {
              e.stopPropagation();
              onBlockClick(appt.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onBlockClick(appt.id);
              }
            }}
            onDragStart={(e) => onBlockDragStart(appt, e)}
            onDragEnd={onBlockDragEnd}
            className={`absolute z-10 cursor-grab overflow-hidden rounded-md border border-black/5 border-l-4 px-1.5 py-0.5 text-left shadow-sm transition-shadow hover:z-30 hover:shadow-md active:cursor-grabbing ${
              meta.block
            } ${appt.status === "cancelled" || appt.status === "declined" ? "opacity-70" : ""} ${
              moving ? "opacity-50 ring-2 ring-brand-400" : ""
            }`}
            style={{
              top,
              height,
              left: `calc(${item.col * widthPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
            }}
          >
            {moving && <Loader2 className="absolute right-1 top-1 h-3 w-3 animate-spin" />}
            {compact ? (
              <div className="truncate text-[11px] font-medium leading-tight">
                {formatTimeLabel(appt.start_time)} · {clientName}
              </div>
            ) : (
              <>
                <div className="truncate text-[11px] font-semibold leading-tight">{clientName}</div>
                <div className="truncate text-[11px] leading-tight opacity-90">
                  {serviceName}
                  {appt.tier ? ` · ${appt.tier.name}` : ""}
                </div>
                <div className="truncate text-[10px] leading-tight opacity-75">{timeText}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Appointment detail (right panel on desktop, bottom sheet on mobile) */
/* ------------------------------------------------------------------ */

interface AppointmentDetailProps {
  appt: Appointment;
  onClose: () => void;
  onAction: (action: ApptAction) => Promise<void>;
  onReschedule: (date: string, startTime: string) => Promise<void>;
  busyAction: ApptAction | null;
  rescheduling: boolean;
  error: string | null;
}

function AppointmentDetail({
  appt,
  onClose,
  onAction,
  onReschedule,
  busyAction,
  rescheduling,
  error,
}: AppointmentDetailProps) {
  const [reschedOpen, setReschedOpen] = useState(false);
  const [date, setDate] = useState(appt.date);
  const [time, setTime] = useState(toHhMm(appt.start_time));
  const [openFee, setOpenFee] = useState<FeeKind | null>(null);

  useEffect(() => {
    setDate(appt.date);
    setTime(toHhMm(appt.start_time));
    setReschedOpen(false);
    setOpenFee(null);
  }, [appt.id, appt.date, appt.start_time]);

  const meta = statusMeta(appt.status);
  const actions = STATUS_ACTIONS[appt.status] ?? [];
  const busy = busyAction !== null || rescheduling;
  const canCharge = FEE_STATUSES.has(appt.status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-stretch sm:justify-end"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-background p-6 shadow-xl sm:h-full sm:max-h-full sm:max-w-md sm:rounded-none sm:border-l"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{appt.service?.name ?? "Appointment"}</h3>
            {appt.tier && <p className="truncate text-sm text-muted-foreground">{appt.tier.name}</p>}
          </div>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${meta.pill}`}>
          {meta.label}
        </span>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              {formatDateLabel(appt.date)} · {formatTimeLabel(appt.start_time)} – {formatTimeLabel(appt.end_time)}
            </span>
          </div>
          {appt.service && (
            <div className="text-muted-foreground">
              {appt.service.category} · {appt.service.duration_minutes} min
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-border p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            {appt.client?.name ?? "Client"}
          </div>
          {appt.client?.email && (
            <div className="mt-1 flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <a className="truncate hover:underline" href={`mailto:${appt.client.email}`}>
                {appt.client.email}
              </a>
            </div>
          )}
          {appt.client?.phone && (
            <div className="mt-1 flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <a className="hover:underline" href={`tel:${appt.client.phone}`}>
                {appt.client.phone}
              </a>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-between rounded-xl border border-border p-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Deposit</div>
            <div className="font-semibold">{formatCents(appt.deposit_cents)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Balance due</div>
            <div className="font-semibold">{formatCents(appt.balance_due_cents)}</div>
          </div>
        </div>

        {appt.notes && (
          <p className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {appt.notes}
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {/* Status actions */}
        {actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button
                key={a.action}
                size="sm"
                variant={a.primary ? "default" : "outline"}
                className={a.primary ? "bg-brand-500 hover:bg-brand-600" : ""}
                disabled={busy}
                onClick={() => onAction(a.action)}
              >
                {busyAction === a.action ? <Loader2 className="h-4 w-4 animate-spin" /> : a.label}
              </Button>
            ))}
          </div>
        )}

        {/* Charge a fee */}
        {canCharge && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Charge a fee</p>
            <FeeCharge
              key={`${appt.id}:no_show`}
              appointmentId={appt.id}
              kind="no_show"
              label="Charge no-show fee"
              open={openFee === "no_show"}
              onToggle={() => setOpenFee((f) => (f === "no_show" ? null : "no_show"))}
            />
            <FeeCharge
              key={`${appt.id}:late_cancel`}
              appointmentId={appt.id}
              kind="late_cancel"
              label="Charge late-cancel fee"
              open={openFee === "late_cancel"}
              onToggle={() => setOpenFee((f) => (f === "late_cancel" ? null : "late_cancel"))}
            />
          </div>
        )}

        {/* Reschedule */}
        <div className="mt-4 border-t border-border pt-4">
          {!reschedOpen ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setReschedOpen(true)}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Reschedule
            </Button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onReschedule(date, time);
              }}
              className="space-y-3"
            >
              <p className="text-sm font-medium">Reschedule appointment</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLASS} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Start time</label>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT_CLASS} required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="bg-brand-500 hover:bg-brand-600" disabled={rescheduling || !date || !time}>
                  {rescheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save new time"}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={rescheduling} onClick={() => setReschedOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fee charge (no-show / late-cancel) — money is integer CENTS         */
/* ------------------------------------------------------------------ */

interface FeeChargeProps {
  appointmentId: string;
  kind: FeeKind;
  label: string;
  open: boolean;
  onToggle: () => void;
}

function FeeCharge({ appointmentId, kind, label, open, onToggle }: FeeChargeProps) {
  const [quote, setQuote] = useState<FeeQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [amount, setAmount] = useState("0");
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch the fee quote whenever this section opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingQuote(true);
    setError(null);
    setSuccess(null);
    setQuote(null);
    apiFetch<FeeQuote>(`/api/admin/fees?appointmentId=${encodeURIComponent(appointmentId)}&kind=${kind}`)
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        setAmount((Math.max(0, q.feeCents) / 100).toFixed(2));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load fee.");
      })
      .finally(() => {
        if (!cancelled) setLoadingQuote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, appointmentId, kind]);

  const amountCents = centsFromDollars(amount);
  const belowMin = amountCents < MIN_FEE_CENTS;

  async function submit(): Promise<void> {
    if (charging || belowMin) return;
    setCharging(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch<FeeChargeResult>(
        "/api/admin/fees",
        jsonInit("POST", { appointmentId, kind, amountCents })
      );
      setSuccess(`Charged ${formatCents(res.feeCents)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Charge failed.");
    } finally {
      setCharging(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full justify-start"
        disabled={charging}
        onClick={onToggle}
      >
        <CreditCard className="mr-1 h-4 w-4" />
        {label}
      </Button>

      {open && (
        <div className="mt-2 space-y-2">
          {loadingQuote ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking card…
            </div>
          ) : quote && !quote.hasCard ? (
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled>
                Charge
              </Button>
              <span className="text-xs text-muted-foreground">No card on file</span>
            </div>
          ) : quote ? (
            <>
              <label className="block text-xs text-muted-foreground">Amount ($)</label>
              <div className="flex items-start gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={INPUT_CLASS}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={charging}
                />
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 bg-brand-500 hover:bg-brand-600"
                  disabled={charging || belowMin}
                  onClick={submit}
                >
                  {charging ? <Loader2 className="h-4 w-4 animate-spin" /> : `Charge ${formatCents(amountCents)}`}
                </Button>
              </div>
              {belowMin && !success && (
                <p className="text-xs text-muted-foreground">Minimum charge is {formatCents(MIN_FEE_CENTS)}.</p>
              )}
            </>
          ) : null}

          {success && <p className="text-sm font-medium text-green-700">{success}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New appointment modal                                              */
/* ------------------------------------------------------------------ */

interface NewAppointmentModalProps {
  initialDate: string;
  initialTime: string;
  services: FormService[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: NewApptPayload) => Promise<void>;
}

function NewAppointmentModal({
  initialDate,
  initialTime,
  services,
  submitting,
  error,
  onClose,
  onSubmit,
}: NewAppointmentModalProps) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [tierId, setTierId] = useState("");
  const [status, setStatus] = useState<"confirmed" | "pending">("confirmed");
  const [depositDollars, setDepositDollars] = useState("0");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const tiers = selectedService?.tiers ?? [];

  function submit(e: FormEvent): void {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) {
      setLocalError("Client name and email are required.");
      return;
    }
    if (!serviceId) {
      setLocalError("Choose a service.");
      return;
    }
    if (!date || !time) {
      setLocalError("Pick a date and start time.");
      return;
    }
    setLocalError(null);
    onSubmit({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim(),
      serviceId,
      tierId: tierId || null,
      date,
      startTime: time,
      status,
      depositPaidCents: centsFromDollars(depositDollars),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">New appointment</h3>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Client name">
            <input className={INPUT_CLASS} value={clientName} onChange={(e) => setClientName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <input type="email" className={INPUT_CLASS} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required />
          </Field>
          <Field label="Phone (optional)">
            <input type="tel" className={INPUT_CLASS} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          </Field>
          <Field label="Service">
            <select
              className={INPUT_CLASS}
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setTierId("");
              }}
              required
            >
              <option value="">Select a service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatCents(s.base_price)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tier (optional)">
            <select
              className={INPUT_CLASS}
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
              disabled={!selectedService || tiers.length === 0}
            >
              <option value="">No tier</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · +{formatCents(t.price_addon)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className={INPUT_CLASS}
              value={status}
              onChange={(e) => setStatus(e.target.value === "pending" ? "pending" : "confirmed")}
            >
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className={INPUT_CLASS} value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Start time">
            <input type="time" className={INPUT_CLASS} value={time} onChange={(e) => setTime(e.target.value)} required />
          </Field>
          <Field label="Deposit collected ($)">
            <input
              type="number"
              min={0}
              step="0.01"
              className={INPUT_CLASS}
              value={depositDollars}
              onChange={(e) => setDepositDollars(e.target.value)}
            />
          </Field>

          {services.length === 0 && (
            <p className="text-sm text-amber-700 sm:col-span-2">
              No services found. Add a service before booking.
            </p>
          )}

          {(localError || error) && <p className="text-sm text-red-600 sm:col-span-2">{localError ?? error}</p>}

          <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
