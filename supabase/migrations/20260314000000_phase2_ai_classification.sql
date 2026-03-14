-- TaxBook Phase 2: AI classification fields + mileage tracking.
-- Run in Supabase SQL Editor or via supabase db push.

-- AI classification fields on transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS ai_category TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS ai_explanation TEXT,
  ADD COLUMN IF NOT EXISTS ai_classified_at TIMESTAMPTZ;

-- Mileage logs: for IRS standard mileage deduction ($0.725/mile in 2026)
CREATE TABLE IF NOT EXISTS public.mileage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  miles NUMERIC(10, 2) NOT NULL CHECK (miles > 0),
  purpose TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_user_date ON public.mileage_logs(user_id, date DESC);

ALTER TABLE public.mileage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own mileage_logs"
  ON public.mileage_logs FOR ALL USING (auth.uid() = user_id);

-- User classification rules: custom override rules stored per user
CREATE TABLE IF NOT EXISTS public.classification_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  schedule_c_category TEXT NOT NULL,
  is_deductible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classification_rules_user ON public.classification_rules(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_classification_rules_user_keyword
  ON public.classification_rules(user_id, lower(keyword));

ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own classification_rules"
  ON public.classification_rules FOR ALL USING (auth.uid() = user_id);
