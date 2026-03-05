/**
 * POST /api/plaid/link-token
 * Create a Plaid Link token for the current user (required to open Plaid Link).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaidClient, PLAID_COUNTRY_CODES, PLAID_PRODUCTS } from "@/lib/plaid/client";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const plaid = getPlaidClient();
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Tax",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
      redirect_uri: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        : undefined,
      transactions: {
        days_requested: 90,
      },
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("[plaid] link-token error:", err);
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 }
    );
  }
}
