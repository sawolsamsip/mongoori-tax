import { createClient } from "@/lib/supabase/server";
import { autoClassify, ScheduleCCategory } from "@/lib/schedule-c";
import { PlaidLinkButton } from "./PlaidLinkButton";
import { TransactionsListClient } from "./TransactionsListClient";

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
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          No transactions yet. Connect a bank account to sync your expenses.
        </p>
        <PlaidLinkButton />
      </div>
    );
  }

  return <TransactionsListClient transactions={transactions} />;
}
