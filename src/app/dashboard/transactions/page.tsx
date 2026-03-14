import { TransactionsList } from "@/components/TransactionsList";
import { YearSelector } from "@/components/YearSelector";
import Link from "next/link";
import { Suspense } from "react";

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">All transactions</h1>
        <div className="ml-auto">
          <Suspense>
            <YearSelector current={year} />
          </Suspense>
        </div>
      </div>
      <TransactionsList limit={500} year={year} />
    </div>
  );
}
