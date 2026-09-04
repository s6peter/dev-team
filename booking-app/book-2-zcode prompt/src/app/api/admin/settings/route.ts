import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** GET business profile + cancellation policy. */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data: policy } = await supabase.from("cancellation_policy").select("*").eq("stylist_id", stylist.id).maybeSingle();
  return NextResponse.json({
    profile: { name: stylist.name, email: stylist.email, phone: stylist.phone, bio: stylist.bio, instagram: stylist.instagram },
    policy,
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
    cancelNoticeHours: z.number().int().min(0).max(168),
    rescheduleNoticeHours: z.number().int().min(0).max(168),
    blowDryFeeCents: z.number().int().min(0),
    lateFeeCents: z.number().int().min(0),
    graceMinutes: z.number().int().min(0).max(60),
    policyText: z.string().max(5000),
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
      cancel_notice_hours: p.cancelNoticeHours,
      reschedule_notice_hours: p.rescheduleNoticeHours,
      blow_dry_fee_cents: p.blowDryFeeCents,
      late_fee_cents: p.lateFeeCents,
      grace_minutes: p.graceMinutes,
      policy_text: p.policyText,
    }, { onConflict: "stylist_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
