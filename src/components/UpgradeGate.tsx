"use client";

/**
 * UpgradeGate — wraps Premium-only features.
 * When the user is on Free tier, shows an upgrade modal instead of the feature.
 * Phase 3 — MON-1201
 */

import { useState } from "react";

interface UpgradeGateProps {
  /** Current effective tier, passed from server component via props. */
  isPremium: boolean;
  /** Feature name shown in the modal title. */
  featureName?: string;
  children: React.ReactNode;
}

export function UpgradeGate({ isPremium: premium, featureName = "이 기능", children }: UpgradeGateProps) {
  const [showModal, setShowModal] = useState(false);

  if (premium) return <>{children}</>;

  return (
    <>
      {/* Render children but intercept clicks */}
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
        className="cursor-pointer"
      >
        {children}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="mb-4 text-3xl">✦</div>
            <h2 className="text-xl font-semibold">
              {featureName}은(는) Premium 기능입니다
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              AI 자동 분류, 세금 절감액 추정, 무제한 거래 내역 등 모든 기능을 사용하세요.
            </p>

            <ul className="mt-4 space-y-1.5 text-sm">
              {[
                "✅ AI 자동 분류 (Claude) — 무제한",
                "✅ 세금 절감액 추정",
                "✅ 전체 거래 내역 조회 (기간 제한 없음)",
                "✅ Plaid 계좌 최대 3개 연결",
                "✅ 마일리지 무제한 추적",
                "✅ CSV/PDF 내보내기",
              ].map((item) => (
                <li key={item} className="text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-2">
              <a
                href="/dashboard/billing?plan=annual"
                className="w-full rounded-md bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                연간 플랜 $99/년으로 시작 →
              </a>
              <a
                href="/dashboard/billing?plan=monthly"
                className="w-full rounded-md border border-border py-2.5 text-center text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                월간 $9.99/월
              </a>
              <p className="text-center text-xs text-muted-foreground mt-1">
                Mongoori Rides 고객이신가요?{" "}
                <a href="/mongoori-rider" className="text-primary hover:underline">
                  무료 혜택 확인 →
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
