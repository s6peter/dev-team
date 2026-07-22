import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const tierSchema = z.object({
  name: z.string().min(1).max(60),
  kind: z.enum(["size", "length", "addon"]),
  priceAddonCents: z.number().int(),
  durationAddon: z.number().int(),
  sortOrder: z.number().int().optional(),
});

const baseFields = {
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  description: z.string().max(2000).optional().nullable(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().min(0).optional(),
  basePriceCents: z.number().int().min(0),
  depositFlatCents: z.number().int().min(0).nullable().optional(),
  requiresDeposit: z.boolean().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  prepNotes: z.string().max(2000).optional().nullable(),
  careNotes: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  tiers: z.array(tierSchema).max(30).optional(),
};
const postSchema = z.object(baseFields);
const patchSchema = z.object({ id: z.string().uuid(), ...baseFields });
const delSchema = z.object({ id: z.string().uuid() });

/** GET all services (incl. inactive) with tiers. */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const [{ data: services }, { data: tiers }] = await Promise.all([
    supabase.from("services").select("*").eq("stylist_id", stylist.id).order("sort_order"),
    supabase.from("service_tiers").select("*").order("sort_order"),
  ]);
  const ids = new Set((services ?? []).map((s) => s.id));
  const byService: Record<string, unknown[]> = {};
  for (const t of tiers ?? []) if (ids.has(t.service_id)) (byService[t.service_id] ??= []).push(t);
  return NextResponse.json({
    services: (services ?? []).map((s) => ({ ...s, tiers: byService[s.id] ?? [] })),
  });
}

async function ensureCategory(stylistId: string, name: string) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("service_categories").insert({ stylist_id: stylistId, name, sort_order: 99 }).select();
  // ignore duplicate errors — category may already exist
}

function serviceRow(stylistId: string, b: z.infer<typeof postSchema>) {
  return {
    stylist_id: stylistId,
    name: b.name,
    category: b.category,
    description: b.description ?? null,
    duration_minutes: b.durationMinutes,
    buffer_minutes: b.bufferMinutes ?? 0,
    base_price: b.basePriceCents,
    deposit_flat_cents: b.depositFlatCents ?? null,
    requires_deposit: b.requiresDeposit ?? true,
    tax_rate: b.taxRate ?? 0.0825,
    prep_notes: b.prepNotes ?? null,
    care_notes: b.careNotes ?? null,
    image_url: b.imageUrl ?? null,
    is_active: b.isActive ?? true,
    sort_order: b.sortOrder ?? 99,
  };
}

async function replaceTiers(serviceId: string, tiers: z.infer<typeof tierSchema>[] | undefined) {
  if (!tiers) return;
  const supabase = createSupabaseAdminClient();
  await supabase.from("service_tiers").delete().eq("service_id", serviceId);
  if (tiers.length) {
    await supabase.from("service_tiers").insert(
      tiers.map((t, i) => ({
        service_id: serviceId,
        name: t.name,
        kind: t.kind,
        price_addon: t.priceAddonCents,
        duration_addon: t.durationAddon,
        sort_order: t.sortOrder ?? i,
      }))
    );
  }
}

/** POST create a service (+tiers). */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  await ensureCategory(stylist.id, parsed.data.category);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("services").insert(serviceRow(stylist.id, parsed.data)).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await replaceTiers(data.id, parsed.data.tiers);
  return NextResponse.json({ ok: true, id: data.id });
}

/** PATCH edit a service (+ replace tiers if provided). */
export async function PATCH(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  await ensureCategory(stylist.id, parsed.data.category);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("services")
    .update(serviceRow(stylist.id, parsed.data))
    .eq("id", parsed.data.id)
    .eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await replaceTiers(parsed.data.id, parsed.data.tiers);
  return NextResponse.json({ ok: true });
}

/** DELETE a service (soft-deactivates if it has appointment history). */
export async function DELETE(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("services").delete().eq("id", parsed.data.id).eq("stylist_id", stylist.id);
  if (error) {
    if (error.code === "23503") {
      // has appointments (FK restrict) -> deactivate instead of hard delete
      await supabase.from("services").update({ is_active: false }).eq("id", parsed.data.id).eq("stylist_id", stylist.id);
      return NextResponse.json({ ok: true, deactivated: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
