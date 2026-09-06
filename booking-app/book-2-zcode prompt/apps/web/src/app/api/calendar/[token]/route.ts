import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE, fullAddress } from "@/lib/site";
import { addDays, nowInSalonTz } from "@/lib/time";

const pad = (n: number) => String(n).padStart(2, "0");
const dt = (date: string, time: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.slice(0, 5).split(":").map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
};
const escICS = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

/** GET /api/calendar/<feed_token>.ics — a read-only subscribable feed of the
 *  stylist's upcoming appointments (subscribe by URL in Google/Apple Calendar). */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token.replace(/\.ics$/, "");
  const supabase = createSupabaseAdminClient();
  const { data: stylist } = await supabase.from("stylists").select("id,name").eq("calendar_feed_token", token).maybeSingle();
  if (!stylist) return new Response("Not found", { status: 404 });

  const now = nowInSalonTz();
  const { data: appts } = await supabase
    .from("appointments")
    .select("id,date,start_time,end_time,status,service:services(name),client:clients(name)")
    .eq("stylist_id", stylist.id)
    .gte("date", addDays(now.dateStr, -1))
    .in("status", ["pending", "confirmed", "completed"])
    .order("date");

  const events = (appts ?? []).map((a) => {
    const svc = (a.service as unknown as { name: string } | null)?.name ?? "Appointment";
    const client = (a.client as unknown as { name: string } | null)?.name ?? "Client";
    return [
      "BEGIN:VEVENT",
      `UID:${a.id}@queengbraids`,
      `DTSTART:${dt(a.date, a.start_time)}`,
      `DTEND:${dt(a.date, a.end_time)}`,
      `SUMMARY:${escICS(`${svc} — ${client}${a.status === "pending" ? " (pending)" : ""}`)}`,
      `LOCATION:${escICS(fullAddress())}`,
      `STATUS:${a.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${SITE.shortName}//Feed//EN`,
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escICS(SITE.shortName + " appointments")}`,
    ...events, "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
