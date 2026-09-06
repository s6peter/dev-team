import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456";

/** GET business profile + cancellation policy. */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data: policy } = await supabase.from("cancellation_policy").select("*").eq("stylist_id", stylist.id).maybeSingle();
  // Workplace geofence lives on the OWNER's row (the single business location).
  const { data: owner } = await supabase
    .from("stylists")
    .select("workplace_lat, workplace_lng, workplace_radius_m")
    .eq("is_owner", true)
    .maybeSingle();
  return NextResponse.json({
    profile: { name: stylist.name, email: stylist.email, phone: stylist.phone, bio: stylist.bio, instagram: stylist.instagram },
    policy,
    isOwner: stylist.is_owner,
    workplace: {
      lat: owner?.workplace_lat ?? null,
      lng: owner?.workplace_lng ?? null,
      radius_m: owner?.workplace_radius_m ?? 150,
    },
    calendarFeedUrl: `${APP_URL}/api/calendar/${stylist.calendar_feed_token}.ics`,
  });
}

const putSchema = z.object({
  profile: z.object({
    name: z.string().min(1).max(120),
    phone: z.string().max(40).nullable().optional(),
    bio: z.string().max(2000).nullable().optional(),
    instagram: z.string().max(60).nullable().optional(),
  }).optional(),
  policy: z.object({
    depositCents: z.number().int().min(0).max(1000000),
    cancelNoticeHours: z.number().int().min(0).max(168),
    rescheduleNoticeHours: z.number().int().min(0).max(168),
    blowDryFeeCents: z.number().int().min(0),
    lateFeeCents: z.number().int().min(0),
    graceMinutes: z.number().int().min(0).max(60),
    policyText: z.string().max(5000),
  }).optional(),
  workplace: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusM: z.number().int().min(10).max(5000),
  }).optional(),
});

/** PUT update profile and/or policy. */
export async function PUT(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const supabase = createSupabaseAdminClient();

  if (parsed.data.profile) {
    const p = parsed.data.profile;
    const { error } = await supabase.from("stylists")
      .update({ name: p.name, phone: p.phone ?? null, bio: p.bio ?? null, instagram: p.instagram ?? null })
      .eq("id", stylist.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (parsed.data.policy) {
    const p = parsed.data.policy;
    const { error } = await supabase.from("cancellation_policy").upsert({
      stylist_id: stylist.id,
      deposit_cents: p.depositCents,
      cancel_notice_hours: p.cancelNoticeHours,
      reschedule_notice_hours: p.rescheduleNoticeHours,
      blow_dry_fee_cents: p.blowDryFeeCents,
      late_fee_cents: p.lateFeeCents,
      grace_minutes: p.graceMinutes,
      policy_text: p.policyText,
    }, { onConflict: "stylist_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Propagate the deposit to every service so the booking display + hold_slot
    // (which read services.deposit_flat_cents) reflect the new amount immediately.
    const { error: depErr } = await supabase
      .from("services")
      .update({ deposit_flat_cents: p.depositCents })
      .eq("stylist_id", stylist.id)
      .eq("requires_deposit", true);
    if (depErr) return NextResponse.json({ error: depErr.message }, { status: 500 });
  }
  if (parsed.data.workplace) {
    // The geofence is business-wide and protected — only the owner may set it,
    // and it is persisted on the owner's row (the single business location).
    if (!stylist.is_owner) {
      return NextResponse.json({ error: "Only the owner can set the workplace location." }, { status: 403 });
    }
    const w = parsed.data.workplace;
    const { error } = await supabase
      .from("stylists")
      .update({ workplace_lat: w.lat, workplace_lng: w.lng, workplace_radius_m: w.radiusM })
      .eq("is_owner", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
