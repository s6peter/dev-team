import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Best-effort audit record of a client message (never throws). */
export async function logNotification(entry: {
  channel: "email" | "sms";
  recipient: string;
  subject?: string | null;
  body: string;
  status: "sent" | "logged" | "failed";
  stylistId?: string | null;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("notification_log").insert({
      stylist_id: entry.stylistId ?? null,
      channel: entry.channel,
      recipient: entry.recipient,
      subject: entry.subject ?? null,
      body: entry.body.slice(0, 4000),
      status: entry.status,
    });
  } catch {
    /* logging must never break a send */
  }
}
