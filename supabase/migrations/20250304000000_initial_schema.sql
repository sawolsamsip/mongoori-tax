-- TaxBook Phase 1: Initial schema for auth, Plaid items, transactions.
-- Run in Supabase SQL Editor or via supabase db push.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles: extends Supabase auth.users (1:1 via id)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plaid items: one row per linked institution (access token stored encrypted)
CREATE TABLE public.plaid_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL UNIQUE,
  institution_id TEXT,
  institution_name TEXT,
  -- Encrypted access token (decrypt in API with PLAID_TOKEN_ENCRYPTION_KEY)
  access_token_encrypted TEXT NOT NULL,
  cursor_transactions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, plaid_item_id)
);

-- Plaid accounts: accounts under an item (checking, savings, credit)
CREATE TABLE public.plaid_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plaid_item_id UUID NOT NULL REFERENCES public.plaid_items(id) ON DELETE CASCADE,
  plaid_account_id TEXT NOT NULL,
  name TEXT,
  type TEXT,
  subtype TEXT,
  mask TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plaid_item_id, plaid_account_id)
);

-- Transactions: synced from Plaid (and later manual/receipts)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plaid_account_id UUID REFERENCES public.plaid_accounts(id) ON DELETE SET NULL,
  plaid_transaction_id TEXT,
  date DATE NOT NULL,
  name TEXT,
  merchant_name TEXT,
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  category_plaid TEXT[],
  category_override TEXT,
  is_deductible BOOLEAN,
  deduction_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plaid_account_id, plaid_transaction_id)
);

CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_transactions_plaid_id ON public.transactions(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;
CREATE INDEX idx_plaid_items_user ON public.plaid_items(user_id);

-- RLS: users see only their own data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own plaid_items"
  ON public.plaid_items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read plaid_accounts for own items"
  ON public.plaid_accounts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.plaid_items WHERE id = plaid_accounts.plaid_item_id AND user_id = auth.uid()
  ));
CREATE POLICY "Users can insert plaid_accounts for own items"
  ON public.plaid_accounts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.plaid_items WHERE id = plaid_accounts.plaid_item_id AND user_id = auth.uid()
  ));
CREATE POLICY "Users can update plaid_accounts for own items"
  ON public.plaid_accounts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.plaid_items WHERE id = plaid_accounts.plaid_item_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own transactions"
  ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for receipts (Phase 2+)
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
CREATE POLICY "Users can upload receipts"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can read own receipts"
  ON storage.objects FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own receipts"
  ON storage.objects FOR UPDATE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
