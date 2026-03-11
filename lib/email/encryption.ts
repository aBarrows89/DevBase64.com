/**
 * Email Client Encryption Utilities
 *
 * Uses AES-256-GCM for encrypting OAuth tokens, IMAP passwords,
 * and sensitive email content.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment variable.
 * Key should be a 64-character hex string (32 bytes).
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
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM.
 *
 * @param ciphertext - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format. Expected iv:authTag:encrypted");
  }

  const [ivHex, authTagHex, encrypted] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a new encryption key (for initial setup).
 *
 * @returns A 64-character hex string suitable for EMAIL_ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}

/**
 * Check if a string is already encrypted (has the expected format).
 *
 * @param value - The string to check
 * @returns True if the string appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;

  const parts = value.split(":");
  if (parts.length !== 3) return false;

  const [iv, authTag, encrypted] = parts;

  // Check if parts are valid hex strings with expected lengths
  return (
    iv.length === IV_LENGTH * 2 &&
    authTag.length === AUTH_TAG_LENGTH * 2 &&
    encrypted.length > 0 &&
    /^[a-f0-9]+$/i.test(iv) &&
    /^[a-f0-9]+$/i.test(authTag) &&
    /^[a-f0-9]+$/i.test(encrypted)
  );
}

// ============ SENSITIVE CONTENT DETECTION ============

/**
 * Keywords that indicate sensitive content requiring encryption.
 */
const SENSITIVE_KEYWORDS = [
  "password",
  "passwd",
  "ssn",
  "social security",
  "credit card",
  "creditcard",
  "bank account",
  "routing number",
  "api key",
  "api_key",
  "apikey",
  "secret",
  "confidential",
  "private key",
  "privatekey",
  "access token",
  "accesstoken",
  "bearer",
  "oauth",
  "credentials",
];

/**
 * Patterns that indicate sensitive content (SSN, credit cards, etc.)
 */
const SENSITIVE_PATTERNS = [
  // SSN: XXX-XX-XXXX
  /\b\d{3}-\d{2}-\d{4}\b/,
  // Credit card: 16 digits with optional spaces/dashes
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
  // Bank routing: 9 digits
  /\b\d{9}\b.*routing/i,
  /routing.*\b\d{9}\b/i,
  // API keys: Long alphanumeric strings (common patterns)
  /\b(sk|pk|api|key)[-_][a-zA-Z0-9]{20,}\b/i,
];

/**
 * Check if email content contains sensitive information that should be encrypted.
 *
 * @param subject - Email subject
 * @param body - Email body (text or HTML)
 * @returns True if sensitive content is detected
 */
export function containsSensitiveContent(subject: string, body: string): boolean {
  const fullText = `${subject} ${body}`.toLowerCase();

  // Check for sensitive keywords
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (fullText.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  // Check for sensitive patterns
  const fullTextOriginal = `${subject} ${body}`;
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(fullTextOriginal)) {
      return true;
    }
  }

  return false;
}

/**
 * Encrypt email content if it contains sensitive information.
 * Returns the original content if not sensitive, or encrypted content with a flag.
 *
 * @param subject - Email subject
 * @param bodyText - Plain text body
 * @param bodyHtml - HTML body
 * @returns Object with potentially encrypted content and flag
 */
export function encryptSensitiveEmail(
  subject: string,
  bodyText: string | undefined,
  bodyHtml: string | undefined
): {
  bodyText: string | undefined;
  bodyHtml: string | undefined;
  isEncrypted: boolean;
} {
  const isSensitive = containsSensitiveContent(subject, bodyText || bodyHtml || "");

  if (!isSensitive) {
    return { bodyText, bodyHtml, isEncrypted: false };
  }

  return {
    bodyText: bodyText ? encrypt(bodyText) : undefined,
    bodyHtml: bodyHtml ? encrypt(bodyHtml) : undefined,
    isEncrypted: true,
  };
}

/**
 * Decrypt email content if it was encrypted.
 *
 * @param bodyText - Potentially encrypted plain text body
 * @param bodyHtml - Potentially encrypted HTML body
 * @param isEncrypted - Whether the content is encrypted
 * @returns Decrypted content
 */
export function decryptEmailContent(
  bodyText: string | undefined,
  bodyHtml: string | undefined,
  isEncrypted: boolean
): {
  bodyText: string | undefined;
  bodyHtml: string | undefined;
} {
  if (!isEncrypted) {
    return { bodyText, bodyHtml };
  }

  return {
    bodyText: bodyText ? decrypt(bodyText) : undefined,
    bodyHtml: bodyHtml ? decrypt(bodyHtml) : undefined,
  };
}

// ============ ATTACHMENT ENCRYPTION ============

/**
 * Encrypt attachment data (Buffer).
 *
 * @param data - The attachment data as Buffer
 * @returns Encrypted data as Buffer (iv + authTag + ciphertext)
 */
export function encryptAttachment(data: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: iv (12 bytes) + authTag (16 bytes) + encrypted
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt attachment data (Buffer).
 *
 * @param encryptedData - The encrypted data (iv + authTag + ciphertext)
 * @returns Decrypted data as Buffer
 */
export function decryptAttachment(encryptedData: Buffer): Buffer {
  const key = getEncryptionKey();

  // Extract parts
  const iv = encryptedData.subarray(0, IV_LENGTH);
  const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
