export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "completed"
  | "no_show"
  | "cancelled";

export interface AppointmentRecord {
  id: string;
  category?: string;
  serviceId?: string;
  serviceName: string;
  sizeId?: string;
  sizeName?: string;
  lengthId?: string;
  lengthName?: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  price: number;
  deposit: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeeklyAvailability {
  dayOfWeek: number;
  label: string;
  active: boolean;
  startTime: string;
  endTime: string;
}

export interface BlockedDay {
  id: string;
  date: string;
  reason: string;
  createdAt: string;
}

export interface BlockedTimeRange {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: string;
}

export interface BookingSettings {
  weeklyAvailability: WeeklyAvailability[];
  blockedDays: BlockedDay[];
  blockedTimeRanges: BlockedTimeRange[];
  slotIntervalMinutes: number;
  bookingWindowDays: number;
  minLeadMinutes: number;
  bufferMinutes: number;
}

export interface AvailabilitySummary {
  date: string;
  available: boolean;
  slots: string[];
  reason?: string;
}

export const APPOINTMENTS_STORAGE_KEY = "queeng_appointments";
export const BOOKING_SETTINGS_STORAGE_KEY = "queeng_booking_settings";

const APPOINTMENTS_UPDATED_EVENT = "queeng:appointments-updated";
const BOOKING_SETTINGS_UPDATED_EVENT = "queeng:booking-settings-updated";
const DEFAULT_DURATION_MINUTES = 240;

export const defaultBookingSettings: BookingSettings = {
  slotIntervalMinutes: 30,
  bookingWindowDays: 60,
  minLeadMinutes: 120,
  bufferMinutes: 0,
  weeklyAvailability: [
    { dayOfWeek: 0, label: "Sunday", active: true, startTime: "13:00", endTime: "20:00" },
    { dayOfWeek: 1, label: "Monday", active: true, startTime: "16:00", endTime: "20:00" },
    { dayOfWeek: 2, label: "Tuesday", active: true, startTime: "16:00", endTime: "20:00" },
    { dayOfWeek: 3, label: "Wednesday", active: true, startTime: "16:00", endTime: "20:00" },
    { dayOfWeek: 4, label: "Thursday", active: true, startTime: "16:00", endTime: "20:00" },
    { dayOfWeek: 5, label: "Friday", active: true, startTime: "16:00", endTime: "20:00" },
    { dayOfWeek: 6, label: "Saturday", active: true, startTime: "07:00", endTime: "20:00" },
  ],
  blockedDays: [],
  blockedTimeRanges: [],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function dispatchEventIfBrowser(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

function readJsonArray(key: string): unknown[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  const asNumber = typeof value === "number" ? value : Number(value);
  return Number.isFinite(asNumber) ? asNumber : fallback;
}

function toStatus(value: unknown): AppointmentStatus {
  if (
    value === "pending" ||
    value === "confirmed" ||
    value === "declined" ||
    value === "completed" ||
    value === "no_show" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "pending";
}

function normalizeTime(value: unknown, fallback: string): string {
  const raw = toStringValue(value, fallback).slice(0, 5);
  return /^\d{2}:\d{2}$/.test(raw) ? raw : fallback;
}

function normalizeAppointment(raw: unknown): AppointmentRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<AppointmentRecord>;
  const id = toStringValue(item.id, "");
  const date = toStringValue(item.date, "");
  const startTime = normalizeTime(item.startTime, "");
  const serviceName = toStringValue(item.serviceName, "");
  const clientEmail = toStringValue(item.clientEmail, "");

  if (!id || !date || !startTime || !serviceName || !clientEmail) return null;

  const durationMinutes = Math.max(30, Math.round(toNumberValue(item.durationMinutes, DEFAULT_DURATION_MINUTES)));
  const endTime = normalizeTime(item.endTime, addMinutesToTime(startTime, durationMinutes));

  return {
    id,
    category: toStringValue(item.category, ""),
    serviceId: toStringValue(item.serviceId, ""),
    serviceName,
    sizeId: toStringValue(item.sizeId, ""),
    sizeName: toStringValue(item.sizeName, ""),
    lengthId: toStringValue(item.lengthId, ""),
    lengthName: toStringValue(item.lengthName, ""),
    date,
    startTime,
    endTime,
    durationMinutes,
    clientName: toStringValue(item.clientName, ""),
    clientEmail,
    clientPhone: toStringValue(item.clientPhone, ""),
    price: toNumberValue(item.price, 0),
    deposit: toNumberValue(item.deposit, 0),
    status: toStatus(item.status),
    notes: toStringValue(item.notes, ""),
    createdAt: toStringValue(item.createdAt, new Date().toISOString()),
    updatedAt: toStringValue(item.updatedAt, ""),
  };
}

function normalizeBlockedDay(raw: unknown): BlockedDay | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<BlockedDay>;
  const date = toStringValue(item.date, "");
  if (!date) return null;

  return {
    id: toStringValue(item.id, crypto.randomUUID()),
    date,
    reason: toStringValue(item.reason, "Blocked"),
    createdAt: toStringValue(item.createdAt, new Date().toISOString()),
  };
}

function normalizeBlockedTimeRange(raw: unknown): BlockedTimeRange | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<BlockedTimeRange>;
  const date = toStringValue(item.date, "");
  const startTime = normalizeTime(item.startTime, "");
  const endTime = normalizeTime(item.endTime, "");
  if (!date || !startTime || !endTime || timeToMinutes(endTime) <= timeToMinutes(startTime)) return null;

  return {
    id: toStringValue(item.id, crypto.randomUUID()),
    date,
    startTime,
    endTime,
    reason: toStringValue(item.reason, "Blocked"),
    createdAt: toStringValue(item.createdAt, new Date().toISOString()),
  };
}

function normalizeWeeklyAvailability(raw: unknown): WeeklyAvailability[] {
  const source = Array.isArray(raw) ? raw : defaultBookingSettings.weeklyAvailability;
  const byDay = new Map<number, Partial<WeeklyAvailability>>();

  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const current = item as Partial<WeeklyAvailability>;
    const dayOfWeek = Math.trunc(toNumberValue(current.dayOfWeek, -1));
    if (dayOfWeek >= 0 && dayOfWeek <= 6) {
      byDay.set(dayOfWeek, current);
    }
  }

