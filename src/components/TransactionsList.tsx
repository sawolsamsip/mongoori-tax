import { createClient } from "@/lib/supabase/server";

export async function TransactionsList({ limit = 50 }: { limit?: number }) {
  const supabase = await createClient();
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id, date, name, merchant_name, amount, currency, category_plaid")
    .order("date", { ascending: false })
    .limit(limit);

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
            <th className="px-4 py-2 text-left font-medium">Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
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
              <td className="px-4 py-2 text-muted-foreground">
                {t.category_plaid?.join(", ") ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
