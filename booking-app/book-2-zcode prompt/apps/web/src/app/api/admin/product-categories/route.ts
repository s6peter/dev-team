import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type CategoryUpdate = Database["public"]["Tables"]["product_categories"]["Update"];

/**
 * Admin CRUD for the shop's managed category tiles (Aftercare, Styling & Edges,
 * Accessories, …) — mirrors service_groups. Owner-or-stylist via
 * getAdminStylist(); every write is scoped by `.eq("stylist_id", stylist.id)`
 * so one stylist can never touch another's categories.
 */

const postSchema = z.object({
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
const delSchema = z.object({ id: z.string().uuid() });

/** GET all categories (incl. inactive) for the caller, ordered by sort_order. */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("stylist_id", stylist.id)
    .order("sort_order")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

/** POST create a category tile. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stylist.is_owner) return NextResponse.json({ error: "Only the owner can manage the shop." }, { status: 403 });
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_categories")
    .insert({
      stylist_id: stylist.id,
      name: b.name,
      is_active: b.isActive ?? true,
      sort_order: b.sortOrder ?? 99,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

/** PATCH edit a category (rename / reorder / toggle active). */
export async function PATCH(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stylist.is_owner) return NextResponse.json({ error: "Only the owner can manage the shop." }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const update: CategoryUpdate = {};
  if (b.name !== undefined) update.name = b.name;
  if (b.sortOrder !== undefined) update.sort_order = b.sortOrder;
  if (b.isActive !== undefined) update.is_active = b.isActive;
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_categories")
    .update(update)
    .eq("id", b.id)
    .eq("stylist_id", stylist.id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** DELETE a category (soft-deactivates if products still reference it). */
export async function DELETE(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stylist.is_owner) return NextResponse.json({ error: "Only the owner can manage the shop." }, { status: 403 });
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", parsed.data.id)
    .eq("stylist_id", stylist.id);
  if (error) {
    if (error.code === "23503") {
      // Products still point at this category (FK restrict) -> deactivate instead.
      const { data } = await supabase
        .from("product_categories")
        .update({ is_active: false })
        .eq("id", parsed.data.id)
        .eq("stylist_id", stylist.id)
        .select("id");
      if (!data || data.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, deactivated: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
