/**
 * Simple AES-256-GCM encryption for Plaid access tokens at rest.
 * Uses PLAID_TOKEN_ENCRYPTION_KEY (min 32 chars). Node/crypto only (server-side).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const SALT_LEN = 16;
const TAG_LEN = 16;

function getKey(): Buffer {
  const secret = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY must be set and at least 32 characters");
  }
  return scryptSync(secret, "tax-plaid-salt", KEY_LEN);
}

/**
 * Encrypt a plaintext string (e.g. Plaid access token). Returns hex string.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("hex");
}

/**
 * Decrypt a hex string produced by encrypt().
 */
export function decrypt(ciphertextHex: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertextHex, "hex");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("Invalid ciphertext");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
