import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("appointments")
    .select("*, service:services(*), client:clients(*)")
    .order("date", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { appointmentId, action } = body;

  // Get appointment details
  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select("*, service:services(*), client:clients(*)")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  let newStatus: string;
  let emailSubject: string;
  let emailBody: string;
  let smsBody: string | null = null;

  switch (action) {
    case "confirm":
      newStatus = "confirmed";
      emailSubject = "Your appointment has been confirmed!";
      emailBody = `
        <h1>Appointment Confirmed</h1>
        <p>Hi ${appointment.client.name},</p>
        <p>Your appointment for ${appointment.service.name} on ${appointment.date} at ${appointment.start_time} has been confirmed.</p>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br/>QueenG Braids</p>
      `;
      smsBody = `QueenG Braids: Your appointment for ${appointment.service.name} on ${appointment.date} at ${appointment.start_time} has been confirmed!`;
      break;

    case "decline":
      newStatus = "declined";
      emailSubject = "Appointment update";
      emailBody = `
        <h1>Appointment Update</h1>
        <p>Hi ${appointment.client.name},</p>
        <p>We're sorry, but we're unable to accommodate your appointment for ${appointment.service.name} on ${appointment.date} at ${appointment.start_time}.</p>
        <p>Please contact us to reschedule or visit our booking page.</p>
        <p>We apologize for the inconvenience.</p>
        <p>Best regards,<br/>QueenG Braids</p>
      `;
      smsBody = `QueenG Braids: We're unable to accommodate your appointment on ${appointment.date}. Please contact us to reschedule.`;

      // Refund deposit
      const { data: payment } = await supabase
        .from("payments")
        .select("stripe_payment_id")
        .eq("appointment_id", appointmentId)
        .eq("type", "deposit")
        .single();

      if (payment?.stripe_payment_id) {
        const stripe = require("@/lib/stripe").stripe;
        await stripe.refunds.create({
          payment_intent: payment.stripe_payment_id,
        });

        await supabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("appointment_id", appointmentId)
          .eq("type", "deposit");
      }
      break;

    case "complete":
      newStatus = "completed";
      emailSubject = "Thank you for your visit!";
      emailBody = `
        <h1>Thank You!</h1>
        <p>Hi ${appointment.client.name},</p>
        <p>Thank you for visiting QueenG Braids! We hope you love your new ${appointment.service.name}.</p>
        <p>We'd love to hear your feedback. Please leave us a review!</p>
        <p>Best regards,<br/>QueenG Braids</p>
      `;
      break;

    case "no_show":
      newStatus = "no_show";
      emailSubject = "Appointment missed";
      emailBody = `
        <h1>Appointment Update</h1>
        <p>Hi ${appointment.client.name},</p>
        <p>We noticed you missed your appointment for ${appointment.service.name} on ${appointment.date}.</p>
        <p>Please contact us if you'd like to reschedule.</p>
        <p>Best regards,<br/>QueenG Braids</p>
      `;
      break;

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Update appointment status
  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: newStatus })
    .eq("id", appointmentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Send notifications
  if (appointment.client.email) {
    await sendEmail({
      to: appointment.client.email,
      subject: emailSubject,
      html: emailBody,
    });
  }

  if (appointment.client.phone && smsBody) {
    await sendSMS({
      to: appointment.client.phone,
      body: smsBody,
    });
  }

  return NextResponse.json({ success: true });
}
