import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** GET waitlist entries (with the service name) for the stylist. */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status");
  const supabase = createSupabaseAdminClient();
  let q = supabase.from("waitlist_entries").select("*, service:services(name)").eq("stylist_id", stylist.id).order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return NextResponse.json({ entries: data ?? [] });
}

const patchSchema = z.object({ id: z.string().uuid(), status: z.enum(["waiting", "notified", "booked", "expired", "cancelled"]) });

/** PATCH update a waitlist entry's status (mark booked / remove). */
export async function PATCH(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("waitlist_entries").update({ status: parsed.data.status }).eq("id", parsed.data.id).eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
