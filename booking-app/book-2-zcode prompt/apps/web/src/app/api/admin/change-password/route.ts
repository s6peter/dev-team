import { NextResponse } from "next/server";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/change-password — clears the caller's must_change_password flag.
 * The password itself is updated in the browser via auth.updateUser({ password });
 * this endpoint only lowers the flag via the service-role client (the guard trigger
 * blocks the browser from writing must_change_password directly).
 */
export async function POST() {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("stylists")
    .update({ must_change_password: false })
    .eq("id", stylist.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
