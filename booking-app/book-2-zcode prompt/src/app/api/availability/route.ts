import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateSlots, type WeeklyHours, type Override } from "@/lib/availability";
import { addDays, nowInSalonTz } from "@/lib/time";

const STYLIST_ID_DEFAULT = process.env.NEXT_PUBLIC_STYLIST_ID!;

/**
 * GET /api/availability?date=YYYY-MM-DD&serviceId=..&tierId=..
 * Duration-aware, conflict-safe open slots. Reads busy ranges from active
 * appointments + live holds (service role, since holds are RLS-locked).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const tierId = searchParams.get("tierId");
  const stylistId = searchParams.get("stylistId") || STYLIST_ID_DEFAULT;

  if (!date || !serviceId) {
    return NextResponse.json({ error: "date and serviceId are required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  await supabase.rpc("cleanup_expired_holds");

  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes,buffer_minutes")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // `minutes` (total work minutes incl. selected size/length/add-ons) wins when
  // provided by the wizard; otherwise fall back to service + single tier.
  const minutesParam = searchParams.get("minutes");
  let serviceMinutes: number;
  if (minutesParam && Number.isFinite(Number(minutesParam))) {
    serviceMinutes = Number(minutesParam) + service.buffer_minutes;
  } else {
    serviceMinutes = service.duration_minutes + service.buffer_minutes;
    if (tierId) {
      const { data: tier } = await supabase
        .from("service_tiers")
        .select("duration_addon")
        .eq("id", tierId)
        .maybeSingle();
      if (tier) serviceMinutes += tier.duration_addon;
    }
  }

  const [{ data: weekly }, { data: overrides }, { data: appts }, { data: holds }] =
    await Promise.all([
      supabase.from("availability").select("day_of_week,start_time,end_time,is_active").eq("stylist_id", stylistId),
      supabase.from("availability_overrides").select("date,start_time,end_time,is_available").eq("stylist_id", stylistId).eq("date", date),
      supabase.from("appointments").select("start_time,end_time").eq("stylist_id", stylistId).eq("date", date).in("status", ["pending", "confirmed"]),
      supabase.from("slot_holds").select("start_time,end_time").eq("stylist_id", stylistId).eq("date", date).gt("expires_at", new Date().toISOString()),
    ]);

  const result = generateSlots({
    dateStr: date,
    weekly: (weekly ?? []) as WeeklyHours[],
    overrides: (overrides ?? []) as Override[],
    busy: [...(appts ?? []), ...(holds ?? [])],
    serviceMinutes,
  });

  return NextResponse.json(result);
}

/** GET-friendly month scan lives client-side; expose window bounds for the calendar. */
export async function POST(request: Request) {
  const { serviceId, tierId, stylistId } = await request.json();
  if (!serviceId) return NextResponse.json({ error: "serviceId required" }, { status: 400 });
  const now = nowInSalonTz();
  return NextResponse.json({
    firstBookable: now.dateStr,
    lastBookable: addDays(now.dateStr, 60),
    stylistId: stylistId || STYLIST_ID_DEFAULT,
  });
}
