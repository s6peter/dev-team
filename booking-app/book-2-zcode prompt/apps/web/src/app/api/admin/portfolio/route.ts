import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().url().max(600),
  serviceCategory: z.string().max(60).nullable().optional(),
  hairLength: z.string().max(60).nullable().optional(),
  sortOrder: z.number().int().optional(),
});
const delSchema = z.object({ id: z.string().uuid() });

/** GET all portfolio items for the stylist. */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("portfolio_items").select("*").eq("stylist_id", stylist.id).order("sort_order");
  return NextResponse.json({ items: data ?? [] });
}

function row(stylistId: string, b: z.infer<typeof upsertSchema>) {
  return {
    stylist_id: stylistId,
    title: b.title,
    description: b.description ?? null,
    image_url: b.imageUrl,
    service_category: b.serviceCategory ?? null,
    hair_length: b.hairLength ?? null,
    sort_order: b.sortOrder ?? 99,
  };
}

/** POST create a portfolio item. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("portfolio_items").insert(row(stylist.id, parsed.data));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** PATCH edit a portfolio item. */
export async function PATCH(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const update: Database["public"]["Tables"]["portfolio_items"]["Update"] = row(stylist.id, parsed.data);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("portfolio_items").update(update).eq("id", parsed.data.id).eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE a portfolio item. */
export async function DELETE(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("portfolio_items").delete().eq("id", parsed.data.id).eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
