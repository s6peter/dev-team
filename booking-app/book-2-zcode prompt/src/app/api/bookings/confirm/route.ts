import { NextResponse } from "next/server";
import { z } from "zod";
import { materializeBooking } from "@/lib/booking";

const schema = z.object({ paymentIntentId: z.string().min(1) });

/**
 * POST /api/bookings/confirm — called by the payment step after Stripe confirms.
 * Verifies the PaymentIntent succeeded (server-side, cannot be spoofed) and
 * materializes the pending appointment. Idempotent with the Stripe webhook.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const result = await materializeBooking(parsed.data.paymentIntentId, { verifyPayment: true });

  switch (result.status) {
    case "booked":
    case "already":
      return NextResponse.json({ ok: true, appointmentId: result.appointmentId });
    case "slot_taken":
      return NextResponse.json({ ok: false, error: "That slot was taken; your deposit was refunded." }, { status: 409 });
    case "not_paid":
      return NextResponse.json({ ok: false, error: "Payment not completed yet." }, { status: 402 });
    default:
      return NextResponse.json({ ok: false, error: "Booking could not be found." }, { status: 404 });
  }
}
