import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_C_CATEGORIES } from "@/lib/schedule-c";

const VALID_CATEGORIES = new Set(SCHEDULE_C_CATEGORIES.map((c) => c.value));

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { deduction_type } = body;

  // Validate: must be null or a known Schedule C category
  if (deduction_type !== null && !VALID_CATEGORIES.has(deduction_type)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { error } = await supabase
    .from("transactions")
    .update({ deduction_type, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id); // RLS belt-and-suspenders

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
