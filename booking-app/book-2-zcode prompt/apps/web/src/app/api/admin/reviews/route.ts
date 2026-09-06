import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

const patchSchema = z.object({
  reviewId: z.string().uuid(),
  isPublished: z.boolean().optional(),
  response: z.string().max(1000).optional(),
});

/** GET all reviews for the stylist (published + pending) for moderation. */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("stylist_id", stylist.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ reviews: data ?? [] });
}

/** PATCH publish/unpublish or add a stylist response. */
export async function PATCH(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const update: Database["public"]["Tables"]["reviews"]["Update"] = {};
  if (parsed.data.isPublished !== undefined) update.is_published = parsed.data.isPublished;
  if (parsed.data.response !== undefined) update.stylist_response = parsed.data.response;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("reviews")
    .update(update)
    .eq("id", parsed.data.reviewId)
    .eq("stylist_id", stylist.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
