/**
 * Database types for Supabase tables (Phase 1).
 * Extend as we add columns (e.g. category_override, is_deductible in Phase 2).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
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
  created_at: string;
  updated_at: string;
}
