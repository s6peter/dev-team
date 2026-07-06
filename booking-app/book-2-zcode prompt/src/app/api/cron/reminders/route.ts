import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = {
    confirmation24h: 0,
    reminder2h: 0,
    errors: [] as string[],
  };

  // Get appointments for tomorrow (24h reminder)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: appointments24h } = await supabase
    .from("appointments")
    .select("*, service:services(*), client:clients(*)")
    .eq("date", tomorrowStr)
    .eq("status", "confirmed");

  if (appointments24h) {
    for (const appointment of appointments24h) {
      try {
        // Send 24h confirmation email
        if (appointment.client?.email) {
          await sendEmail({
            to: appointment.client.email,
            subject: "Appointment Reminder - Tomorrow",
            html: `
              <h1>Appointment Reminder</h1>
              <p>Hi ${appointment.client.name},</p>
              <p>This is a friendly reminder that you have an appointment tomorrow:</p>
              <ul>
                <li><strong>Service:</strong> ${appointment.service.name}</li>
                <li><strong>Date:</strong> ${appointment.date}</li>
                <li><strong>Time:</strong> ${appointment.start_time}</li>
              </ul>
              <p>Please arrive 10 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.</p>
              <p>See you tomorrow!</p>
              <p>Best regards,<br/>QueenG Braids</p>
            `,
          });
        }

        // Send SMS reminder
        if (appointment.client?.phone) {
          await sendSMS({
            to: appointment.client.phone,
            body: `QueenG Braids Reminder: You have a ${appointment.service.name} appointment tomorrow at ${appointment.start_time}. See you there!`,
          });
        }

        results.confirmation24h++;
      } catch (error) {
        results.errors.push(`24h reminder failed for ${appointment.id}: ${error}`);
      }
    }
  }

  // Get appointments in 2 hours
  const twoHoursLater = new Date(now);
  twoHoursLater.setHours(twoHoursLater.getHours() + 2);
  const twoHoursStr = twoHoursLater.toISOString().split("T")[0];
  const twoHoursTime = twoHoursLater.toTimeString().slice(0, 5);

  const { data: appointments2h } = await supabase
    .from("appointments")
    .select("*, service:services(*), client:clients(*)")
    .eq("date", twoHoursStr)
    .eq("status", "confirmed");

  if (appointments2h) {
    for (const appointment of appointments2h) {
      // Check if appointment is within 2-hour window
      const appointmentTime = appointment.start_time.slice(0, 5);
      const timeDiff =
        (parseInt(appointmentTime.split(":")[0]) * 60 +
          parseInt(appointmentTime.split(":")[1])) -
        (parseInt(twoHoursTime.split(":")[0]) * 60 +
          parseInt(twoHoursTime.split(":")[1]));

      if (timeDiff >= 0 && timeDiff <= 120) {
        try {
          // Send 2h SMS reminder
          if (appointment.client?.phone) {
            await sendSMS({
              to: appointment.client.phone,
              body: `QueenG Braids: Your appointment starts in 2 hours! We look forward to seeing you at ${appointment.start_time}.`,
            });
          }

          results.reminder2h++;
        } catch (error) {
          results.errors.push(`2h reminder failed for ${appointment.id}: ${error}`);
        }
      }
    }
  }

  return NextResponse.json(results);
}
