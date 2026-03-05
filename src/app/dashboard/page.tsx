import { createClient } from "@/lib/supabase/server";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { TransactionsList } from "@/components/TransactionsList";
import { SyncButton } from "@/components/SyncButton";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("plaid_items")
    .select("id, institution_name, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <PlaidLinkButton />
      </div>

      {items && items.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-2">Linked accounts</h2>
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <span className="font-medium">{item.institution_name ?? "Bank"}</span>
                <SyncButton plaidItemId={item.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">Recent transactions</h2>
          <Link href="/dashboard/transactions" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <TransactionsList limit={20} />
      </section>
    </div>
  );
}
