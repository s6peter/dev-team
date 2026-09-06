import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type ApptNotice, notifyRescheduled, notifyCancelled } from "@/lib/notifications";

/** Load an appointment and shape it into an ApptNotice (client + service + stylist). */
async function loadNotice(appointmentId: string): Promise<ApptNotice | null> {
  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "date,start_time,deposit_cents,balance_due_cents,manage_token,stylist_id,service:services(name),stylist:stylists(name),client:clients(name,email,phone)"
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || !appt.client) return null;
  const client = appt.client as unknown as { name: string; email: string; phone: string | null };
  const service = appt.service as unknown as { name: string } | null;
  const stylist = appt.stylist as unknown as { name: string } | null;
  return {
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone,
    serviceName: service?.name ?? "your appointment",
    date: appt.date,
    startTime: appt.start_time,
    depositCents: appt.deposit_cents,
    balanceCents: appt.balance_due_cents,
    manageToken: appt.manage_token,
    stylistId: appt.stylist_id,
    stylistName: stylist?.name ?? null,
  };
}

/** Best-effort "your appointment was rescheduled" notice (reflects the new time). */
export async function sendRescheduledNotice(appointmentId: string) {
  const n = await loadNotice(appointmentId);
  if (n) await notifyRescheduled(n).catch((e) => console.error("reschedule notify failed", e));
}

/** Best-effort "your appointment was cancelled" notice. */
export async function sendCancelledNotice(appointmentId: string, refunded = false) {
  const n = await loadNotice(appointmentId);
  if (n) await notifyCancelled(n, refunded).catch((e) => console.error("cancel notify failed", e));
}
