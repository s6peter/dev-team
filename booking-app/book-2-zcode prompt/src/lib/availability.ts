import { addDays, dayOfWeek, minutesToTime, nowInSalonTz, timeToMinutes } from "./time";

export interface WeeklyHours {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}
export interface Override {
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
}
export interface BusyRange {
  start_time: string;
  end_time: string;
}
export interface SlotConfig {
  slotIntervalMinutes: number;
  bookingWindowDays: number;
  minLeadMinutes: number;
}

export const DEFAULT_SLOT_CONFIG: SlotConfig = {
  slotIntervalMinutes: 30,
  bookingWindowDays: 60,
  minLeadMinutes: 120,
};

/**
 * Duration-aware, conflict-safe slot generation. A slot is offered only if the
 * full service (duration + buffer) fits inside the working hours and does not
 * overlap any busy range. Respects booking window + min lead (salon timezone).
 * This fixes v1's fixed-30-minute-window and fixed-240-minute bugs.
 */
export function generateSlots(params: {
  dateStr: string;
  weekly: WeeklyHours[];
  overrides: Override[];
  busy: BusyRange[];
  serviceMinutes: number; // duration + buffer
  config?: SlotConfig;
}): { available: boolean; slots: string[]; reason?: string } {
  const config = params.config ?? DEFAULT_SLOT_CONFIG;
  const { dateStr } = params;
  const now = nowInSalonTz();

  if (dateStr < now.dateStr) return { available: false, slots: [], reason: "Past date" };
  const lastBookable = addDays(now.dateStr, config.bookingWindowDays);
  if (dateStr > lastBookable)
    return { available: false, slots: [], reason: "Outside booking window" };

  // Full-day blackout?
  const dayOff = params.overrides.find(
    (o) => o.date === dateStr && !o.is_available && !o.start_time
  );
  if (dayOff) return { available: false, slots: [], reason: "Unavailable" };

  const dow = dayOfWeek(dateStr);
  const hours = params.weekly.find((w) => w.day_of_week === dow && w.is_active);
  if (!hours) return { available: false, slots: [], reason: "Closed" };

  // A same-date override with times narrows/replaces the hours.
  const windowOverride = params.overrides.find(
    (o) => o.date === dateStr && o.is_available && o.start_time && o.end_time
  );
  const startMin = timeToMinutes(windowOverride?.start_time ?? hours.start_time);
  const endMin = timeToMinutes(windowOverride?.end_time ?? hours.end_time);

  const service = Math.max(15, params.serviceMinutes);
  if (endMin - startMin < service)
    return { available: false, slots: [], reason: "No room for this service" };

  // Blocked ranges from overrides that mark a sub-window unavailable.
  const blocked = params.overrides
    .filter((o) => o.date === dateStr && !o.is_available && o.start_time && o.end_time)
    .map((o) => ({ s: timeToMinutes(o.start_time!), e: timeToMinutes(o.end_time!) }));

  const busy = params.busy.map((b) => ({
    s: timeToMinutes(b.start_time),
    e: timeToMinutes(b.end_time),
  }));

  const minStart = dateStr === now.dateStr ? now.minutes + config.minLeadMinutes : 0;
  const overlaps = (s: number, e: number, ranges: { s: number; e: number }[]) =>
    ranges.some((r) => s < r.e && e > r.s);

  const slots: string[] = [];
  for (let s = startMin; s + service <= endMin; s += config.slotIntervalMinutes) {
    const e = s + service;
    if (s < minStart) continue;
    if (overlaps(s, e, blocked)) continue;
    if (overlaps(s, e, busy)) continue;
    slots.push(minutesToTime(s));
  }
  return { available: slots.length > 0, slots, reason: slots.length ? undefined : "Fully booked" };
}