  return defaultBookingSettings.weeklyAvailability.map((fallback) => {
    const current = byDay.get(fallback.dayOfWeek) || fallback;
    return {
      dayOfWeek: fallback.dayOfWeek,
      label: fallback.label,
      active: typeof current.active === "boolean" ? current.active : fallback.active,
      startTime: normalizeTime(current.startTime, fallback.startTime),
      endTime: normalizeTime(current.endTime, fallback.endTime),
    };
  });
}

function normalizeBookingSettings(raw: unknown): BookingSettings {
  if (!raw || typeof raw !== "object") return clone(defaultBookingSettings);
  const item = raw as Partial<BookingSettings>;

  return {
    weeklyAvailability: normalizeWeeklyAvailability(item.weeklyAvailability),
    blockedDays: (Array.isArray(item.blockedDays) ? item.blockedDays : [])
      .map(normalizeBlockedDay)
      .filter((day): day is BlockedDay => Boolean(day)),
    blockedTimeRanges: (Array.isArray(item.blockedTimeRanges) ? item.blockedTimeRanges : [])
      .map(normalizeBlockedTimeRange)
      .filter((range): range is BlockedTimeRange => Boolean(range)),
    slotIntervalMinutes: Math.max(15, Math.round(toNumberValue(item.slotIntervalMinutes, defaultBookingSettings.slotIntervalMinutes))),
    bookingWindowDays: Math.max(7, Math.round(toNumberValue(item.bookingWindowDays, defaultBookingSettings.bookingWindowDays))),
    minLeadMinutes: Math.max(0, Math.round(toNumberValue(item.minLeadMinutes, defaultBookingSettings.minLeadMinutes))),
    bufferMinutes: Math.max(0, Math.round(toNumberValue(item.bufferMinutes, defaultBookingSettings.bufferMinutes))),
  };
}

export function loadAppointments(): AppointmentRecord[] {
  const appointments = readJsonArray(APPOINTMENTS_STORAGE_KEY)
    .map(normalizeAppointment)
    .filter((appointment): appointment is AppointmentRecord => Boolean(appointment))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

  if (typeof window !== "undefined") {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
  }

  return appointments;
}

export function saveAppointments(appointments: AppointmentRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
  dispatchEventIfBrowser(APPOINTMENTS_UPDATED_EVENT);
}

export function addAppointment(appointment: AppointmentRecord) {
  saveAppointments([...loadAppointments(), appointment]);
}

export function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const updated = loadAppointments().map((appointment) =>
    appointment.id === appointmentId
      ? { ...appointment, status, updatedAt: new Date().toISOString() }
      : appointment
  );

  saveAppointments(updated);
}

