/**
 * Freemium tier logic for tax.mongoori.com.
 * Phase 3 — MON-1201
 */

import type { Profile, SubscriptionTier } from "@/types/database";

/**
 * Resolve the effective tier for a profile, accounting for expiry dates and trials.
 * Server-side only — never call this from client components.
 */
export function getEffectiveTier(profile: Profile): SubscriptionTier {
  const now = new Date();

  // 1. Mongoori Rider: check expiry
  if (profile.subscription_tier === 'mongoori_rider' && profile.subscription_expires_at) {
    if (new Date(profile.subscription_expires_at) > now) return 'mongoori_rider';
    // Expired → fall through to free (background cron will update DB)
  }

  // 2. Paid Premium: check Stripe subscription expiry
  if (profile.subscription_tier === 'premium' && profile.subscription_expires_at) {
    if (new Date(profile.subscription_expires_at) > now) return 'premium';
  }

  // 3. 14-day free trial (treated as premium)
  if (profile.premium_trial_ends_at && new Date(profile.premium_trial_ends_at) > now) {
    return 'premium';
  }

  return 'free';
}

/** True if the effective tier grants premium-level access. */
export function isPremium(profile: Profile): boolean {
  const tier = getEffectiveTier(profile);
  return tier === 'premium' || tier === 'mongoori_rider';
}

/** Free tier feature limits */
export const FREE_LIMITS = {
  TRANSACTION_DAYS: 90,
  MILEAGE_PER_MONTH: 20,
  MANUAL_EDITS_PER_MONTH: 30,
  PLAID_ACCOUNTS: 1,
} as const;

export const PREMIUM_LIMITS = {
  PLAID_ACCOUNTS: 3,
} as const;

/** Stripe price IDs — set via env vars so they can differ between test/live */
export function getStripePrices() {
  return {
    monthly: process.env.STRIPE_PRICE_MONTHLY!,
    annual: process.env.STRIPE_PRICE_ANNUAL!,
  };
}
