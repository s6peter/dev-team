import { Resend } from "resend";
import { logNotification } from "@/lib/notification-log";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "QueenG Braids <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Sends an email. In local dev (no RESEND_API_KEY) it logs to the console so the
 * whole flow works without credentials. Returns success boolean.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!resend) {
    console.log(`\n📧 [dev email] → ${to}\n   subject: ${subject}\n   ${text ?? stripHtml(html)}\n`);
    await logNotification({ channel: "email", recipient: to, subject, body: text ?? stripHtml(html), status: "logged" });
    return true;
  }
  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text: text ?? stripHtml(html),
    });
    if (error) {
      console.error("Email send error:", error);
      await logNotification({ channel: "email", recipient: to, subject, body: text ?? stripHtml(html), status: "failed" });
      return false;
    }
    await logNotification({ channel: "email", recipient: to, subject, body: text ?? stripHtml(html), status: "sent" });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
