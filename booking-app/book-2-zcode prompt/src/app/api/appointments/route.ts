import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    serviceId,
    serviceTierId,
    date,
    startTime,
    clientName,
    clientEmail,
    clientPhone,
    notes,
  } = body;

  // Get service details
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    return NextResponse.json(
      { error: "Service not found" },
      { status: 404 }
    );
  }

  // Get tier details if selected
  let tierAddon = 0;
  if (serviceTierId) {
    const { data: tier } = await supabase
      .from("service_tiers")
      .select("price_addon")
      .eq("id", serviceTierId)
      .single();

    if (tier) {
      tierAddon = tier.price_addon;
    }
  }

  // Calculate end time
  const startParts = startTime.split(":");
  const totalMinutes =
    parseInt(startParts[0]) * 60 +
    parseInt(startParts[1]) +
    service.duration_minutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  const endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes
    .toString()
    .padStart(2, "0")}:00`;

  // Create or find client
  let clientId: string;
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("email", clientEmail)
    .single();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
      })
      .select("id")
      .single();

    if (clientError) {
      return NextResponse.json(
        { error: "Failed to create client" },
        { status: 500 }
      );
    }
    clientId = newClient.id;
  }

  // Create appointment
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      stylist_id: service.stylist_id,
      service_id: serviceId,
      service_tier_id: serviceTierId || null,
      date,
      start_time: startTime + ":00",
      end_time: endTime,
      status: "pending",
      notes,
    })
    .select("id")
    .single();

  if (appointmentError) {
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }

  // Calculate deposit amount
  const totalPrice = service.base_price + tierAddon;
  const tax = Math.round(totalPrice * service.tax_rate);
  const depositAmount = Math.round(
    (totalPrice + tax) * (service.deposit_percent / 100)
  );

  // Create Stripe Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: depositAmount,
    currency: "usd",
    metadata: {
      appointment_id: appointment.id,
      client_email: clientEmail,
      service_name: service.name,
    },
  });

  // Create payment record
  await supabase.from("payments").insert({
    appointment_id: appointment.id,
    type: "deposit",
    amount: depositAmount,
    stripe_payment_id: paymentIntent.id,
    status: "pending",
  });

  return NextResponse.json({
    appointmentId: appointment.id,
    clientSecret: paymentIntent.client_secret,
    depositAmount,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get("id");

  if (appointmentId) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, service:services(*), client:clients(*)")
      .eq("id", appointmentId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  return NextResponse.json(
    { error: "Appointment ID required" },
    { status: 400 }
  );
}
