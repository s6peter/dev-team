import { NextResponse } from "next/server";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** GET recent client messages (confirmations, reminders, etc.). */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("notification_log").select("*").order("created_at", { ascending: false }).limit(200);
  return NextResponse.json({ messages: data ?? [] });
}
