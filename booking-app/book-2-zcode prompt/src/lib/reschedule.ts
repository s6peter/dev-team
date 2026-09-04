import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { minutesToTime, timeToMinutes } from "@/lib/time";

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
    .select("id,date,start_time,end_time,status,stylist_id,reschedule_count")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return { ok: false, status: 404, error: "Appointment not found." };
  if (opts.stylistId && appt.stylist_id !== opts.stylistId)
    return { ok: false, status: 403, error: "Not your appointment." };
  if (!["pending", "confirmed"].includes(appt.status))
    return { ok: false, status: 400, error: "This appointment can't be rescheduled." };

  if (opts.enforcePolicy) {
    const hoursUntil = (new Date(`${appt.date}T${appt.start_time}`).getTime() - Date.now()) / 3.6e6;
    if (hoursUntil < 24)
      return { ok: false, status: 400, error: "Reschedules must be at least 24 hours ahead." };
    if (appt.reschedule_count >= 1)
      return { ok: false, status: 400, error: "You may reschedule only once. Please contact us for further changes." };
  }

  const durationMin = timeToMinutes(appt.end_time) - timeToMinutes(appt.start_time);
  const newEnd = minutesToTime(timeToMinutes(newStart) + durationMin);
  if (new Date(`${newDate}T${newStart}`).getTime() < Date.now())
    return { ok: false, status: 400, error: "Pick a future time." };

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
