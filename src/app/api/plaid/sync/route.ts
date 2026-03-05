/**
 * POST /api/plaid/sync
 * Sync transactions for a linked item. Body: { plaid_item_id: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncTransactionsForItem } from "@/lib/plaid/sync";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plaid_item_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const plaidItemId = body.plaid_item_id;
  if (!plaidItemId || typeof plaidItemId !== "string") {
    return NextResponse.json({ error: "plaid_item_id required" }, { status: 400 });
  }

  const result = await syncTransactionsForItem(plaidItemId, user.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
