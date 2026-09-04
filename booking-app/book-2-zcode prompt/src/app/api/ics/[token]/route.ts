import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE, fullAddress } from "@/lib/site";

const pad = (n: number) => String(n).padStart(2, "0");
const dt = (date: string, time: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.slice(0, 5).split(":").map(Number);
  // Floating local time (no Z) — calendar apps render it in the salon's local time.
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
};

/** GET /api/ics/<manage_token> — downloadable calendar invite for the appointment. */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("date,start_time,end_time,status,manage_token,service:services(name)")
    .eq("manage_token", params.token)
    .maybeSingle();
  if (!appt) return new Response("Not found", { status: 404 });

  const service = appt.service as unknown as { name: string } | null;
  const title = `${service?.name ?? "Appointment"} — ${SITE.shortName}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE.shortName}//Booking//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appt.manage_token}@queengbraids`,
    `DTSTART:${dt(appt.date, appt.start_time)}`,
    `DTEND:${dt(appt.date, appt.end_time)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:Your appointment with ${SITE.name}. Arrive with hair washed, blow-dried and detangled.`,
    `LOCATION:${fullAddress()}`,
    `STATUS:${appt.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="queeng-appointment.ics"`,
    },
  });
}
