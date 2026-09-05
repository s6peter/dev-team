import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STYLIST_ID = process.env.NEXT_PUBLIC_STYLIST_ID!;

const schema = z.object({
  stylistId: z.string().uuid().optional(),
  serviceId: z.string().uuid().nullable().optional(),
  tierId: z.string().uuid().nullable().optional(),
  clientName: z.string().min(1).max(120),
  clientEmail: z.string().email(),
  clientPhone: z.string().max(40).optional().default(""),
  desiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  flexibility: z.enum(["exact", "plus_minus_1", "plus_minus_3", "any"]).default("any"),
});

/** POST /api/waitlist — client self-joins the waitlist. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const b = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("waitlist_entries").insert({
    stylist_id: b.stylistId || STYLIST_ID,
    service_id: b.serviceId ?? null,
    service_tier_id: b.tierId ?? null,
    client_name: b.clientName,
    client_email: b.clientEmail,
    client_phone: b.clientPhone || null,
    desired_date: b.desiredDate ?? null,
    flexibility: b.flexibility,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
