# tax.mongoori.com — Freemium 비즈니스 모델 Product Spec

**작성:** Product Manager
**날짜:** 2026-03-18
**상태:** CEO 검토 대기
**근거:** 오너 2026-03-18 최종 확정 ([MON-1200](/MON/issues/MON-1200))

---

## 1. 전략 요약

```
Mongoori Rides 렌탈 고객    → tax.mongoori.com Premium 무료 (자동 혜택)
외부 라이드쉐어 드라이버     → Free 기본 / Premium $9.99/월
신규 가입자                 → 14일 Premium 무료 체험
```

---

## 2. 티어 정의 (Free vs Premium)

### 2.1 Free 티어

| 기능 | 제한 |
|------|------|
| 계정 생성 & 로그인 | 무제한 |
| Plaid 은행 연결 | 1개 계좌 |
| 거래 내역 조회 | 최근 90일 |
| 규칙 기반 자동 분류 (Plaid 카테고리) | 무제한 |
| 수동 카테고리 수정 | 월 30건 |
| AI 분류 (Claude) | ❌ 잠금 (업그레이드 유도) |
| AI 일괄 분류 버튼 | ❌ 잠금 |
| Schedule C 공제 요약 | 기본 (카테고리 합계만) |
| 세금 절감액 추정치 | ❌ 잠금 |
| 마일리지 추적 | 월 20건 |
| CSV/PDF 내보내기 | ❌ 잠금 |
| 세금 추정 계산기 (Phase 4) | ❌ 잠금 |
| 커스텀 분류 규칙 | ❌ 잠금 |

### 2.2 Premium 티어 ($9.99/월 | $99/년)

| 기능 | 제한 |
|------|------|
| 계정 생성 & 로그인 | 무제한 |
| Plaid 은행 연결 | 최대 3개 계좌 |
| 거래 내역 조회 | 무제한 (전체 기간) |
| 규칙 기반 자동 분류 | 무제한 |
| 수동 카테고리 수정 | 무제한 |
| AI 분류 (Claude) | ✅ 무제한 |
| AI 일괄 분류 버튼 | ✅ |
| Schedule C 공제 요약 | 전체 + 세금 절감액 추정 |
| 마일리지 추적 | 무제한 |
| CSV/PDF 내보내기 (Phase 4) | ✅ |
| 세금 추정 계산기 (Phase 4) | ✅ |
| 커스텀 분류 규칙 | ✅ |
| 우선 지원 | ✅ |

### 2.3 Mongoori Rider 티어 (Mongoori Rides 드라이버 전용 무료 Premium)

- Premium 기능 **전체 포함**, 청구 없음
- 렌탈 종료일 + **60일** 유효 (세금 정리 버퍼)
- 만료 30일 전 이메일 알림 → 유료 전환 CTA
- 만료 후 Free 티어 자동 다운그레이드 (데이터 보존, 기능만 제한)

---

## 3. Mongoori Rides ↔ tax.mongoori.com 연동 설계

### 3.1 연동 방식: Webhook + 이메일 매칭

**흐름:**

```
[Mongoori Rides 예약 확정]
        ↓
Mongoori Rides → POST /api/internal/rider-benefit
{
  "email": "driver@example.com",
  "rental_end_date": "2026-04-15",
  "booking_id": "MON-RIDE-12345"
}
        ↓
tax.mongoori.com 처리:
  1. 이메일로 기존 계정 조회 (Supabase profiles)
  2. 계정 있음 → subscription_tier = 'mongoori_rider', premium_until = rental_end + 60일
  3. 계정 없음 → 레코드 생성 (pending), 사용자 이메일로 가입 초대 발송
        ↓
[드라이버 tax.mongoori.com 방문 & 가입]
  → 이메일 매칭 → 자동 mongoori_rider 등급 적용
```

**보안:**
- Internal API는 shared secret (Bearer token) 인증
- `MONGOORI_RIDES_WEBHOOK_SECRET` 환경 변수로 관리
- Rate limiting: IP당 분당 10건

### 3.2 Supabase DB 스키마 변경 (CTO 구현)

```sql
-- profiles 테이블 확장
ALTER TABLE profiles ADD COLUMN subscription_tier text
  DEFAULT 'free'
  CHECK (subscription_tier IN ('free', 'premium', 'mongoori_rider'));

ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN stripe_subscription_id text;
ALTER TABLE profiles ADD COLUMN premium_trial_ends_at timestamptz;
ALTER TABLE profiles ADD COLUMN is_mongoori_rider boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN mongoori_rider_booking_id text;
ALTER TABLE profiles ADD COLUMN mongoori_rider_rental_end timestamptz;

-- 인덱스
CREATE INDEX idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_subscription_expires_at ON profiles(subscription_expires_at);
```

### 3.3 유효 티어 결정 로직 (서버 사이드)

```typescript
function getEffectiveTier(profile: Profile): 'free' | 'premium' | 'mongoori_rider' {
  const now = new Date();

  // 1. Mongoori Rider: 만료일 체크
  if (profile.subscription_tier === 'mongoori_rider' && profile.subscription_expires_at) {
    if (new Date(profile.subscription_expires_at) > now) return 'mongoori_rider';
    // 만료 → free로 자동 다운그레이드 (백그라운드 job)
  }

  // 2. Premium 구독: Stripe 상태 + 만료일 체크
  if (profile.subscription_tier === 'premium' && profile.subscription_expires_at) {
    if (new Date(profile.subscription_expires_at) > now) return 'premium';
  }

  // 3. 14일 무료 체험 중
  if (profile.premium_trial_ends_at && new Date(profile.premium_trial_ends_at) > now) {
    return 'premium'; // trial is treated as premium
  }

  return 'free';
}
```

---

## 4. 가격 전략

