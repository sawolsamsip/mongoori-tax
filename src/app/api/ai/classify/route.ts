/**
 * POST /api/ai/classify
 * Batch-classify all unclassified transactions for the authenticated user.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyTransactionsBatch } from "@/lib/ai/classify";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch transactions not yet AI-classified (expenses only: amount < 0)
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id, name, merchant_name, amount, category_plaid")
    .eq("user_id", user.id)
    .is("ai_classified_at", null)
    .lt("amount", 0)
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!transactions?.length) {
    return NextResponse.json({ classified: 0, message: "All transactions already classified." });
  }

  const results = await classifyTransactionsBatch(transactions);

  // Bulk update
  const updates = Array.from(results.entries()).map(([id, r]) => ({
    id,
    ai_category: r.category,
    ai_confidence: r.confidence,
    ai_explanation: r.explanation,
    ai_classified_at: new Date().toISOString(),
    // Only set these if not already manually overridden
    is_deductible: r.is_deductible,
    deduction_type: r.deduction_type,
  }));

  // Update in batches (Supabase upsert)
  let updated = 0;
  for (const row of updates) {
    const { error: upErr } = await supabase
      .from("transactions")
      .update({
        ai_category: row.ai_category,
        ai_confidence: row.ai_confidence,
        ai_explanation: row.ai_explanation,
        ai_classified_at: row.ai_classified_at,
        is_deductible: row.is_deductible,
        deduction_type: row.deduction_type,
      })
      .eq("id", row.id)
      .eq("user_id", user.id)
      .is("category_override", null); // don't overwrite manual overrides

    if (!upErr) updated++;
  }

  return NextResponse.json({ classified: updated, total: transactions.length });
}
