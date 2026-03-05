/**
 * POST /api/plaid/exchange
 * Exchange Plaid public_token for access_token, store item + accounts, then sync transactions.
 * Body: { public_token: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaidClient } from "@/lib/plaid/client";
import { CountryCode } from "plaid";
import { encrypt } from "@/lib/encryption";
import { syncTransactionsForItem } from "@/lib/plaid/sync";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { public_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const publicToken = body.public_token;
  if (!publicToken || typeof publicToken !== "string") {
    return NextResponse.json({ error: "public_token required" }, { status: 400 });
  }

  const plaid = getPlaidClient();
  const admin = createAdminClient();

  try {
    const exchangeRes = await plaid.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = exchangeRes.data.access_token;
    const itemId = exchangeRes.data.item_id;

    let institutionName: string | null = null;
    try {
      const itemGet = await plaid.itemGet({ access_token: accessToken });
      if (itemGet.data.item.institution_id) {
        const inst = await plaid.institutionsGetById({
          institution_id: itemGet.data.item.institution_id,
          country_codes: [CountryCode.Us],
        });
        institutionName = inst.data?.institution?.name ?? null;
      }
    } catch {
      // Non-fatal: we can still store the item without institution name
    }

    const encrypted = encrypt(accessToken);

    const { data: plaidItem, error: insertItemError } = await admin
      .from("plaid_items")
      .insert({
        user_id: user.id,
        plaid_item_id: itemId,
        institution_name: institutionName,
        access_token_encrypted: encrypted,
      })
      .select("id")
      .single();

    if (insertItemError) {
      console.error("[plaid] insert item:", insertItemError);
      return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
    }

    const accountsRes = await plaid.accountsGet({ access_token: accessToken });
    const accounts = accountsRes.data.accounts ?? [];
    await admin.from("plaid_accounts").insert(
      accounts.map((acc) => ({
        plaid_item_id: plaidItem.id,
        plaid_account_id: acc.account_id,
        name: acc.name ?? null,
        type: acc.type ?? null,
        subtype: acc.subtype ?? null,
        mask: acc.mask ?? null,
      }))
    );

    const syncResult = await syncTransactionsForItem(plaidItem.id, user.id);
    return NextResponse.json({
      success: true,
      plaid_item_id: plaidItem.id,
      sync: syncResult,
    });
  } catch (err) {
    console.error("[plaid] exchange error:", err);
    return NextResponse.json(
      { error: "Failed to link account" },
      { status: 500 }
    );
  }
}
