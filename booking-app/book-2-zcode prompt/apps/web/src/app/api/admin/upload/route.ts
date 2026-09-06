import { NextResponse } from "next/server";
import { getAdminStylist } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_IMAGE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO = 50 * 1024 * 1024; // 50MB (short product clips)
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/** POST /api/admin/upload (multipart 'file') — admin uploads a photo OR a short
 *  video to the public gallery bucket and gets back a public URL. */
export async function POST(request: Request) {
  const stylist = await getAdminStylist();
  if (!stylist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Early gate on the larger (video) limit so big images still get a clean 413.
  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_VIDEO + 1024) return NextResponse.json({ error: "File exceeds size limit" }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Unsupported file type (images or mp4/webm/mov video)" }, { status: 415 });
  }
  const max = isVideo ? MAX_VIDEO : MAX_IMAGE;
  if (file.size > max) {
    return NextResponse.json({ error: `File exceeds ${isVideo ? "50MB" : "8MB"}` }, { status: 413 });
  }

  const supabase = createSupabaseAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (isVideo ? "mp4" : "jpg");
  const path = `${stylist.id}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage.from("gallery").upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from("gallery").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, kind: isVideo ? "video" : "image" });
}
