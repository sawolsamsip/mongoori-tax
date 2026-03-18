"use client";

/**
 * BillingActions — upgrade / manage subscription buttons on /dashboard/billing.
 * Phase 3 — MON-1201
 */

import { useState } from "react";
import type { SubscriptionTier } from "@/types/database";

interface BillingActionsProps {
  tier: SubscriptionTier | "free";
  hasStripeSubscription: boolean;
}

export function BillingActions({ tier, hasStripeSubscription }: BillingActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: "monthly" | "annual") {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Failed to create checkout session");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Failed to open portal");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      setLoading(null);
    }
  }

  if (tier === "mongoori_rider") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-2">
        <p className="text-sm font-medium">Mongoori Rides 무료 혜택 이용 중</p>
        <p className="text-sm text-muted-foreground">
          혜택 만료 후 계속 사용하려면 Premium 플랜으로 업그레이드하세요.
        </p>
        <button
          onClick={() => checkout("annual")}
          disabled={!!loading}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading === "annual" ? "처리 중…" : "연간 플랜 $99/년 업그레이드"}
        </button>
      </div>
    );
  }

  if (tier === "premium" && hasStripeSubscription) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-2">
        <p className="text-sm font-medium">구독 관리</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          onClick={openPortal}
          disabled={!!loading}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {loading === "portal" ? "처리 중…" : "구독 관리 / 취소"}
        </button>
      </div>
    );
  }

  // Free tier (or trial) — show upgrade options
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <p className="text-sm font-medium">Premium으로 업그레이드</p>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Annual — primary */}
        <button
          onClick={() => checkout("annual")}
          disabled={!!loading}
          className="flex-1 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading === "annual" ? "처리 중…" : (
            <>연간 플랜 $99/년 <span className="text-xs opacity-80">(17% 절약)</span></>
          )}
        </button>

        {/* Monthly — secondary */}
        <button
          onClick={() => checkout("monthly")}
          disabled={!!loading}
          className="flex-1 rounded-md border border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
        >
          {loading === "monthly" ? "처리 중…" : "월간 $9.99/월"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Mongoori Rides 고객이신가요?{" "}
        <a href="/mongoori-rider" className="text-primary hover:underline">
          무료 혜택 확인 →
        </a>
      </p>
    </div>
  );
}
