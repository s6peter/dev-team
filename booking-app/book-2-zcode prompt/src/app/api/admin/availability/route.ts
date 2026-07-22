import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const TIME = /^\d{2}:\d{2}$/;
const putSchema = z.object({
  days: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(TIME),
    endTime: z.string().regex(TIME),
    isActive: z.boolean(),
  })).length(7),
});
const blockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(TIME).nullable().optional(),
  endTime: z.string().regex(TIME).nullable().optional(),
  isAvailable: z.boolean().default(false),
  reason: z.string().max(200).optional(),
});
const delSchema = z.object({ id: z.string().uuid() });

/** GET weekly hours + upcoming overrides. */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: weekly }, { data: overrides }] = await Promise.all([
    supabase.from("availability").select("*").eq("stylist_id", stylist.id).order("day_of_week"),
    supabase.from("availability_overrides").select("*").eq("stylist_id", stylist.id).gte("date", today).order("date"),
  ]);
  return NextResponse.json({ weekly: weekly ?? [], overrides: overrides ?? [] });
}

/** PUT replace weekly hours (upsert all 7 days). */
export async function PUT(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  for (const d of parsed.data.days) {
    if (d.endTime <= d.startTime) return NextResponse.json({ error: `End must be after start (day ${d.dayOfWeek}).` }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("availability").upsert(
    parsed.data.days.map((d) => ({
      stylist_id: stylist.id,
      day_of_week: d.dayOfWeek,
      start_time: d.startTime,
      end_time: d.endTime,
      is_active: d.isActive,
    })),
    { onConflict: "stylist_id,day_of_week" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** POST block a day or a time window (availability override). */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = blockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const b = parsed.data;
  if (b.startTime && b.endTime && b.endTime <= b.startTime) {
    return NextResponse.json({ error: "End must be after start." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("availability_overrides").insert({
    stylist_id: stylist.id,
    date: b.date,
    start_time: b.startTime ?? null,
    end_time: b.endTime ?? null,
    is_available: b.isAvailable,
    reason: b.reason ?? (b.startTime ? "Blocked time" : "Day off"),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE an override (unblock). */
export async function DELETE(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("availability_overrides").delete().eq("id", parsed.data.id).eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
