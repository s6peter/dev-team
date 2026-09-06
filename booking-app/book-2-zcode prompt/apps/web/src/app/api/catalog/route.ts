import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

/**
 * Public booking catalog (v3 grouped shape):
 *   { stylist, policy, openDays, groups:[{ …, services:[{ …, variants:[…] }] }] }
 * Active rows only, everything ordered by sort_order.
 */
export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const stylistId = new URL(request.url).searchParams.get("stylistId") || STYLIST_ID;

  const [{ data: groups }, { data: services }, { data: variants }, { data: stylist }, { data: policy }, { data: avail }] =
    await Promise.all([
      supabase
        .from("service_groups")
        .select("id,name,slug,kind,description,image_url,sort_order")
        .eq("stylist_id", stylistId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("services")
        .select("*")
        .eq("stylist_id", stylistId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("service_variants")
        .select("id,service_id,size,length,label,price_cents,price_from,duration_minutes,sort_order")
        .eq("stylist_id", stylistId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("stylists").select("id,name,bio,phone,instagram,avatar_url").eq("id", stylistId).maybeSingle(),
      supabase.from("cancellation_policy").select("*").eq("stylist_id", stylistId).maybeSingle(),
      supabase.from("availability").select("day_of_week,is_active").eq("stylist_id", stylistId),
    ]);

  const openDays = (avail ?? []).filter((a) => a.is_active).map((a) => a.day_of_week);

  // Bucket active variants under their service.
  const variantsByService = new Map<string, typeof variants>();
  for (const v of variants ?? []) {
    const list = variantsByService.get(v.service_id);
    if (list) list.push(v);
    else variantsByService.set(v.service_id, [v]);
  }

  // Shape each service with its variants.
  const shapedServices = (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    duration_minutes: s.duration_minutes,
    buffer_minutes: s.buffer_minutes,
    base_price: s.base_price,
    deposit_percent: s.deposit_percent,
    deposit_flat_cents: s.deposit_flat_cents,
    requires_deposit: s.requires_deposit,
    tax_rate: s.tax_rate,
    image_url: s.image_url,
    prep_notes: s.prep_notes,
    care_notes: s.care_notes,
    group_id: s.group_id,
    variants: (variantsByService.get(s.id) ?? []).map((v) => ({
      id: v.id,
      size: v.size,
      length: v.length,
      label: v.label,
      price_cents: v.price_cents,
      price_from: v.price_from,
      duration_minutes: v.duration_minutes,
    })),
  }));

  // Bucket services under their group (authoritative link is services.group_id).
  const servicesByGroup = new Map<string, typeof shapedServices>();
  for (const s of shapedServices) {
    if (!s.group_id) continue;
    const list = servicesByGroup.get(s.group_id);
    if (list) list.push(s);
    else servicesByGroup.set(s.group_id, [s]);
  }

  const shapedGroups = (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    kind: g.kind,
    description: g.description,
    image_url: g.image_url,
    sort_order: g.sort_order,
    services: servicesByGroup.get(g.id) ?? [],
  }));

  return NextResponse.json({
    stylist,
    policy,
    openDays,
    groups: shapedGroups,
  });
}
