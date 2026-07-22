import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().default(""),
  appointmentId: z.string().uuid().nullable().optional(),
});

/** POST /api/reviews — a logged-in client submits a review (moderated before publishing). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in to leave a review." }, { status: 401 });

  // Find this user's client record with this stylist.
  const { data: client } = await supabase
    .from("clients")
    .select("id,name")
    .eq("user_id", user.id)
    .eq("stylist_id", STYLIST_ID)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: "No client profile found." }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("reviews").insert({
    stylist_id: STYLIST_ID,
    client_id: client.id,
    appointment_id: parsed.data.appointmentId ?? null,
    author_name: client.name,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
    is_published: false, // stylist moderates
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
