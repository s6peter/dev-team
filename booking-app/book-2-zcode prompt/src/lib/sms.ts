import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Sends an SMS. In local dev (no Twilio creds) it logs to the console so the
 * flow works without credentials. Returns success boolean.
 */
export async function sendSMS({ to, body }: { to: string; body: string }): Promise<boolean> {
  if (!client || !fromNumber) {
    console.log(`\n📱 [dev sms] → ${to}\n   ${body}\n`);
    return true;
  }
  try {
    await client.messages.create({ body, from: fromNumber, to });
    return true;
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}
