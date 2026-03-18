"use client";

/**
 * Triggers AI batch classification of all unclassified transactions.
 * Uses Claude (claude-haiku-4-5) for cost-efficient classification.
 * Phase 3: gated behind UpgradeGate for Free tier users.
 */

import { useState } from "react";
import { UpgradeGate } from "@/components/UpgradeGate";

interface ClassifyButtonProps {
  isPremium?: boolean;
}

export function ClassifyButton({ isPremium = true }: ClassifyButtonProps) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<{ classified: number; message?: string } | null>(null);

  async function handleClick() {
    setStatus("running");
    setResult(null);
    try {
      const res = await fetch("/api/ai/classify", { method: "POST" });
      const json = (await res.json()) as { classified?: number; message?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Classification failed");
      setResult({ classified: json.classified ?? 0, message: json.message });
      setStatus("done");
      // Refresh page to show updated categories
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setResult({ classified: 0, message: err instanceof Error ? err.message : "Error" });
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <UpgradeGate isPremium={isPremium} featureName="AI 자동 분류">
        <button
          onClick={handleClick}
          disabled={status === "running"}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {status === "running" ? "Classifying…" : "✦ AI Classify"}
        </button>
      </UpgradeGate>
      {status === "done" && result && (
        <span className="text-xs text-green-600">
          {result.message ?? `${result.classified} classified`}
        </span>
      )}
      {status === "error" && result && (
        <span className="text-xs text-destructive">{result.message}</span>
      )}
    </div>
  );
}
