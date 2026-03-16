"use client";

import { useState } from "react";
import { autoClassify, ScheduleCCategory, SCHEDULE_C_CATEGORIES } from "@/lib/schedule-c";
import { CategorySelect } from "./CategorySelect";

type Transaction = {
  id: string;
  date: string;
  name: string | null;
  merchant_name: string | null;
  amount: number;
  currency: string;
  category_plaid: string[] | null;
  deduction_type: string | null;
  ai_category: string | null;
  ai_confidence: number | null;
};

interface Props {
  transactions: Transaction[];
}

export function TransactionsListClient({ transactions }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const filtered = transactions.filter((t) => {
    const merchant = (t.merchant_name ?? t.name ?? "").toLowerCase();
    if (search && !merchant.includes(search.toLowerCase())) return false;
    if (categoryFilter) {
      const aiCategory = t.ai_category as ScheduleCCategory | null;
      const auto = aiCategory ?? autoClassify(t.category_plaid);
      const effective = t.deduction_type ?? auto;
      if (categoryFilter === "unclassified") return effective == null;
      if (effective !== categoryFilter) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          placeholder="Search merchant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-8 rounded border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-8 rounded border border-border bg-background px-2 text-sm text-foreground"
        >
          <option value="">All Categories</option>
          {SCHEDULE_C_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
          <option value="unclassified">Unclassified</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No transactions match your filters.
        </p>
      ) : (
        <>
          {/* Desktop table — hidden below md */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-border">
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
                {filtered.map((t) => {
                  const aiCategory = t.ai_category as ScheduleCCategory | null;
                  const auto = aiCategory ?? autoClassify(t.category_plaid);
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-4 py-2 text-muted-foreground">{t.date}</td>
                      <td className="px-4 py-2">{t.merchant_name ?? t.name ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {t.amount >= 0 ? "+" : ""}
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: t.currency }).format(Number(t.amount))}
                      </td>
                      <td className="px-4 py-2">
                        <CategorySelect
                          transactionId={t.id}
                          current={t.deduction_type as ScheduleCCategory | null}
                          auto={auto}
                          aiConfidence={aiCategory && t.ai_confidence != null ? Number(t.ai_confidence) : null}
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

          {/* Mobile card stack — visible below md */}
          <div className="md:hidden space-y-2">
            {filtered.map((t) => {
              const aiCategory = t.ai_category as ScheduleCCategory | null;
              const auto = aiCategory ?? autoClassify(t.category_plaid);
              return (
                <div key={t.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{t.merchant_name ?? t.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </div>
                    <p className="font-medium text-sm whitespace-nowrap">
                      {t.amount >= 0 ? "+" : ""}
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: t.currency }).format(Number(t.amount))}
                    </p>
                  </div>
                  <CategorySelect
                    transactionId={t.id}
                    current={t.deduction_type as ScheduleCCategory | null}
                    auto={auto}
                    aiConfidence={aiCategory && t.ai_confidence != null ? Number(t.ai_confidence) : null}
                  />
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground text-center pt-1">
              * Auto-classified — use dropdown to override
            </p>
          </div>
        </>
      )}
    </div>
  );
}
