import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { minutesToTime, timeToMinutes, hoursUntilSalon } from "@/lib/time";
import { generateSlots, type WeeklyHours, type Override } from "@/lib/availability";

export type RescheduleResult =
  | { ok: true; date: string; startTime: string }
  | { ok: false; status: number; error: string };

/**
 * Moves an appointment to a new date/time, preserving its duration. The
 * btree_gist EXCLUDE constraint guarantees no overlap (the row's own new range
 * is re-checked against OTHER active rows). Optional policy gating for clients.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newStart: string, // HH:MM
  opts: { enforcePolicy?: boolean; stylistId?: string } = {}
): Promise<RescheduleResult> {
  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id,date,start_time,end_time,status,stylist_id,service_id,reschedule_count")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return { ok: false, status: 404, error: "Appointment not found." };
  if (opts.stylistId && appt.stylist_id !== opts.stylistId)
    return { ok: false, status: 403, error: "Not your appointment." };
  if (!["pending", "confirmed"].includes(appt.status))
    return { ok: false, status: 400, error: "This appointment can't be rescheduled." };

  if (opts.enforcePolicy) {
    const hoursUntil = hoursUntilSalon(appt.date, appt.start_time);
    if (hoursUntil < 24)
      return { ok: false, status: 400, error: "Reschedules must be at least 24 hours ahead." };
    if (appt.reschedule_count >= 1)
      return { ok: false, status: 400, error: "You may reschedule only once. Please contact us for further changes." };
  }

  const durationMin = timeToMinutes(appt.end_time) - timeToMinutes(appt.start_time);
  const newEnd = minutesToTime(timeToMinutes(newStart) + durationMin);
  if (hoursUntilSalon(newDate, newStart) <= 0)
    return { ok: false, status: 400, error: "Pick a future time." };

  // Re-validate the target slot server-side (business hours, day-off, blocked, overlap),
  // not just overlap — defense-in-depth beyond the client availability UI.
  const { data: svc } = await supabase.from("services").select("buffer_minutes").eq("id", appt.service_id).maybeSingle();
  const serviceMinutes = durationMin + (svc?.buffer_minutes ?? 0);
  const [{ data: weekly }, { data: overrides }, { data: appts }, { data: holds }] = await Promise.all([
    supabase.from("availability").select("day_of_week,start_time,end_time,is_active").eq("stylist_id", appt.stylist_id),
    supabase.from("availability_overrides").select("date,start_time,end_time,is_available").eq("stylist_id", appt.stylist_id).eq("date", newDate),
    supabase.from("appointments").select("id,start_time,end_time").eq("stylist_id", appt.stylist_id).eq("date", newDate).in("status", ["pending", "confirmed"]),
    supabase.from("slot_holds").select("start_time,end_time").eq("stylist_id", appt.stylist_id).eq("date", newDate).gt("expires_at", new Date().toISOString()),
  ]);
  const busy = [...(appts ?? []).filter((a) => a.id !== appointmentId), ...(holds ?? [])].map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
  const avail = generateSlots({ dateStr: newDate, weekly: (weekly ?? []) as WeeklyHours[], overrides: (overrides ?? []) as Override[], busy, serviceMinutes });
  if (!avail.slots.includes(newStart)) {
    return { ok: false, status: 409, error: "That time isn't available (outside hours, blocked, or too close to another booking)." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      date: newDate,
      start_time: newStart,
      end_time: newEnd,
      reschedule_count: appt.reschedule_count + 1,
    })
    .eq("id", appointmentId);
  if (error) {
    if (error.code === "23P01") return { ok: false, status: 409, error: "That time overlaps another appointment. Pick another slot." };
    return { ok: false, status: 500, error: error.message };
  }
  return { ok: true, date: newDate, startTime: newStart };
}
