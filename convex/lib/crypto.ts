"use node";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param text - The plaintext to encrypt
 * @param key - 32-byte hex-encoded encryption key
 * @returns String in format "iv:tag:ciphertext" (all hex)
 */
export function encrypt(text: string, key: string): string {
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("Encryption key must be 32 bytes (64 hex characters)");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a string produced by encrypt().
 * @param data - Encrypted string in format "iv:tag:ciphertext" (all hex)
 * @param key - 32-byte hex-encoded encryption key
 * @returns The original plaintext
 */
export function decrypt(data: string, key: string): string {
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("Encryption key must be 32 bytes (64 hex characters)");
  }

  const parts = data.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format: expected 'iv:tag:ciphertext'");
  }

  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const encrypted = Buffer.from(parts[2]!, "hex");

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
