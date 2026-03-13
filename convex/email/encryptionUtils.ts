/**
 * Encryption utilities for Convex email actions.
 *
 * This is a duplicate of lib/email/encryption.ts for use in Convex actions.
 * Uses AES-256-GCM for encrypting/decrypting OAuth tokens.
 */

"use node";

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variable.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.EMAIL_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error("EMAIL_ENCRYPTION_KEY environment variable is not set");
  }

  if (keyHex.length !== 64) {
    throw new Error("EMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }

  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Check if a string is encrypted (has the expected format).
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  const [iv, authTag, encrypted] = parts;
  return (
    iv.length === IV_LENGTH * 2 &&
    authTag.length === AUTH_TAG_LENGTH * 2 &&
    encrypted.length > 0 &&
    /^[a-f0-9]+$/i.test(iv) &&
    /^[a-f0-9]+$/i.test(authTag) &&
    /^[a-f0-9]+$/i.test(encrypted)
  );
}

/**
 * Decrypt an encrypted string using AES-256-GCM.
 * Returns the original string if not encrypted (backwards compatibility).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";

  // If not encrypted, return as-is (backwards compatibility)
  if (!isEncrypted(ciphertext)) {
    return ciphertext;
  }

  // Check if encryption key is set
  const keyHex = process.env.EMAIL_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    console.warn("EMAIL_ENCRYPTION_KEY not set or invalid, returning password as-is");
    return ciphertext;
  }

  try {
    const parts = ciphertext.split(":");
    const [ivHex, authTagHex, encrypted] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    // Return original value if decryption fails
    return ciphertext;
  }
}