export function loadBookingSettings(): BookingSettings {
  if (typeof window === "undefined") return clone(defaultBookingSettings);

  try {
    const raw = localStorage.getItem(BOOKING_SETTINGS_STORAGE_KEY);
    if (raw) {
      const normalized = normalizeBookingSettings(JSON.parse(raw));
      localStorage.setItem(BOOKING_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch {
    // fall through to defaults
  }

  const fallback = clone(defaultBookingSettings);
  localStorage.setItem(BOOKING_SETTINGS_STORAGE_KEY, JSON.stringify(fallback));
  return fallback;
}

export function saveBookingSettings(settings: BookingSettings) {
  if (typeof window === "undefined") return;
  const normalized = normalizeBookingSettings(settings);
  localStorage.setItem(BOOKING_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  dispatchEventIfBrowser(BOOKING_SETTINGS_UPDATED_EVENT);
}

export function subscribeToBookingDataChanges(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === APPOINTMENTS_STORAGE_KEY ||
      event.key === BOOKING_SETTINGS_STORAGE_KEY
    ) {
      onChange();
    }
  };

  const handleVisibility = () => {
    if (document.visibilityState === "visible") onChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(APPOINTMENTS_UPDATED_EVENT, onChange);
  window.addEventListener(BOOKING_SETTINGS_UPDATED_EVENT, onChange);
  window.addEventListener("focus", onChange);
  window.addEventListener("pageshow", onChange);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(APPOINTMENTS_UPDATED_EVENT, onChange);
    window.removeEventListener(BOOKING_SETTINGS_UPDATED_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    window.removeEventListener("pageshow", onChange);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateString(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, totalMinutes);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutesToTime(time: string, minutesToAdd: number): string {
  return minutesToTime(timeToMinutes(time) + minutesToAdd);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) return `${hours}h ${remainingMinutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainingMinutes}m`;
}

export function formatTimeLabel(time: string): string {
  return new Date(`2000-01-01T${time.slice(0, 5)}:00`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

function getDateLimit(settings: BookingSettings): string {
  const date = new Date();
  date.setDate(date.getDate() + settings.bookingWindowDays);
  return toDateString(date);
}

function isToday(date: string): boolean {
  return date === toDateString(new Date());
}

function getMinimumStartMinutes(settings: BookingSettings, date: string): number {
  if (!isToday(date)) return 0;
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() + settings.minLeadMinutes;
}

export function getAvailabilityForDate({
  settings,
  appointments,
  date,
  durationMinutes,
  excludeAppointmentId,
}: {
  settings: BookingSettings;
  appointments: AppointmentRecord[];
  date: string;
  durationMinutes: number;
  excludeAppointmentId?: string;
}): AvailabilitySummary {
  const today = toDateString(new Date());
  const lastBookableDate = getDateLimit(settings);

  if (date < today) {
    return { date, available: false, slots: [], reason: "Past date" };
  }

  if (date > lastBookableDate) {
    return { date, available: false, slots: [], reason: "Outside booking window" };
  }

  const blockedDay = settings.blockedDays.find((day) => day.date === date);
  if (blockedDay) {
    return { date, available: false, slots: [], reason: blockedDay.reason || "Unavailable" };
  }

  const dayOfWeek = parseDateString(date).getDay();
  const weekly = settings.weeklyAvailability.find((day) => day.dayOfWeek === dayOfWeek);

  if (!weekly || !weekly.active) {
    return { date, available: false, slots: [], reason: "Closed" };
  }

  const interval = Math.max(15, settings.slotIntervalMinutes);
  const duration = Math.max(30, durationMinutes + settings.bufferMinutes);
  const startMinutes = timeToMinutes(weekly.startTime);
  const endMinutes = timeToMinutes(weekly.endTime);

  if (endMinutes <= startMinutes || endMinutes - startMinutes < duration) {
    return { date, available: false, slots: [], reason: "No room for selected service" };
  }

  const minStartMinutes = getMinimumStartMinutes(settings, date);
  const blockedRanges = settings.blockedTimeRanges.filter((range) => range.date === date);
  const busyAppointments = appointments.filter((appointment) =>
    appointment.date === date &&
    appointment.id !== excludeAppointmentId &&
    (appointment.status === "pending" || appointment.status === "confirmed")
  );

  const slots: string[] = [];

  for (let start = startMinutes; start + duration <= endMinutes; start += interval) {
    const end = start + duration;
    if (start < minStartMinutes) continue;

    const blockedByRange = blockedRanges.some((range) =>
      rangesOverlap(start, end, timeToMinutes(range.startTime), timeToMinutes(range.endTime))
    );

    if (blockedByRange) continue;

    const blockedByAppointment = busyAppointments.some((appointment) => {
      const appointmentStart = timeToMinutes(appointment.startTime);
      const appointmentEnd = timeToMinutes(
        appointment.endTime || addMinutesToTime(appointment.startTime, appointment.durationMinutes || DEFAULT_DURATION_MINUTES)
      );
      return rangesOverlap(start, end, appointmentStart, appointmentEnd);
    });

    if (!blockedByAppointment) {
      slots.push(minutesToTime(start));
    }
  }

  return {
    date,
    available: slots.length > 0,
    slots,
    reason: slots.length > 0 ? undefined : "No available times",
  };
}

export function getMonthCalendarDates(monthDate: Date): string[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toDateString(date);
  });
}
