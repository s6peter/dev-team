// Local dev bootstrap: create the inspiration-photos storage bucket and a real
// admin auth user linked to the seeded stylist. Run after `supabase start`.
//   node scripts/setup-local.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const STYLIST_ID = env.NEXT_PUBLIC_STYLIST_ID;
const ADMIN_EMAIL = "queengbraids@gmail.com";
const ADMIN_PASSWORD = "QueenG!admin2026";

const supabase = createClient(url, service, { auth: { persistSession: false } });

async function main() {
  // 1. Storage bucket for inspiration photos (public read).
  const { error: bucketErr } = await supabase.storage.createBucket("inspiration", {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  });
  if (bucketErr && !/already exists/i.test(bucketErr.message)) throw bucketErr;
  console.log("✓ storage bucket 'inspiration' ready");

  const { error: galleryErr } = await supabase.storage.createBucket("gallery", {
    public: true,
    fileSizeLimit: "8MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  });
  if (galleryErr && !/already exists/i.test(galleryErr.message)) throw galleryErr;
  console.log("✓ storage bucket 'gallery' ready");

  // 2. Admin auth user, confirmed, linked to the stylist row.
  let userId;
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (createErr && !/already been registered/i.test(createErr.message)) throw createErr;
  if (created?.user) {
    userId = created.user.id;
  } else {
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list.users.find((u) => u.email === ADMIN_EMAIL)?.id;
  }
  if (!userId) throw new Error("could not resolve admin user id");

  const { error: linkErr } = await supabase
    .from("stylists")
    .update({ user_id: userId })
    .eq("id", STYLIST_ID);
  if (linkErr) throw linkErr;

  console.log("✓ admin user linked to stylist");
  // Second stylist (multi-staff demo)
  const STAFF_EMAIL = "bianca@queengbraids.com";
  const STAFF_PW = "Bianca!staff2026";
  const { data: staff, error: staffErr } = await supabase.auth.admin.createUser({ email: STAFF_EMAIL, password: STAFF_PW, email_confirm: true });
  if (staffErr && !/registered/i.test(staffErr.message)) throw staffErr;
  let staffId = staff?.user?.id;
  if (!staffId) { const { data: l } = await supabase.auth.admin.listUsers(); staffId = l.users.find((u) => u.email === STAFF_EMAIL)?.id; }
  if (staffId) await supabase.from("stylists").update({ user_id: staffId }).eq("id", "33333333-3333-3333-3333-333333333333");
  console.log("\u2713 staff stylist (Bianca) linked");

  console.log("\n  Admin login:");
  console.log("    email:    " + ADMIN_EMAIL);
  console.log("    password: " + ADMIN_PASSWORD);
}

main().catch((e) => {
  console.error("setup failed:", e.message ?? e);
  process.exit(1);
});
