-- Phase 2: Index for deduction_type queries (Schedule C summary)
CREATE INDEX IF NOT EXISTS idx_transactions_deduction_type
  ON public.transactions(user_id, deduction_type, date DESC)
  WHERE deduction_type IS NOT NULL;

-- Partial index for transactions with a Plaid category (for auto-classification queries)
CREATE INDEX IF NOT EXISTS idx_transactions_category_plaid_notnull
  ON public.transactions(user_id, date DESC)
  WHERE category_plaid IS NOT NULL;
