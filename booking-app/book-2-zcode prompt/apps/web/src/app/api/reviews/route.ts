import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const admin = createSupabaseAdminClient();

  // Attribute the review to the correct stylist. If the review is tied to an
  // appointment, derive the stylist from it (and verify the client owns it);
  // otherwise fall back to this user's client profile (any stylist).
  let stylistId: string;
  let clientId: string;
  let authorName: string;

  if (parsed.data.appointmentId) {
    const { data: appt } = await admin
      .from("appointments")
      .select("stylist_id,client:clients(id,name,user_id)")
      .eq("id", parsed.data.appointmentId)
      .maybeSingle();
    const c = appt?.client as unknown as { id: string; name: string; user_id: string | null } | null;
    if (!appt || !c || c.user_id !== user.id) {
      return NextResponse.json({ error: "No matching appointment found." }, { status: 403 });
    }
    stylistId = appt.stylist_id;
    clientId = c.id;
    authorName = c.name;
  } else {
    const { data: client } = await admin
      .from("clients")
      .select("id,name,stylist_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!client) return NextResponse.json({ error: "No client profile found." }, { status: 403 });
    stylistId = client.stylist_id;
    clientId = client.id;
    authorName = client.name;
  }

  const { error } = await admin.from("reviews").insert({
    stylist_id: stylistId,
    client_id: clientId,
    appointment_id: parsed.data.appointmentId ?? null,
    author_name: authorName,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
    is_published: false, // stylist moderates
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
