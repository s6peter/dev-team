import { sendEmail } from "./email";
import { sendSMS } from "./sms";
import { formatCents } from "@/lib/pricing";
import { formatDateLabel, formatTimeLabel } from "@/lib/time";

const BRAND = "QueenG Braids & Essentials";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456";

function shell(title: string, body: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="background:#db2777;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:18px">${BRAND}</h1>
    </div>
    <div style="border:1px solid #f3d7e6;border-top:0;padding:24px;border-radius:0 0 12px 12px">
      <h2 style="margin:0 0 12px;font-size:20px">${title}</h2>
      ${body}
    </div>
  </div>`;
}

export interface ApptNotice {
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  depositCents?: number;
  balanceCents?: number;
  manageToken?: string | null;
  stylistId?: string | null;
  stylistName?: string | null;
}

const when = (a: ApptNotice) => `${formatDateLabel(a.date)} at ${formatTimeLabel(a.startTime)}`;
const manageLink = (a: ApptNotice) =>
  a.manageToken
    ? `<p><a href="${APP_URL}/manage/${a.manageToken}" style="color:#db2777">Reschedule or cancel →</a></p>
       <p><a href="${APP_URL}/api/ics/${a.manageToken}" style="color:#db2777">Add to calendar →</a></p>`
    : "";

/** Instant "deposit received, pending approval" confirmation. */
export async function notifyBookingReceived(a: ApptNotice) {
  const body = `<p>Hi ${a.clientName},</p>
    <p>We received your booking request and your deposit${
      a.depositCents ? ` of <strong>${formatCents(a.depositCents)}</strong>` : ""
    }. 🎉</p>
    <p><strong>${a.serviceName}</strong><br/>${when(a)}</p>
    <p>Your appointment is <strong>pending approval</strong> — ${a.stylistName || BRAND} will confirm shortly.
    ${a.balanceCents ? `The remaining balance of <strong>${formatCents(a.balanceCents)}</strong> is due in person.` : ""}</p>
    <p>Please arrive with hair washed, blow-dried and detangled.</p>
    <p><a href="${APP_URL}/account" style="color:#db2777">View your appointment →</a></p>
    ${manageLink(a)}`;
  await Promise.all([
    sendEmail({ to: a.clientEmail, stylistId: a.stylistId, subject: "We got your booking request!", html: shell("Booking request received", body) }),
    a.clientPhone
      ? sendSMS({ to: a.clientPhone, stylistId: a.stylistId, body: `${BRAND}: Deposit received for ${a.serviceName} on ${a.date} at ${formatTimeLabel(a.startTime)}. Pending approval — we'll confirm soon!` })
      : Promise.resolve(true),
  ]);
}

export async function notifyConfirmed(a: ApptNotice) {
  const body = `<p>Hi ${a.clientName},</p>
    <p>Great news — your appointment is <strong>confirmed</strong>! ✅</p>
    <p><strong>${a.serviceName}</strong><br/>${when(a)}</p>
    ${a.balanceCents ? `<p>Balance due in person: <strong>${formatCents(a.balanceCents)}</strong></p>` : ""}
    <p>See you soon!</p>
    ${manageLink(a)}`;
  await Promise.all([
    sendEmail({ to: a.clientEmail, stylistId: a.stylistId, subject: "Your appointment is confirmed!", html: shell("Appointment confirmed", body) }),
    a.clientPhone ? sendSMS({ to: a.clientPhone, stylistId: a.stylistId, body: `${BRAND}: Your ${a.serviceName} on ${a.date} at ${formatTimeLabel(a.startTime)} is CONFIRMED. See you then!` }) : Promise.resolve(true),
  ]);
}

export async function notifyDeclined(a: ApptNotice, refunded: boolean) {
  const body = `<p>Hi ${a.clientName},</p>
    <p>Unfortunately we can't accommodate your ${a.serviceName} appointment on ${when(a)}.</p>
    ${refunded ? `<p>Your deposit has been <strong>refunded</strong> in full.</p>` : ""}
    <p>Please <a href="${APP_URL}/book" style="color:#db2777">pick another time</a> — we'd love to have you.</p>`;
  await Promise.all([
    sendEmail({ to: a.clientEmail, stylistId: a.stylistId, subject: "Appointment update", html: shell("Appointment update", body) }),
    a.clientPhone ? sendSMS({ to: a.clientPhone, stylistId: a.stylistId, body: `${BRAND}: We couldn't accommodate your ${a.date} appointment.${refunded ? " Your deposit was refunded." : ""} Please rebook.` }) : Promise.resolve(true),
  ]);
}

