/**
 * AI-powered transaction classification using Claude.
 * Maps transactions to IRS Schedule C categories for rideshare drivers.
 */

import Anthropic from "@anthropic-ai/sdk";
import { SCHEDULE_C_CATEGORIES, type ScheduleCCategory } from "@/lib/schedule-c";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AIClassificationResult {
  category: ScheduleCCategory | null;
  is_deductible: boolean;
  deduction_type: string | null;
  confidence: number; // 0.0 – 1.0
  explanation: string;
  estimated_amount?: number;
}

const CATEGORY_LIST = SCHEDULE_C_CATEGORIES.map(
  (c) => `"${c.value}" — ${c.label} (Schedule C ${c.line})`
).join("\n");

const SYSTEM_PROMPT = `You are a US tax expert specializing in IRS Schedule C deductions for rideshare (Uber/Lyft) drivers.
Your job is to classify individual bank transactions into Schedule C categories.

Available categories:
${CATEGORY_LIST}

Key IRS rules for rideshare drivers (Pub 463, 535, 334):
- Vehicle Expenses: Gas, oil changes, car wash, parking, tolls, auto repairs, insurance for work vehicle
- Phone & Internet (Line 25): Cell phone bills, mobile data (business-use portion, typically 80–100% for rideshare)
- Insurance (Line 15): Commercial auto insurance, health insurance premiums (if self-employed)
- Meals (Line 24b): Only 50% deductible; must be business-related
- Professional Fees (Line 17): Accountant, tax prep, legal fees, bank fees for business accounts
- Other Expenses (Line 48): Software subscriptions (nav apps, dashcam), supplies

For non-deductible personal transactions (groceries, entertainment, clothing), set is_deductible to false and category to null.

Respond ONLY with valid JSON in this exact schema:
{
  "category": "<ScheduleCCategory or null>",
  "is_deductible": <boolean>,
  "deduction_type": "<short label or null>",
  "confidence": <0.0 to 1.0>,
  "explanation": "<1-2 sentence IRS-based explanation>"
}`;

export async function classifyTransaction(
  merchantName: string | null,
  transactionName: string | null,
  amount: number,
  plaidCategories: string[] | null
): Promise<AIClassificationResult> {
  const merchant = merchantName ?? transactionName ?? "Unknown";
  const plaidCats = plaidCategories?.join(", ") ?? "none";

  const userMessage = `Classify this transaction:
Merchant: ${merchant}
Amount: $${Math.abs(amount).toFixed(2)} (${amount < 0 ? "debit/expense" : "credit/income"})
Plaid categories: ${plaidCats}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";

  try {
    const parsed = JSON.parse(text) as {
      category: string | null;
      is_deductible: boolean;
      deduction_type: string | null;
      confidence: number;
      explanation: string;
    };

    // Validate category value
    const validCategories = SCHEDULE_C_CATEGORIES.map((c) => c.value) as string[];
    const category =
      parsed.category && validCategories.includes(parsed.category)
        ? (parsed.category as ScheduleCCategory)
        : null;

    return {
      category,
      is_deductible: Boolean(parsed.is_deductible),
      deduction_type: parsed.deduction_type ?? null,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      explanation: String(parsed.explanation ?? ""),
    };
  } catch {
    return {
      category: null,
      is_deductible: false,
      deduction_type: null,
      confidence: 0,
      explanation: "Classification failed — please review manually.",
    };
  }
}

export async function classifyTransactionsBatch(
  transactions: Array<{
    id: string;
    merchant_name: string | null;
    name: string | null;
    amount: number;
    category_plaid: string[] | null;
  }>
): Promise<Map<string, AIClassificationResult>> {
  const results = new Map<string, AIClassificationResult>();

  // Process in parallel with a concurrency cap of 5
  const BATCH = 5;
  for (let i = 0; i < transactions.length; i += BATCH) {
    const slice = transactions.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      slice.map((t) =>
        classifyTransaction(t.merchant_name, t.name, t.amount, t.category_plaid).then((r) => ({
          id: t.id,
          result: r,
        }))
      )
    );
    for (const s of settled) {
      if (s.status === "fulfilled") {
        results.set(s.value.id, s.value.result);
      }
    }
  }

  return results;
}