### 4.1 플랜 구조

| 플랜 | 가격 | 월 환산 | 절약 |
|------|------|---------|------|
| Monthly | $9.99/월 | $9.99 | — |
| Annual | $99/년 | $8.25 | $21.12/년 (17.6%) |

**권장:** Annual을 주력 CTA로, Monthly를 보조로 표시

**근거:**
- 라이드쉐어 드라이버는 연중 운전 → 연간 플랜이 자연스러운 선택
- Annual LTV = $99 vs Monthly (12개월 유지 시) $119.88 → Annual 전환이 이탈 방지에 유리
- $99/year는 심리적으로 "두 달치 요금보다 저렴"으로 포지셔닝 가능

### 4.2 Stripe 설정 (CTO 구현)

```
Product: "tax.mongoori.com Premium"
Price 1: price_monthly — $9.99 USD, recurring monthly
Price 2: price_annual  — $99.00 USD, recurring yearly

Webhook events to handle:
- checkout.session.completed → activate subscription
- customer.subscription.updated → update expires_at
- customer.subscription.deleted → downgrade to free
- invoice.payment_failed → grace period 7일 → 다운그레이드
```

---

## 5. 온보딩 플로우

### 5.1 신규 가입 플로우

```
[/signup 방문]
  → 이메일/비밀번호 입력
  → Supabase Auth 계정 생성
  → profiles 레코드 생성:
    - subscription_tier = 'free'
    - premium_trial_ends_at = NOW() + 14 days
  → is_mongoori_rider 이메일 체크 (pending_riders 테이블)
    - 매칭 시 → subscription_tier = 'mongoori_rider', expires_at 설정
  → /dashboard 리다이렉트
  → 온보딩 모달: "14일 무료 체험 시작! AI 분류를 경험해보세요."
```

### 5.2 기능 제한 게이트 UX

Free 사용자가 Premium 기능 접근 시:

```
[AI 분류 버튼 클릭]
  → 업그레이드 모달 표시:
    - 제목: "AI 자동 분류는 Premium 기능입니다"
    - 혜택 목록 (AI 분류, 세금 절감액 추정, 무제한 내역)
    - CTA 1: "연간 플랜 $99/년으로 시작 →" (primary, 강조)
    - CTA 2: "월간 $9.99/월" (secondary)
    - 링크: "Mongoori Rides 고객이신가요? 무료 혜택 확인 →"
```

### 5.3 Mongoori Rider 만료 알림

```
만료 30일 전: 이메일 "Premium 혜택이 30일 후 만료됩니다"
만료 7일 전:  이메일 "Premium 혜택이 7일 후 만료됩니다 — 연간 플랜 $99으로 계속하기"
만료 당일:    이메일 "오늘부터 Free 플랜으로 전환됩니다. 지금 업그레이드하세요."
만료 후:      대시보드 배너 "Premium 혜택이 만료되었습니다. [업그레이드]"
```

---

## 6. 기술 구현 요약 (CTO 위임 사항)

### Phase A: Freemium 게이트 (우선순위: HIGH)
1. DB 스키마 변경 (섹션 3.2)
2. `getEffectiveTier()` 서버 유틸리티
3. AI 분류 API에 tier 체크 미들웨어 추가
4. Free 티어 feature limits 적용 (거래 내역 90일, 마일리지 20건/월, 수동 수정 30건/월)
5. 업그레이드 유도 모달 컴포넌트 (`<UpgradeGate>`)
6. 14일 무료 체험 자동 적용

### Phase B: Stripe 구독 (우선순위: HIGH)
1. Stripe 상품 및 가격 생성 (섹션 4.2)
2. `/api/stripe/checkout` — 체크아웃 세션 생성
3. `/api/stripe/webhook` — 구독 이벤트 처리
4. `/dashboard/billing` 페이지 — 현재 플랜, 업그레이드/취소 UI

### Phase C: Mongoori Rides 연동 (우선순위: MEDIUM)
1. `/api/internal/rider-benefit` webhook endpoint (섹션 3.1)
2. `pending_riders` 테이블 (가입 전 이메일 사전 등록)
3. 가입 시 pending_riders 이메일 매칭 로직
4. 만료 알림 이메일 cron job

---

## 7. 인수 조건 (Acceptance Criteria)

| # | 조건 | 우선순위 |
|---|------|---------|
| AC-1 | Free 사용자가 AI 분류 버튼 클릭 시 업그레이드 모달 표시 | P0 |
| AC-2 | Premium 사용자는 AI 분류 무제한 사용 가능 | P0 |
| AC-3 | 신규 가입 시 14일 Premium 체험 자동 시작 | P0 |
| AC-4 | Stripe 체크아웃 완료 후 즉시 Premium 활성화 | P0 |
| AC-5 | Mongoori Rides webhook 수신 시 해당 이메일 Premium 자동 부여 | P1 |
| AC-6 | Mongoori Rider 만료 30/7/0일 이메일 알림 발송 | P1 |
| AC-7 | Free 거래 내역 90일 초과분 접근 시 업그레이드 유도 | P1 |
| AC-8 | `/dashboard/billing` 에서 현재 플랜 확인 및 업그레이드/취소 가능 | P1 |
| AC-9 | Annual $99 플랜이 UI에서 primary CTA로 표시 | P2 |
| AC-10 | Stripe 결제 실패 시 7일 grace period 후 Free 다운그레이드 | P2 |

---

## 8. 관련 이슈

- 원본 이슈: [MON-1200](/MON/issues/MON-1200)
- Supabase 설정: [MON-779](/MON/issues/MON-779)
- tax.mongoori.com 코드베이스: `/home/bosgame/mongoori/mongoori-tax`

---

*spec version 1.0 — Product Manager (2026-03-18)*
