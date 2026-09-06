import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type GroupUpdate = Database["public"]["Tables"]["service_groups"]["Update"];

/**
 * Admin CRUD for the 4 booking group tiles (Adult / Kids / Mens / Custom).
 * Everything is scoped to the caller's stylist_id — every write carries
 * `.eq("stylist_id", stylist.id)` so one stylist can never touch another's rows.
 */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "group";

const baseFields = {
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).optional(),
  kind: z.enum(["standard", "custom"]).optional(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
};
const postSchema = z.object(baseFields);
const patchSchema = z.object({
  id: z.string().uuid(),
  // On edit every field is optional so callers can PATCH a single attribute
  // (reorder, rename, toggle active) without resending the whole row.
  name: z.string().min(1).max(80).optional(),
  slug: z.string().min(1).max(80).optional(),
  kind: z.enum(["standard", "custom"]).optional(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
const delSchema = z.object({ id: z.string().uuid() });

/** GET all groups (incl. inactive) for the caller, ordered by sort_order. */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("service_groups")
    .select("*")
    .eq("stylist_id", stylist.id)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data ?? [] });
}

/** POST create a group tile. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("service_groups")
    .insert({
      stylist_id: stylist.id,
      name: b.name,
      slug: b.slug ? slugify(b.slug) : slugify(b.name),
      kind: b.kind ?? "standard",
      description: b.description ?? null,
      image_url: b.imageUrl ?? null,
      is_active: b.isActive ?? true,
      sort_order: b.sortOrder ?? 99,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "A group with that slug already exists." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}

/** PATCH edit a group (rename / reorder / toggle active / kind / description). */
export async function PATCH(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const update: GroupUpdate = {};
  if (b.name !== undefined) update.name = b.name;
  if (b.slug !== undefined) update.slug = slugify(b.slug);
  if (b.kind !== undefined) update.kind = b.kind;
  if (b.description !== undefined) update.description = b.description;
  if (b.imageUrl !== undefined) update.image_url = b.imageUrl;
  if (b.isActive !== undefined) update.is_active = b.isActive;
  if (b.sortOrder !== undefined) update.sort_order = b.sortOrder;
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("service_groups")
    .update(update)
    .eq("id", b.id)
    .eq("stylist_id", stylist.id)
    .select("id");
  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "A group with that slug already exists." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** DELETE a group (soft-deactivates if services still reference it). */
export async function DELETE(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("service_groups")
    .delete()
    .eq("id", parsed.data.id)
    .eq("stylist_id", stylist.id);
  if (error) {
    if (error.code === "23503") {
      // Services still point at this group (FK restrict) -> deactivate instead.
      const { data } = await supabase
        .from("service_groups")
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
