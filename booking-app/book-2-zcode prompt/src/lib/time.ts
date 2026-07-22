/** Timezone-safe date/time helpers. The salon operates in America/Chicago. */
export const SALON_TZ = "America/Chicago";

/** Day of week (0=Sun) for a 'YYYY-MM-DD' string, independent of server TZ. */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 'HH:MM[:SS]' -> minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h = 0, mm = 0] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + mm;
}

/** minutes since midnight -> 'HH:MM'. */
export function minutesToTime(total: number): string {
  const h = Math.floor(Math.max(0, total) / 60);
  const m = Math.max(0, total) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Current 'YYYY-MM-DD' and minutes-since-midnight in the salon timezone. */
export function nowInSalonTz(): { dateStr: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = parseInt(get("hour")) * 60 + parseInt(get("minute"));
  return { dateStr, minutes };
}

/** Add days to a 'YYYY-MM-DD' string, returning a 'YYYY-MM-DD' string. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}

/** Human label for 'HH:MM' -> "4:30 PM". */
export function formatTimeLabel(time: string): string {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
