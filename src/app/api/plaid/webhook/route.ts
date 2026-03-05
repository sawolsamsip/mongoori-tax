/**
 * POST /api/plaid/webhook
 * Plaid sends webhooks for TRANSACTIONS_ADDED, etc. Sync transactions for the item.
 * Optional: set PLAID_WEBHOOK_SECRET to verify requests with HMAC-SHA256(body, secret).
 * For full production verification use Plaid's JWT in Plaid-Verification header (see Plaid docs).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTransactionsForItem } from "@/lib/plaid/sync";
import type { PlaidItem } from "@/types/database";

interface PlaidWebhookPayload {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: string | null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.PLAID_WEBHOOK_SECRET;

  if (secret) {
    const signature = request.headers.get("plaid-verification");
    if (!signature || !verifyWebhookSignature(secret, body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: PlaidWebhookPayload;
  try {
    payload = JSON.parse(body) as PlaidWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.webhook_type !== "TRANSACTIONS" || !payload.item_id) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("plaid_items")
    .select("id, user_id")
    .eq("plaid_item_id", payload.item_id)
    .single();

  if (!item) {
    return NextResponse.json({ ok: true });
  }

  await syncTransactionsForItem(item.id, item.user_id);
  return NextResponse.json({ ok: true });
}

function verifyWebhookSignature(secret: string, body: string, signature: string): boolean {
  const crypto = require("crypto");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return signature === expected;
}
