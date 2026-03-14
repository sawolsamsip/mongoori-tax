import { createClient } from "@/lib/supabase/server";
import { autoClassify, effectiveCategory, ScheduleCCategory } from "@/lib/schedule-c";
import { CategorySelect } from "./CategorySelect";

interface Props {
  limit?: number;
  year?: number;
}

export async function TransactionsList({ limit = 50, year }: Props) {
  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select(
      "id, date, name, merchant_name, amount, currency, category_plaid, deduction_type, ai_category, ai_confidence"
    )
    .order("date", { ascending: false })
    .limit(limit);

  if (year) {
    query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
  }

  const { data: transactions, error } = await query;

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">Failed to load transactions.</p>
    );
  }

  if (!transactions?.length) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No transactions yet. Connect a bank account to sync.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Date</th>
            <th className="px-4 py-2 text-left font-medium">Merchant</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
            <th className="px-4 py-2 text-left font-medium">IRS Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            // Precedence: manual override > AI classification > rule-based Plaid mapping
            const aiCategory = t.ai_category as ScheduleCCategory | null;
            const auto: ScheduleCCategory | null =
              aiCategory ?? autoClassify(t.category_plaid);
            return (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-2 text-muted-foreground">{t.date}</td>
                <td className="px-4 py-2">{t.merchant_name ?? t.name ?? "—"}</td>
                <td className="px-4 py-2 text-right font-medium">
                  {t.amount >= 0 ? "+" : ""}
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: t.currency,
                  }).format(Number(t.amount))}
                </td>
                <td className="px-4 py-2">
                  <CategorySelect
                    transactionId={t.id}
                    current={t.deduction_type as ScheduleCCategory | null}
                    auto={auto}
                    aiConfidence={
                      aiCategory && t.ai_confidence != null
                        ? Number(t.ai_confidence)
                        : null
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
        * Auto-classified (AI or rule-based) — use dropdown to override
      </p>
    </div>
  );
}
