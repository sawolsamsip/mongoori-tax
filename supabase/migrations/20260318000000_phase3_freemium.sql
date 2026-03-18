-- TaxBook Phase 3: Freemium subscription tiers + Mongoori Rides integration.
-- Run in Supabase SQL Editor or via supabase db push.

-- ─── Profiles: subscription fields ──────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT
    NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'premium', 'mongoori_rider')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS premium_trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_mongoori_rider BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mongoori_rider_booking_id TEXT,
  ADD COLUMN IF NOT EXISTS mongoori_rider_rental_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier
  ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires_at
  ON public.profiles(subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL;

-- ─── pending_riders: pre-register Mongoori Rides drivers before signup ───────

CREATE TABLE IF NOT EXISTS public.pending_riders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  booking_id TEXT,
  rental_end_date DATE NOT NULL,
  premium_until TIMESTAMPTZ NOT NULL,
  invite_sent_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_riders_email ON public.pending_riders(lower(email));

-- Service role only (no RLS needed for internal webhook use)
ALTER TABLE public.pending_riders ENABLE ROW LEVEL SECURITY;
-- No user-facing policies: accessed only via service role in API routes

-- ─── Update handle_new_user trigger to apply 14-day trial + pending rider ────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_pending pending_riders%ROWTYPE;
  v_trial_ends TIMESTAMPTZ := now() + interval '14 days';
BEGIN
  -- Check for pending Mongoori Rider pre-registration
  SELECT * INTO v_pending
  FROM public.pending_riders
  WHERE lower(email) = lower(NEW.email)
    AND claimed_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    -- Mongoori Rider: apply rider tier immediately
    INSERT INTO public.profiles (
      id, email, full_name,
      subscription_tier, subscription_expires_at,
      is_mongoori_rider, mongoori_rider_booking_id, mongoori_rider_rental_end,
      premium_trial_ends_at
    ) VALUES (
      NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name',
      'mongoori_rider', v_pending.premium_until,
      true, v_pending.booking_id, v_pending.rental_end_date::timestamptz,
      v_trial_ends
    );
    -- Mark pending record as claimed
    UPDATE public.pending_riders
    SET claimed_at = now(), updated_at = now()
    WHERE id = v_pending.id;
  ELSE
    -- Standard signup: free tier with 14-day trial
    INSERT INTO public.profiles (
      id, email, full_name,
      subscription_tier,
      premium_trial_ends_at
    ) VALUES (
      NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name',
      'free',
      v_trial_ends
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── manual_edit_counts: track monthly manual category overrides ──────────────

CREATE TABLE IF NOT EXISTS public.manual_edit_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- first day of month, e.g. 2026-03-01
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.manual_edit_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own edit counts"
  ON public.manual_edit_counts FOR SELECT USING (auth.uid() = user_id);
