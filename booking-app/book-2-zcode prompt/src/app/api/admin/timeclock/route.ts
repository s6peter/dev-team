import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Geofenced clock in/out + owner timesheets.
 *
 * The single business location lives on the OWNER's stylists row
 * (workplace_lat / workplace_lng / workplace_radius_m). Distance is validated
 * here on the server (authoritative) in addition to the client-side UX check.
 * All writes use the service-role client, scoped to getAdminStylist().id — a
 * stylist can only ever punch or read their own entries; only the owner may
 * read every stylist's entries or edit an entry.
 */

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance between two lat/lng points, in metres. */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

interface Workplace {
  lat: number | null;
  lng: number | null;
  radius: number;
}

/** Fetch the owner row's workplace location (the single business location). */
async function getWorkplace(
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<Workplace> {
  const { data } = await supabase
    .from("stylists")
    .select("workplace_lat, workplace_lng, workplace_radius_m")
    .eq("is_owner", true)
    .maybeSingle();
  return {
    lat: data?.workplace_lat ?? null,
    lng: data?.workplace_lng ?? null,
    radius: data?.workplace_radius_m ?? 150,
  };
}

/**
 * GET — caller's recent entries + workplace meta.
 * `?scope=all` (owner only) returns every stylist's entries with names.
 */
export async function GET(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const scope = new URL(request.url).searchParams.get("scope");

  if (scope === "all") {
    if (!stylist.is_owner) {
      return NextResponse.json({ error: "Only the owner can view all timesheets." }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("time_entries")
      .select("*, stylist:stylists(id,name)")
      .order("clock_in", { ascending: false })
      .limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries: data ?? [] });
  }

  const [entriesRes, workplace] = await Promise.all([
    supabase
      .from("time_entries")
      .select("*")
      .eq("stylist_id", stylist.id)
      .order("clock_in", { ascending: false })
      .limit(50),
    getWorkplace(supabase),
  ]);
  if (entriesRes.error) return NextResponse.json({ error: entriesRes.error.message }, { status: 500 });

  return NextResponse.json({
    entries: entriesRes.data ?? [],
    workplaceSet: workplace.lat !== null && workplace.lng !== null,
    workplace_lat: workplace.lat,
    workplace_lng: workplace.lng,
    workplace_radius_m: workplace.radius,
  });
}

const postSchema = z.object({
  action: z.enum(["in", "out"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** POST — geofenced clock in/out for the caller. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { action, lat, lng } = parsed.data;

  const supabase = createSupabaseAdminClient();
  const workplace = await getWorkplace(supabase);

  if (workplace.lat === null || workplace.lng === null) {
    return NextResponse.json(
      { error: "workplace_unset", message: "No workplace location set. Ask the owner to set it in Settings." },
      { status: 400 }
    );
  }

  const distance = haversineMeters(lat, lng, workplace.lat, workplace.lng);
  if (distance > workplace.radius) {
    return NextResponse.json(
      {
        error: "not_at_workplace",
        message: `You must be at the workplace to clock ${action === "in" ? "in" : "out"} (you are ${Math.round(distance)}m away, limit ${workplace.radius}m).`,
      },
      { status: 403 }
    );
  }

  // Latest open entry for this caller, if any.
  const { data: openEntry, error: openErr } = await supabase
    .from("time_entries")
    .select("id")
    .eq("stylist_id", stylist.id)
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (openErr) return NextResponse.json({ error: openErr.message }, { status: 500 });

  const nowIso = new Date().toISOString();

  if (action === "in") {
    if (openEntry) {
      return NextResponse.json(
        { error: "already_clocked_in", message: "You are already clocked in." },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        stylist_id: stylist.id,
        clock_in: nowIso,
        clock_in_lat: lat,
        clock_in_lng: lng,
        source: "geo",
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, entry: data });
  }

  // action === "out"
  if (!openEntry) {
    return NextResponse.json(
      { error: "not_clocked_in", message: "You are not clocked in." },
      { status: 400 }
    );
  }
  const { data, error } = await supabase
    .from("time_entries")
    .update({ clock_out: nowIso, clock_out_lat: lat, clock_out_lng: lng, updated_at: nowIso })
    .eq("id", openEntry.id)
    .eq("stylist_id", stylist.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, entry: data });
}

const patchSchema = z.object({
  entryId: z.string().uuid(),
  clockIn: z.string().datetime({ offset: true }),
  clockOut: z.string().datetime({ offset: true }).nullable(),
});

/** PATCH — owner edits an entry's times (source flips to 'admin'). */
export async function PATCH(request: Request) {
  const owner = await getAdminStylist();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!owner.is_owner) {
    return NextResponse.json({ error: "Only the owner can edit timesheets." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { entryId, clockIn, clockOut } = parsed.data;

  if (clockOut !== null && new Date(clockOut).getTime() <= new Date(clockIn).getTime()) {
    return NextResponse.json({ error: "Clock-out must be after clock-in." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("time_entries")
    .update({
      clock_in: clockIn,
      clock_out: clockOut,
      source: "admin",
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .select("*, stylist:stylists(id,name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, entry: data });
}
