/**
 * /dashboard/billing — Plan overview & upgrade/manage UI.
 * Phase 3 — MON-1201
 */

import { createClient } from "@/lib/supabase/server";
import { getEffectiveTier } from "@/lib/tier";
import type { Profile } from "@/types/database";
import { BillingActions } from "@/components/BillingActions";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  const effectiveTier = profile ? getEffectiveTier(profile as Profile) : "free";

  const trialEndsAt = profile?.premium_trial_ends_at
    ? new Date(profile.premium_trial_ends_at)
    : null;
  const trialActive = trialEndsAt && trialEndsAt > new Date();

  const expiresAt = profile?.subscription_expires_at
    ? new Date(profile.subscription_expires_at)
    : null;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">Billing & Plan</h1>

      {/* Current plan card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-xl font-semibold capitalize">
              {effectiveTier === "mongoori_rider"
                ? "Mongoori Rider (Premium Free)"
                : effectiveTier === "premium"
                ? "Premium"
                : "Free"}
            </p>
          </div>
          {effectiveTier !== "free" && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Active
            </span>
          )}
        </div>

        {trialActive && effectiveTier === "premium" && !profile?.stripe_subscription_id && (
          <p className="text-sm text-amber-600">
            14일 무료 체험 중 — 체험 종료:{" "}
            {trialEndsAt?.toLocaleDateString("ko-KR")} 이후 Free로 전환됩니다.
          </p>
        )}

        {effectiveTier === "mongoori_rider" && expiresAt && (
          <p className="text-sm text-muted-foreground">
            Mongoori Rides 무료 혜택 만료일:{" "}
            {expiresAt.toLocaleDateString("ko-KR")}
          </p>
        )}

        {effectiveTier === "premium" && profile?.stripe_subscription_id && expiresAt && (
          <p className="text-sm text-muted-foreground">
            다음 결제일: {expiresAt.toLocaleDateString("ko-KR")}
          </p>
        )}
      </div>

      {/* Upgrade / manage actions */}
      <BillingActions
        tier={effectiveTier}
        hasStripeSubscription={!!profile?.stripe_subscription_id}
      />

      {/* Plan comparison */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold mb-4">플랜 비교</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div />
          <div className="text-center font-medium">Free</div>
          <div className="text-center font-medium text-primary">Premium</div>

          {[
            ["Plaid 계좌 연결", "1개", "최대 3개"],
            ["거래 내역 조회", "최근 90일", "전체 기간"],
            ["AI 자동 분류", "❌", "✅ 무제한"],
            ["세금 절감액 추정", "❌", "✅"],
            ["마일리지 추적", "20건/월", "무제한"],
            ["수동 카테고리 수정", "30건/월", "무제한"],
            ["CSV/PDF 내보내기", "❌", "✅"],
            ["커스텀 분류 규칙", "❌", "✅"],
          ].map(([feat, free, premium]) => (
            <div key={feat} className="contents">
              <div className="text-muted-foreground py-1.5 border-t border-border">{feat}</div>
              <div className="text-center py-1.5 border-t border-border">{free}</div>
              <div className="text-center py-1.5 border-t border-border">{premium}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
