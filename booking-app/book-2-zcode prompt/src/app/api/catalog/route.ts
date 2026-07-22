import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

/** Public booking catalog: active services (+ tiers), stylist, cancellation policy. */
export async function GET() {
  const supabase = createSupabaseServerClient();

  const [{ data: services }, { data: tiers }, { data: stylist }, { data: policy }, { data: avail }] =
    await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("stylist_id", STYLIST_ID)
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("service_tiers").select("*").order("sort_order"),
      supabase.from("stylists").select("id,name,bio,phone,instagram,avatar_url").eq("id", STYLIST_ID).maybeSingle(),
      supabase.from("cancellation_policy").select("*").eq("stylist_id", STYLIST_ID).maybeSingle(),
      supabase.from("availability").select("day_of_week,is_active").eq("stylist_id", STYLIST_ID),
    ]);

  const openDays = (avail ?? []).filter((a) => a.is_active).map((a) => a.day_of_week);

  const serviceIds = new Set((services ?? []).map((s) => s.id));
  const tiersByService: Record<string, typeof tiers> = {};
  for (const t of tiers ?? []) {
    if (!serviceIds.has(t.service_id)) continue;
    (tiersByService[t.service_id] ??= []).push(t);
  }

  return NextResponse.json({
    stylist,
    policy,
    openDays,
    services: (services ?? []).map((s) => ({ ...s, tiers: tiersByService[s.id] ?? [] })),
  });
}
