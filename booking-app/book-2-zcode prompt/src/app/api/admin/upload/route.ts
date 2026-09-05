import { NextResponse } from "next/server";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** POST /api/admin/upload (multipart 'file') — admin uploads a photo to the public
 *  gallery bucket and gets back a public URL for a service card or portfolio item. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_BYTES + 1024) return NextResponse.json({ error: "Image exceeds size limit" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image exceeds 8MB" }, { status: 413 });

  const supabase = createSupabaseAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${stylist.id}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage.from("gallery").upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from("gallery").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
