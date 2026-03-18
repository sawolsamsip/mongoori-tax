/**
 * POST /api/internal/rider-benefit
 * Internal webhook — called by Mongoori Rides when a booking is confirmed.
 *
 * Payload:
 *   { email, rental_end_date, booking_id }
 *
 * Auth: Bearer MONGOORI_RIDES_WEBHOOK_SECRET
 * Phase 3 — MON-1201
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RiderBenefitPayload {
  email: string;
  rental_end_date: string; // ISO date, e.g. "2026-04-15"
  booking_id?: string;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(req: NextRequest) {
  // Auth: shared secret
  const secret = process.env.MONGOORI_RIDES_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RiderBenefitPayload;
  try {
    body = await req.json() as RiderBenefitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, rental_end_date, booking_id } = body;
  if (!email || !rental_end_date) {
    return NextResponse.json({ error: "email and rental_end_date are required" }, { status: 400 });
  }

  // Premium until = rental_end + 60 days
  const rentalEnd = new Date(rental_end_date);
  const premiumUntil = addDays(rentalEnd, 60).toISOString();

  const admin = createAdminClient();

  // Check if user already has an account
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (profile) {
    // Existing user: upgrade immediately
    await admin.from("profiles").update({
      subscription_tier: "mongoori_rider",
      subscription_expires_at: premiumUntil,
      is_mongoori_rider: true,
      mongoori_rider_booking_id: booking_id ?? null,
      mongoori_rider_rental_end: rentalEnd.toISOString(),
    }).eq("id", profile.id);

    return NextResponse.json({ status: "upgraded", email });
  }

  // No account yet: upsert into pending_riders
  const { error } = await admin.from("pending_riders").upsert(
    {
      email: email.toLowerCase(),
      booking_id: booking_id ?? null,
      rental_end_date,
      premium_until: premiumUntil,
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("[rider-benefit] pending_riders upsert error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // TODO: send invite email to driver (Phase 3 follow-up)

  return NextResponse.json({ status: "pending", email });
}
