import { createClient } from "@/lib/supabase/server";
import {
  SCHEDULE_C_CATEGORIES,
  ScheduleCCategory,
  autoClassify,
  deductibleAmount,
  getCategoryMeta,
} from "@/lib/schedule-c";

interface Props {
  year: number;
  taxRate?: number;
}

interface CategoryTotal {
  category: ScheduleCCategory;
  total: number;
  deductible: number;
  count: number;
}

export async function DeductionSummary({ year, taxRate = 25 }: Props) {
  const supabase = await createClient();

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, category_plaid, deduction_type, ai_category")
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .lt("amount", 0); // expenses are negative in Plaid convention

  if (error) {
    return <p className="text-sm text-muted-foreground">Failed to load summary.</p>;
  }

  // Aggregate per Schedule C category
  const totals: Record<ScheduleCCategory, CategoryTotal> = {} as Record<
    ScheduleCCategory,
    CategoryTotal
  >;

  for (const t of transactions ?? []) {
    // Precedence: manual override > AI category > rule-based Plaid mapping
    const category: ScheduleCCategory | null =
      (t.deduction_type as ScheduleCCategory | null) ??
      (t.ai_category as ScheduleCCategory | null) ??
      autoClassify(t.category_plaid);

    if (!category) continue;

    const absAmount = Math.abs(Number(t.amount));
    const deductible = deductibleAmount(absAmount, category);

    if (!totals[category]) {
      totals[category] = { category, total: 0, deductible: 0, count: 0 };
    }
    totals[category].total += absAmount;
    totals[category].deductible += deductible;
    totals[category].count += 1;
  }

  const rows = SCHEDULE_C_CATEGORIES.map(
    (cat) =>
      totals[cat.value] ?? {
        category: cat.value,
        total: 0,
        deductible: 0,
        count: 0,
      }
  );

  const grandDeductible = rows.reduce((s, r) => s + r.deductible, 0);
  const estimatedSavings = grandDeductible * (taxRate / 100);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="space-y-4">
      {/* Category cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((row) => {
          const meta = getCategoryMeta(row.category);
          if (!meta) return null;
          return (
            <div
              key={row.category}
              className="rounded-lg border border-border bg-card p-4 space-y-1"
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}
                >
                  {meta.label}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {meta.line}
                </span>
              </div>
              <p className="text-xl font-semibold">{fmt(row.deductible)}</p>
              {row.category === "Meals" && row.total > 0 && (
                <p className="text-xs text-muted-foreground">50% of {fmt(row.total)}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {row.count} transaction{row.count !== 1 ? "s" : ""}
              </p>
            </div>
          );
        })}
      </div>

      {/* Savings summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Total deductible ({year} YTD)</p>
          <p className="text-2xl font-bold">{fmt(grandDeductible)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            Est. tax savings at{" "}
            <span className="font-medium text-foreground">{taxRate}%</span>
          </p>
          <p className="text-2xl font-bold text-green-600">{fmt(estimatedSavings)}</p>
        </div>
      </div>
    </div>
  );
}
