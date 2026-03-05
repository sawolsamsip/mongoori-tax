/**
 * Plaid API client. Uses sandbox by default (NEXT_PUBLIC_PLAID_ENV).
 * Never expose access_token to client; store encrypted in DB.
 */

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  CountryCode,
  Products,
} from "plaid";

const env = process.env.NEXT_PUBLIC_PLAID_ENV || "sandbox";
const basePath =
  env === "production"
    ? PlaidEnvironments.production
    : env === "development"
      ? PlaidEnvironments.development
      : PlaidEnvironments.sandbox;

function getConfig() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be set");
  }
  return new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });
}

let plaidClient: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
  if (!plaidClient) {
    plaidClient = new PlaidApi(getConfig());
  }
  return plaidClient;
}

export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us];
export const PLAID_PRODUCTS: Products[] = [Products.Transactions];
