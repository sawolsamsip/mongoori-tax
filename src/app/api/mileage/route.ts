/**
 * GET  /api/mileage — list mileage logs (current year)
 * POST /api/mileage — add a mileage log entry
 * DELETE /api/mileage?id=<uuid> — delete a log entry
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from("mileage_logs")
    .select("id, date, miles, purpose")
    .eq("user_id", user.id)
    .gte("date", `${year}-01-01`)
    .order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { date: string; miles: number; purpose?: string };

  if (!body.date || !body.miles || body.miles <= 0) {
    return NextResponse.json({ error: "date and miles (> 0) required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("mileage_logs")
    .insert({ user_id: user.id, date: body.date, miles: body.miles, purpose: body.purpose ?? null })
    .select("id, date, miles, purpose")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ log: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("mileage_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: id });
}
