import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { formatDateLabel, nowInSalonTz } from "@/lib/time";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456";
const FLEX_DAYS: Record<string, number> = { exact: 0, plus_minus_1: 1, plus_minus_3: 3, any: 9999 };

/**
 * When an appointment frees up (cancel/decline), notify waitlisted clients whose
 * service + date flexibility match. Marks them 'notified' so they aren't re-pinged.
 */
export async function notifyWaitlistOnOpening(stylistId: string, freedDate: string, serviceId: string | null) {
  if (freedDate < nowInSalonTz().dateStr) return 0; // never advertise a past slot
  const supabase = createSupabaseAdminClient();
  const { data: entries } = await supabase
    .from("waitlist_entries")
    .select("*")
    .eq("stylist_id", stylistId)
    .eq("status", "waiting")
    .order("created_at", { ascending: true }); // FIFO: longest-waiting first
  if (!entries?.length) return 0;

  const freed = new Date(`${freedDate}T12:00:00Z`).getTime();
  const matches = entries.filter((e) => {
    if (e.service_id && serviceId && e.service_id !== serviceId) return false;
    if (!e.desired_date) return true;
    const days = FLEX_DAYS[e.flexibility] ?? 0;
    const diff = Math.abs(new Date(`${e.desired_date}T12:00:00Z`).getTime() - freed) / 86400000;
    return diff <= days;
  }).slice(0, 5); // cap the fan-out

  await Promise.all(
    matches.map(async (e) => {
      const body = `A spot just opened up on ${formatDateLabel(freedDate)} at QueenG Braids! Book now before someone else grabs it: ${APP_URL}/book`;
      const sent = await Promise.all([
        sendEmail({ to: e.client_email, subject: "A spot just opened up! 🎉", html: `<p>Hi ${e.client_name},</p><p>${body}</p><p><a href="${APP_URL}/book" style="color:#db2777">Book your appointment →</a></p>` }),
        e.client_phone ? sendSMS({ to: e.client_phone, body }) : Promise.resolve(true),
      ]).catch(() => [false]);
      if (Array.isArray(sent) && sent.some(Boolean)) {
        await supabase.from("waitlist_entries").update({ status: "notified", notified_at: new Date().toISOString() }).eq("id", e.id);
      }
    })
  );
  return matches.length;
}
