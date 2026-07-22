import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const postSchema = z.object({ name: z.string().min(1).max(60), sortOrder: z.number().int().optional() });
const delSchema = z.object({ id: z.string().uuid() });

/** GET categories with service counts. */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const [{ data: cats }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*").eq("stylist_id", stylist.id).order("sort_order"),
    supabase.from("services").select("category").eq("stylist_id", stylist.id),
  ]);
  const counts = (services ?? []).reduce<Record<string, number>>((m, s) => {
    m[s.category] = (m[s.category] ?? 0) + 1;
    return m;
  }, {});
  return NextResponse.json({
    categories: (cats ?? []).map((c) => ({ ...c, serviceCount: counts[c.name] ?? 0 })),
  });
}

/** POST create a category. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("service_categories")
    .insert({ stylist_id: stylist.id, name: parsed.data.name, sort_order: parsed.data.sortOrder ?? 99 });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "That category already exists." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE a category (only if empty). */
export async function DELETE(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: cat } = await supabase
    .from("service_categories")
    .select("name")
    .eq("id", parsed.data.id)
    .eq("stylist_id", stylist.id)
    .maybeSingle();
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("stylist_id", stylist.id)
    .eq("category", cat.name);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Move or delete its services first." }, { status: 409 });
  }

  const { error } = await supabase.from("service_categories").delete().eq("id", parsed.data.id).eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
