import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Stylist = Database["public"]["Tables"]["stylists"]["Row"];

/** Returns the current auth user, or null. */
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the stylist row IFF the logged-in user is the admin, else null. */
export async function getAdminStylist(): Promise<Stylist | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("stylists")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return data ?? null;
}
