import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Public list of bookable stylists (those with at least one active service). */
export async function GET() {
  const supabase = createSupabaseServerClient();
  const [{ data: stylists }, { data: services }] = await Promise.all([
    supabase.from("stylists").select("id,name,bio,avatar_url,instagram,is_owner").order("is_owner", { ascending: false }),
    supabase.from("services").select("stylist_id").eq("is_active", true),
  ]);
  const bookable = new Set((services ?? []).map((s) => s.stylist_id));
  return NextResponse.json({
    stylists: (stylists ?? []).filter((s) => bookable.has(s.id)),
  });
}
