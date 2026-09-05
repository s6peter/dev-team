import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** GET — owner lists all staff (stylists). */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stylist.is_owner) return NextResponse.json({ error: "Only the owner can manage staff." }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("stylists").select("id,name,email,phone,bio,instagram,is_owner,user_id").order("is_owner", { ascending: false });
  return NextResponse.json({ staff: data ?? [] });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().default(""),
  bio: z.string().max(2000).optional().default(""),
});

/** POST — owner adds a stylist: creates an auth login + stylist row + starter hours/policy. */
export async function POST(request: Request) {
  const owner = await getAdminStylist();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!owner.is_owner) return NextResponse.json({ error: "Only the owner can add staff." }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { name, email, phone, bio } = parsed.data;

  const supabase = createSupabaseAdminClient();
  // temp password the owner shares with the stylist (they can change later)
  const tempPassword = `Queen${Math.floor(1000 + (Date.now() % 9000))}!`;
  const { data: created, error: authErr } = await supabase.auth.admin.createUser({ email, password: tempPassword, email_confirm: true });
  let userId = created?.user?.id;
  if (authErr && !/registered/i.test(authErr.message)) return NextResponse.json({ error: authErr.message }, { status: 500 });
  if (!userId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list.users.find((u) => u.email === email)?.id;
  }

  const { data: stylist, error: sErr } = await supabase.from("stylists")
    .insert({ name, email, phone: phone || null, bio: bio || null, user_id: userId ?? null, is_owner: false })
    .select("id").single();
  if (sErr) {
    if (sErr.code === "23505") return NextResponse.json({ error: "A stylist with that email already exists." }, { status: 409 });
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  // Starter weekly hours (Tue–Sat 10–18) + a default cancellation policy so they're bookable-ready.
  await supabase.from("availability").insert([2, 3, 4, 5, 6].map((d) => ({ stylist_id: stylist.id, day_of_week: d, start_time: "10:00", end_time: "18:00", is_active: true })));
  await supabase.from("cancellation_policy").insert({ stylist_id: stylist.id, policy_text: "A $50 non-refundable deposit is required to book and is applied toward your service." });

  return NextResponse.json({ ok: true, stylistId: stylist.id, tempPassword });
}
