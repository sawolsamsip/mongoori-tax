"use client";

import { useState, useTransition } from "react";
import { SCHEDULE_C_CATEGORIES, ScheduleCCategory, getCategoryMeta } from "@/lib/schedule-c";

interface Props {
  transactionId: string;
  current: ScheduleCCategory | null;
  /** Auto-classified value (AI or rule-based, greyed out when no manual override) */
  auto: ScheduleCCategory | null;
  /** AI confidence score (0–1), shown as tooltip when auto came from AI */
  aiConfidence?: number | null;
}

export function CategorySelect({ transactionId, current, auto, aiConfidence }: Props) {
  const [value, setValue] = useState<ScheduleCCategory | null>(current);
  const [isPending, startTransition] = useTransition();

  const displayValue = value ?? auto;
  const meta = getCategoryMeta(displayValue);
  const isManual = value !== null;

  const confidenceLabel =
    aiConfidence != null ? `AI: ${Math.round(aiConfidence * 100)}% confident` : "Rule-based";

  async function handleChange(next: string) {
    const nextVal = next === "" ? null : (next as ScheduleCCategory);
    setValue(nextVal);
    startTransition(async () => {
      await fetch(`/api/transactions/${transactionId}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deduction_type: nextVal }),
      });
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {meta && (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.color} ${!isManual ? "opacity-60" : ""}`}
          title={isManual ? "Manual override" : confidenceLabel}
        >
          {meta.label}
          {!isManual && <span className="ml-1 text-[10px]">*</span>}
        </span>
      )}
      <select
        value={value ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="h-6 rounded border border-border bg-background px-1 text-xs text-foreground disabled:opacity-50"
        aria-label="IRS category"
      >
        <option value="">— unclassified</option>
        {SCHEDULE_C_CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label} ({cat.line})
          </option>
        ))}
      </select>
    </div>
  );
}
