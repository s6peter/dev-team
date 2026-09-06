import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().min(1).max(3000),
});

/** POST /api/contact — emails the salon owner the contact-form message. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { name, email, message } = parsed.data;

  const ok = await sendEmail({
    to: SITE.email,
    subject: `New message from ${name} via ${SITE.shortName}`,
    html: `<p><strong>${name}</strong> (${email}) wrote:</p><p>${message.replace(/\n/g, "<br/>")}</p>`,
    text: `${name} (${email}): ${message}`,
  });
  if (!ok) return NextResponse.json({ error: "Could not send. Please call us." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
