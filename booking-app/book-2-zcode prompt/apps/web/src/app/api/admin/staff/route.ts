import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** GET — owner lists all staff (stylists). */
export async function GET() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stylist.is_owner) return NextResponse.json({ error: "Only the owner can manage staff." }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("stylists").select("id,name,email,phone,bio,instagram,is_owner,user_id,commission_rate,is_w2,tax_withholding_rate,avatar_url,is_active").order("is_owner", { ascending: false });
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
  // Strong, unguessable temp password the owner shares with the stylist (they change it later).
  const tempPassword = `Qg-${randomBytes(9).toString("base64url")}`;
  const { data: created, error: authErr } = await supabase.auth.admin.createUser({ email, password: tempPassword, email_confirm: true });
  if (authErr) {
    // Don't silently co-opt a pre-existing account (e.g. a client login) as staff,
    // and never hand back a temp password that won't actually work.
    if (/registered/i.test(authErr.message)) {
      return NextResponse.json({ error: "That email already has an account. Use a different email for the new stylist." }, { status: 409 });
    }
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }
  const userId = created?.user?.id;

  const { data: stylist, error: sErr } = await supabase.from("stylists")
    .insert({ name, email, phone: phone || null, bio: bio || null, user_id: userId ?? null, is_owner: false, must_change_password: true })
    .select("id").single();
  if (sErr) {
    if (sErr.code === "23505") return NextResponse.json({ error: "A stylist with that email already exists." }, { status: 409 });
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  // Starter weekly hours (Tue–Sat 10–18) + a default cancellation policy so they're bookable-ready.
  await supabase.from("availability").insert([2, 3, 4, 5, 6].map((d) => ({ stylist_id: stylist.id, day_of_week: d, start_time: "10:00", end_time: "18:00", is_active: true })));
  await supabase.from("cancellation_policy").insert({ stylist_id: stylist.id, policy_text: "A $50 non-refundable deposit is required to book and is applied toward your service." });
  // Clone the owner's catalog so the new stylist is immediately bookable (they can
  // then edit/remove services from their own admin). Best-effort — never blocks add.
  await supabase.rpc("clone_catalog", { p_from: owner.id, p_to: stylist.id }).then(
    () => {},
    (e: unknown) => console.error("clone_catalog failed", e)
  );

  return NextResponse.json({ ok: true, stylistId: stylist.id, tempPassword });
}

const patchSchema = z.object({
  stylistId: z.string().uuid(),
  commission_rate: z.number().min(0).max(1).optional(),
  is_w2: z.boolean().optional(),
  tax_withholding_rate: z.number().min(0).max(1).optional(),
  avatar_url: z.string().url().max(2048).optional(),
  is_active: z.boolean().optional(),
});

/**
 * PATCH — owner edits a stylist's payroll fields (commission %, W2 status, withholding %).
 * These columns are protected by the guard_stylist_owner_flag trigger against the browser
 * (authenticated/anon) role; the service-role client used here bypasses that guard.
 */
export async function PATCH(request: Request) {
  const owner = await getAdminStylist();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!owner.is_owner) return NextResponse.json({ error: "Only the owner can edit staff." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { stylistId, commission_rate, is_w2, tax_withholding_rate, avatar_url, is_active } = parsed.data;
  if (is_active === false && stylistId === owner.id) return NextResponse.json({ error: "You can't suspend your own owner account." }, { status: 400 });

  const update: { commission_rate?: number; is_w2?: boolean; tax_withholding_rate?: number; avatar_url?: string; is_active?: boolean } = {};
  if (commission_rate !== undefined) update.commission_rate = commission_rate;
  if (is_w2 !== undefined) update.is_w2 = is_w2;
  if (tax_withholding_rate !== undefined) update.tax_withholding_rate = tax_withholding_rate;
  if (avatar_url !== undefined) update.avatar_url = avatar_url;
  if (is_active !== undefined) update.is_active = is_active;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("stylists")
    .update(update)
    .eq("id", stylistId)
    .select("id,name,email,phone,bio,instagram,is_owner,user_id,commission_rate,is_w2,tax_withholding_rate,avatar_url,is_active")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stylist: data });
}

const delSchema = z.object({ stylistId: z.string().uuid() });

/**
 * DELETE — owner permanently removes a stylist account. Cascades ALL their data
 * (services, appointments, clients, earnings, etc.) and deletes their auth login.
 * Owner-only; cannot remove yourself or another owner.
 */
export async function DELETE(request: Request) {
  const owner = await getAdminStylist();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!owner.is_owner) return NextResponse.json({ error: "Only the owner can remove staff." }, { status: 403 });
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { stylistId } = parsed.data;
  if (stylistId === owner.id) return NextResponse.json({ error: "You can't remove your own owner account." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: target } = await supabase.from("stylists").select("id,is_owner,user_id").eq("id", stylistId).maybeSingle();
  if (!target) return NextResponse.json({ error: "Stylist not found." }, { status: 404 });
  if (target.is_owner) return NextResponse.json({ error: "You can't remove an owner account." }, { status: 400 });

  // Delete the stylist row — every stylist_id-scoped table cascades on delete.
  const { error } = await supabase.from("stylists").delete().eq("id", stylistId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Best-effort: remove their auth login too (don't fail the request if this errors).
  if (target.user_id) {
    await supabase.auth.admin.deleteUser(target.user_id).catch((e) => console.error("deleteUser failed", e));
  }
  return NextResponse.json({ ok: true });
}
