import { TransactionsList } from "@/components/TransactionsList";
import Link from "next/link";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">All transactions</h1>
      </div>
      <TransactionsList limit={200} />
    </div>
  );
}
