# Tax — Implementation Phases

AI bookkeeping & tax-prep for US freelancers/LLC/S-Corp (Irvine, CA).  
**Stack:** Next.js 15 App Router, Tailwind, TypeScript, Supabase, Plaid, Claude.

---

## Phase 1: Setup + Plaid ✅

- [x] Next.js 15 + Tailwind + TypeScript scaffold
- [x] Supabase: auth, PostgreSQL schema, RLS, storage bucket (receipts)
- [x] Plaid: sandbox → production, Link token, exchange, webhooks
- [x] Auto fetch transactions (daily/weekly cron or on-demand)
- [x] Encrypt Plaid access tokens at rest
- [x] Connect-bank UI + transaction list + env.example

**Deliverables:** User can sign up, connect a bank via Plaid, see synced transactions.

---

## Phase 2: AI Core ✅ (current)

- [x] Claude (claude-haiku-4-5) for every unclassified transaction
- [x] IRS Pub 463/535/334 few-shot prompts (vehicle, phone, insurance, meals 50%, professional fees)
- [x] Output schema: `{ category, is_deductible, deduction_type, confidence, explanation }`
- [x] Inline category override via CategorySelect (manual overrides preserved over AI)
- [x] DeductionSummary: YTD totals per Schedule C category + estimated tax savings
- [x] Mileage tracker: $0.725/mile (2026 IRS rate), CRUD API + UI (Schedule C Line 9)
- [x] DB: ai_category, ai_confidence, ai_explanation, ai_classified_at columns + mileage_logs table
- [ ] RAG: IRS publications in pgvector (Phase 3+)
- [ ] Receipt/Invoice OCR via Claude Vision (Phase 3+)

**Deliverables:** AI auto-categorization (✦ badge), Schedule C deduction dashboard, mileage tracker, manual override UI.

---

## Phase 3: UI & Dashboard

- Monthly/annual views, Recharts (income/expenses, deduction summary)
- Dark mode, responsive PWA
- User can review/edit AI decisions; error logging + manual entry fallback
- Freemium flag (env): basic free, advanced scans paid

**Deliverables:** Dashboard, charts, mobile PWA, override UX.

---

## Phase 4: Reports + Polish

- Schedule C–ready CSV/PDF (pdf-lib or react-pdf)
- Tax estimate calculator (income − deductions × bracket, filing status)
- TurboTax/CPA export (no direct filing)
- Security audit, Plaid production checklist, Vercel deployment

**Deliverables:** Tax-ready exports, estimate, production deploy.
