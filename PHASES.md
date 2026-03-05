# Tax — Implementation Phases

AI bookkeeping & tax-prep for US freelancers/LLC/S-Corp (Irvine, CA).  
**Stack:** Next.js 15 App Router, Tailwind, TypeScript, Supabase, Plaid, Claude.

---

## Phase 1: Setup + Plaid ✅ (current)

- [x] Next.js 15 + Tailwind + TypeScript scaffold
- [x] Supabase: auth, PostgreSQL schema, RLS, storage bucket (receipts)
- [x] Plaid: sandbox → production, Link token, exchange, webhooks
- [x] Auto fetch transactions (daily/weekly cron or on-demand)
- [x] Encrypt Plaid access tokens at rest
- [x] Connect-bank UI + transaction list + env.example

**Deliverables:** User can sign up, connect a bank via Plaid, see synced transactions.

---

## Phase 2: AI Core

- Claude (or OpenRouter fallback) for every transaction/receipt
- Few-shot prompts: IRS Pub 463/535/334 (home office, mileage, supplies, software, meals 50%, travel)
- Output schema: `{ category, is_deductible, deduction_type, confidence, explanation, estimated_amount }`
- Custom user rules + overrides (DB table)
- RAG: embed IRS publications in Supabase pgvector + LangChain for complex cases
- Receipt/Invoice upload: image/PDF → OCR/Claude Vision → structured output → transaction + deduction check

**Deliverables:** Auto-categorization, deduction detection with IRS references, receipt parsing.

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
