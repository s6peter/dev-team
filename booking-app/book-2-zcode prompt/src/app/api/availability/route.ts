import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stylistId = searchParams.get("stylist_id");
  const date = searchParams.get("date");

  if (!stylistId || !date) {
    return NextResponse.json(
      { error: "stylist_id and date are required" },
      { status: 400 }
    );
  }

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();

  // Get availability for this day
  const { data: availability, error: availError } = await supabase
    .from("availability")
    .select("*")
    .eq("stylist_id", stylistId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .single();

  if (availError || !availability) {
    return NextResponse.json({ slots: [] });
  }

  // Check for overrides on this date
  const { data: override } = await supabase
    .from("availability_overrides")
    .select("*")
    .eq("stylist_id", stylistId)
    .eq("date", date)
    .single();

  if (override && !override.is_available) {
    return NextResponse.json({ slots: [] });
  }

  // Get existing appointments for this date
  const { data: appointments } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("stylist_id", stylistId)
    .eq("date", date)
    .in("status", ["pending", "confirmed"]);

  // Get active slot holds
  const { data: holds } = await supabase
    .from("slot_holds")
    .select("start_time, end_time")
    .eq("stylist_id", stylistId)
    .eq("date", date)
    .gt("expires_at", new Date().toISOString());

  // Generate available slots (30-minute intervals)
  const slots: string[] = [];
  const startTime = override?.start_time || availability.start_time;
  const endTime = override?.end_time || availability.end_time;

  const startParts = startTime.split(":").map(Number);
  const endParts = endTime.split(":").map(Number);
  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const slotTime = `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;

    // Check if slot conflicts with existing appointments or holds
    const hasConflict = [
      ...(appointments || []),
      ...(holds || []),
    ].some((booking) => {
      const bookingStart = timeToMinutes(booking.start_time);
      const bookingEnd = timeToMinutes(booking.end_time);
      return minutes < bookingEnd && minutes + 30 > bookingStart;
    });

    if (!hasConflict) {
      slots.push(slotTime);
    }
  }

  return NextResponse.json({ slots });
}

function timeToMinutes(time: string): number {
  const parts = time.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}
