import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  category: z.string().max(120).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  priceCents: z.number().int().min(0),
  imageUrl: z.string().url().max(600).nullable().optional(),
  videoUrl: z.string().url().max(600).nullable().optional(),
  stock: z.number().int().min(0).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
const delSchema = z.object({ id: z.string().uuid() });

/** Returns the owner stylist row, or null if the caller is not the owner. */
async function getOwner() {
  const stylist = await getAdminStylist();
  if (!stylist || !stylist.is_owner) return null;
  return stylist;
}

/** GET all products for the owner. */
export async function GET() {
  const stylist = await getOwner();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("stylist_id", stylist.id)
    .order("sort_order")
    .order("name");
  return NextResponse.json({ products: data ?? [] });
}

function row(stylistId: string, b: z.infer<typeof upsertSchema>) {
  return {
    stylist_id: stylistId,
    name: b.name,
    category: b.category ?? null,
    category_id: b.categoryId ?? null,
    description: b.description ?? null,
    price_cents: b.priceCents,
    image_url: b.imageUrl ?? null,
    video_url: b.videoUrl ?? null,
    stock: b.stock ?? null,
    sort_order: b.sortOrder ?? 99,
    is_active: b.isActive ?? true,
  };
}

/** POST create a product. */
export async function POST(request: Request) {
  const stylist = await getOwner();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("products").insert(row(stylist.id, parsed.data));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** PATCH edit a product. */
export async function PATCH(request: Request) {
  const stylist = await getOwner();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const update: Database["public"]["Tables"]["products"]["Update"] = row(stylist.id, parsed.data);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("products")
    .update(update)
    .eq("id", parsed.data.id)
    .eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE a product. */
export async function DELETE(request: Request) {
  const stylist = await getOwner();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", parsed.data.id)
    .eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
