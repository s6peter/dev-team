import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type VariantUpdate = Database["public"]["Tables"]["service_variants"]["Update"];

/**
 * Admin CRUD for the priced booking variants under a service.
 * Every write first proves the parent service belongs to the caller
 * (ownServiceIds) before touching service_variants, so a stylist can never
 * write a variant onto someone else's service.
 */

const variantFields = {
  size: z.string().max(80).optional().nullable(),
  length: z.string().max(80).optional().nullable(),
  label: z.string().min(1).max(120),
  priceCents: z.number().int().min(0),
  priceFrom: z.boolean().optional(),
  durationMinutes: z.number().int().positive(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
};

const postSchema = z.object({ serviceId: z.string().uuid(), ...variantFields });

// Bulk create/update table: a set of rows for one service in a single call.
const bulkRowSchema = z.object({
  id: z.string().uuid().optional(), // present => update, absent => insert
  size: z.string().max(80).optional().nullable(),
  length: z.string().max(80).optional().nullable(),
  label: z.string().min(1).max(120),
  priceCents: z.number().int().min(0),
  priceFrom: z.boolean().optional(),
  durationMinutes: z.number().int().positive(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
const bulkSchema = z.object({
  serviceId: z.string().uuid(),
  variants: z.array(bulkRowSchema).max(100),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  size: z.string().max(80).optional().nullable(),
  length: z.string().max(80).optional().nullable(),
  label: z.string().min(1).max(120).optional(),
  priceCents: z.number().int().min(0).optional(),
  priceFrom: z.boolean().optional(),
  durationMinutes: z.number().int().positive().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const delSchema = z.object({ id: z.string().uuid() });

type Db = ReturnType<typeof createSupabaseAdminClient>;

/** Set of service ids owned by this stylist. */
async function ownServiceIds(supabase: Db, stylistId: string): Promise<Set<string>> {
  const { data } = await supabase.from("services").select("id").eq("stylist_id", stylistId);
  return new Set((data ?? []).map((s) => s.id));
}

/** GET variants — all for the caller, or filtered to ?serviceId=. */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const serviceId = new URL(request.url).searchParams.get("serviceId");
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("service_variants")
    .select("*")
    .eq("stylist_id", stylist.id)
    .order("sort_order");
  if (serviceId) query = query.eq("service_id", serviceId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variants: data ?? [] });
}

/** POST create a single variant under a service the caller owns. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const supabase = createSupabaseAdminClient();
  const owned = await ownServiceIds(supabase, stylist.id);
  if (!owned.has(b.serviceId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("service_variants")
    .insert({
      stylist_id: stylist.id,
      service_id: b.serviceId,
      size: b.size ?? null,
      length: b.length ?? null,
      label: b.label,
      price_cents: b.priceCents,
      price_from: b.priceFrom ?? false,
      duration_minutes: b.durationMinutes,
      sort_order: b.sortOrder ?? 99,
      is_active: b.isActive ?? true,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

/**
 * PUT bulk upsert the price table for one service. Rows with an `id` are
 * updated (only if they belong to this service); rows without are inserted.
 */
export async function PUT(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bulkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const supabase = createSupabaseAdminClient();
  const owned = await ownServiceIds(supabase, stylist.id);
  if (!owned.has(b.serviceId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Existing variant ids for this service — guards the updates so a caller
  // can't repoint a foreign variant by passing its id.
  const { data: existing } = await supabase
    .from("service_variants")
    .select("id")
    .eq("service_id", b.serviceId)
    .eq("stylist_id", stylist.id);
  const existingIds = new Set((existing ?? []).map((v) => v.id));

  const inserts = b.variants
    .filter((v) => !v.id)
    .map((v, i) => ({
      stylist_id: stylist.id,
      service_id: b.serviceId,
      size: v.size ?? null,
      length: v.length ?? null,
      label: v.label,
      price_cents: v.priceCents,
      price_from: v.priceFrom ?? false,
      duration_minutes: v.durationMinutes,
      sort_order: v.sortOrder ?? i,
      is_active: v.isActive ?? true,
    }));

  if (inserts.length) {
    const { error } = await supabase.from("service_variants").insert(inserts);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const v of b.variants) {
    if (!v.id || !existingIds.has(v.id)) continue;
    const { error } = await supabase
      .from("service_variants")
      .update({
        size: v.size ?? null,
        length: v.length ?? null,
        label: v.label,
        price_cents: v.priceCents,
        price_from: v.priceFrom ?? false,
        duration_minutes: v.durationMinutes,
        sort_order: v.sortOrder ?? 99,
        is_active: v.isActive ?? true,
      })
      .eq("id", v.id)
      .eq("service_id", b.serviceId)
      .eq("stylist_id", stylist.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** PATCH edit a single variant the caller owns. */
export async function PATCH(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const update: VariantUpdate = {};
  if (b.size !== undefined) update.size = b.size;
  if (b.length !== undefined) update.length = b.length;
  if (b.label !== undefined) update.label = b.label;
  if (b.priceCents !== undefined) update.price_cents = b.priceCents;
  if (b.priceFrom !== undefined) update.price_from = b.priceFrom;
  if (b.durationMinutes !== undefined) update.duration_minutes = b.durationMinutes;
  if (b.sortOrder !== undefined) update.sort_order = b.sortOrder;
  if (b.isActive !== undefined) update.is_active = b.isActive;
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  // Scoping by stylist_id already proves ownership (variant carries stylist_id).
  const { data, error } = await supabase
    .from("service_variants")
    .update(update)
    .eq("id", b.id)
    .eq("stylist_id", stylist.id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** DELETE a variant (soft-deactivates if it has appointment history). */
export async function DELETE(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("service_variants")
    .delete()
    .eq("id", parsed.data.id)
    .eq("stylist_id", stylist.id);
  if (error) {
    if (error.code === "23503") {
      // Referenced by a hold/appointment (FK restrict) -> deactivate instead.
      const { data } = await supabase
        .from("service_variants")
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
