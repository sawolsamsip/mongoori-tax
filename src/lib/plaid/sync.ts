/**
 * Sync Plaid transactions into our DB (Supabase).
 * Uses transactionsSync (cursor-based); decrypts access token, fetches, upserts.
 */

import { getPlaidClient } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  nextCursor: string | null;
  error?: string;
}

/**
 * Sync transactions for one Plaid item. Call from API after exchange or webhook/cron.
 */
export async function syncTransactionsForItem(
  plaidItemId: string,
  userId: string
): Promise<SyncResult> {
  const supabase = createAdminClient();
  const plaid = getPlaidClient();

  const { data: item, error: itemError } = await supabase
    .from("plaid_items")
    .select("id, access_token_encrypted, cursor_transactions")
    .eq("id", plaidItemId)
    .eq("user_id", userId)
    .single();

  if (itemError || !item) {
    return { added: 0, modified: 0, removed: 0, nextCursor: null, error: "Plaid item not found" };
  }

  let accessToken: string;
  try {
    accessToken = decrypt(item.access_token_encrypted);
  } catch {
    return { added: 0, modified: 0, removed: 0, nextCursor: null, error: "Failed to decrypt access token" };
  }

  const cursor = item.cursor_transactions ?? undefined;
  let added = 0,
    modified = 0,
    removed = 0;
  let nextCursor: string | null = null;

  try {
    const response = await plaid.transactionsSync({
      access_token: accessToken,
      cursor,
    });

    const { added: a, modified: m, removed: r } = response.data;
    added = a?.length ?? 0;
    modified = m?.length ?? 0;
    removed = r?.length ?? 0;
    nextCursor = response.data.next_cursor ?? null;

    // Map plaid_account_id (Plaid's account_id string) -> our plaid_accounts.id
    const { data: accounts } = await supabase
      .from("plaid_accounts")
      .select("id, plaid_account_id")
      .eq("plaid_item_id", plaidItemId);
    const accountIdByPlaidId = new Map((accounts ?? []).map((acc) => [acc.plaid_account_id, acc.id]));

    // Insert added transactions
    if (a?.length) {
      const rows = a.map((t) => {
        const ourAccountId = accountIdByPlaidId.get(t.account_id) ?? null;
        return {
          user_id: userId,
          plaid_account_id: ourAccountId,
          plaid_transaction_id: t.transaction_id,
          date: t.date,
          name: t.name ?? null,
          merchant_name: t.merchant_name ?? null,
          amount: -Number(t.amount), // Plaid: negative = outflow
          currency: t.iso_currency_code ?? "USD",
          category_plaid: t.personal_finance_category?.detailed ?? null,
        };
      });
      await supabase.from("transactions").upsert(rows, {
        onConflict: "plaid_account_id,plaid_transaction_id",
        ignoreDuplicates: false,
      });
    }

    // Update modified transactions (by plaid_transaction_id; we need plaid_account_id for conflict)
    if (m?.length) {
      for (const t of m) {
        const ourAccountId = accountIdByPlaidId.get(t.account_id) ?? null;
        await supabase
          .from("transactions")
          .update({
            date: t.date,
            name: t.name ?? null,
            merchant_name: t.merchant_name ?? null,
            amount: -Number(t.amount),
            category_plaid: t.personal_finance_category?.detailed ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("plaid_transaction_id", t.transaction_id)
          .eq("user_id", userId);
      }
    }

    // Remove deleted (Plaid sends list of transaction_ids)
    if (r?.length) {
      const removedIds = r.map((x: { transaction_id: string }) => x.transaction_id);
      await supabase
        .from("transactions")
        .delete()
        .eq("user_id", userId)
        .in("plaid_transaction_id", removedIds);
    }

    // Persist next cursor
    await supabase
      .from("plaid_items")
      .update({ cursor_transactions: nextCursor, updated_at: new Date().toISOString() })
      .eq("id", plaidItemId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Plaid sync failed";
    return { added, modified, removed, nextCursor: null, error: message };
  }

  return { added, modified, removed, nextCursor };
}
