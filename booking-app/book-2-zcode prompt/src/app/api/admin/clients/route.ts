import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

/** GET client directory (optional ?q= search) with visit stats. */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim();

  const supabase = createSupabaseAdminClient();
  let query = supabase.from("clients").select("*").eq("stylist_id", stylist.id).order("name");
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data: clients } = await query;

  const { data: appts } = await supabase
    .from("appointments")
    .select("client_id,status,date")
    .eq("stylist_id", stylist.id);

  const stats: Record<string, { visits: number; upcoming: number; noShows: number; lastVisit: string | null; booked: number }> = {};
  const today = new Date().toISOString().slice(0, 10);
  for (const a of appts ?? []) {
    const s = (stats[a.client_id] ??= { visits: 0, upcoming: 0, noShows: 0, lastVisit: null, booked: 0 });
    s.booked++;
    if (a.status === "completed") { s.visits++; if (!s.lastVisit || a.date > s.lastVisit) s.lastVisit = a.date; }
    if (a.status === "no_show") s.noShows++;
    if (["pending", "confirmed"].includes(a.status) && a.date >= today) s.upcoming++;
  }
  return NextResponse.json({
    clients: (clients ?? []).map((c) => ({ ...c, stats: stats[c.id] ?? { visits: 0, upcoming: 0, noShows: 0, lastVisit: null, booked: 0 } })),
  });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().max(4000).nullable().optional(),
  allergies: z.string().max(1000).nullable().optional(),
  preferences: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
});

/** PATCH update a client's CRM fields. */
export async function PATCH(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const update: Database["public"]["Tables"]["clients"]["Update"] = {};
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;
  if (parsed.data.allergies !== undefined) update.allergies = parsed.data.allergies;
  if (parsed.data.preferences !== undefined) update.preferences = parsed.data.preferences;
  if (parsed.data.tags !== undefined) update.tags = parsed.data.tags;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("clients").update(update).eq("id", parsed.data.id).eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