export async function notifyRescheduled(a: ApptNotice) {
  const body = `<p>Hi ${a.clientName},</p>
    <p>Your appointment has been <strong>rescheduled</strong>. ✅</p>
    <p><strong>${a.serviceName}</strong><br/>New time: ${when(a)}</p>
    ${a.balanceCents ? `<p>Balance due in person: <strong>${formatCents(a.balanceCents)}</strong></p>` : ""}
    <p>See you then!</p>
    ${manageLink(a)}`;
  await Promise.all([
    sendEmail({ to: a.clientEmail, stylistId: a.stylistId, subject: "Your appointment was rescheduled", html: shell("Appointment rescheduled", body) }),
    a.clientPhone ? sendSMS({ to: a.clientPhone, stylistId: a.stylistId, body: `${BRAND}: Your ${a.serviceName} is now ${a.date} at ${formatTimeLabel(a.startTime)}. See you then!` }) : Promise.resolve(true),
  ]);
}

export async function notifyCancelled(a: ApptNotice, refunded = false) {
  const body = `<p>Hi ${a.clientName},</p>
    <p>Your <strong>${a.serviceName}</strong> appointment on ${when(a)} has been <strong>cancelled</strong>.</p>
    ${refunded ? `<p>Your deposit has been <strong>refunded</strong> in full.</p>` : ""}
    <p>We'd love to see you again — <a href="${APP_URL}/book" style="color:#db2777">book a new time</a>.</p>`;
  await Promise.all([
    sendEmail({ to: a.clientEmail, stylistId: a.stylistId, subject: "Your appointment was cancelled", html: shell("Appointment cancelled", body) }),
    a.clientPhone ? sendSMS({ to: a.clientPhone, stylistId: a.stylistId, body: `${BRAND}: Your ${a.serviceName} on ${a.date} at ${formatTimeLabel(a.startTime)} was cancelled.${refunded ? " Deposit refunded." : ""}` }) : Promise.resolve(true),
  ]);
}

export async function notifyReminder(a: ApptNotice, kind: "24h" | "2h") {
  const lead = kind === "24h" ? "tomorrow" : "in about 2 hours";
  const body = `<p>Hi ${a.clientName},</p>
    <p>Reminder: your <strong>${a.serviceName}</strong> appointment is ${lead}.</p>
    <p>${when(a)}</p>
    <p>Please arrive with clean, detangled, blow-dried hair.
    ${a.balanceCents ? `Balance due in person: <strong>${formatCents(a.balanceCents)}</strong>.` : ""}</p>
    <p>Need to change it? <a href="${a.manageToken ? `${APP_URL}/manage/${a.manageToken}` : `${APP_URL}/account`}" style="color:#db2777">Manage your appointment →</a></p>`;
  await Promise.all([
    sendEmail({ to: a.clientEmail, stylistId: a.stylistId, subject: `Reminder: your appointment is ${lead}`, html: shell("Appointment reminder", body) }),
    a.clientPhone ? sendSMS({ to: a.clientPhone, stylistId: a.stylistId, body: `${BRAND} reminder: ${a.serviceName} ${lead} (${a.date} ${formatTimeLabel(a.startTime)}). Arrive with clean, blow-dried hair!` }) : Promise.resolve(true),
  ]);
}

export async function notifyReviewRequest(a: ApptNotice) {
  const body = `<p>Hi ${a.clientName},</p>
    <p>Thank you for visiting ${BRAND}! We hope you love your ${a.serviceName}. 💕</p>
    <p>Would you leave a quick review? It means the world to a small business.</p>
    <p><a href="${APP_URL}/account?review=1" style="background:#db2777;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Leave a review →</a></p>`;
  await sendEmail({ to: a.clientEmail, stylistId: a.stylistId, subject: "How was your visit?", html: shell("We'd love your feedback", body) });
}
