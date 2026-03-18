/**
 * Database types for Supabase tables (Phase 1 + Phase 2).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SubscriptionTier = 'free' | 'premium' | 'mongoori_rider';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  // Phase 3: freemium
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  premium_trial_ends_at: string | null;
  is_mongoori_rider: boolean;
  mongoori_rider_booking_id: string | null;
  mongoori_rider_rental_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface PendingRider {
  id: string;
  email: string;
  booking_id: string | null;
  rental_end_date: string;
  premium_until: string;
  invite_sent_at: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaidItem {
  id: string;
  user_id: string;
  plaid_item_id: string;
  institution_id: string | null;
  institution_name: string | null;
  access_token_encrypted: string;
  cursor_transactions: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaidAccount {
  id: string;
  plaid_item_id: string;
  plaid_account_id: string;
  name: string | null;
  type: string | null;
  subtype: string | null;
  mask: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  plaid_account_id: string | null;
  plaid_transaction_id: string | null;
  date: string;
  name: string | null;
  merchant_name: string | null;
  amount: number;
  currency: string;
  category_plaid: string[] | null;
  category_override: string | null;
  is_deductible: boolean | null;
  deduction_type: string | null;
  notes: string | null;
  // Phase 2: AI classification
  ai_category: string | null;
  ai_confidence: number | null;
  ai_explanation: string | null;
  ai_classified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MileageLog {
  id: string;
  user_id: string;
  date: string;
  miles: number;
  purpose: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassificationRule {
  id: string;
  user_id: string;
  keyword: string;
  schedule_c_category: string;
  is_deductible: boolean;
  created_at: string;
}
