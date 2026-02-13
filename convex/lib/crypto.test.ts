import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "crypto";
import { encrypt, decrypt } from "./crypto.js";

const TEST_KEY = randomBytes(32).toString("hex");

describe("crypto helpers", () => {
  it("round-trip: decrypt(encrypt(text)) === text", () => {
    const text = "hello world";
    assert.equal(decrypt(encrypt(text, TEST_KEY), TEST_KEY), text);
  });

  it("handles empty string", () => {
    assert.equal(decrypt(encrypt("", TEST_KEY), TEST_KEY), "");
  });

  it("handles unicode", () => {
    const text = "🇵🇾 Guaraníes ₲ñ";
    assert.equal(decrypt(encrypt(text, TEST_KEY), TEST_KEY), text);
  });

  it("handles long text", () => {
    const text = "a".repeat(10000);
    assert.equal(decrypt(encrypt(text, TEST_KEY), TEST_KEY), text);
  });

  it("produces iv:tag:ciphertext hex format", () => {
    const result = encrypt("test", TEST_KEY);
    const parts = result.split(":");
    assert.equal(parts.length, 3);
    // IV = 16 bytes = 32 hex chars
    assert.equal(parts[0]!.length, 32);
    // Auth tag = 16 bytes = 32 hex chars
    assert.equal(parts[1]!.length, 32);
    // All hex
    assert.match(result, /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
  });

  it("produces different ciphertexts for same input (random IV)", () => {
    const a = encrypt("same", TEST_KEY);
    const b = encrypt("same", TEST_KEY);
    assert.notEqual(a, b);
  });

  it("throws on wrong key", () => {
    const wrongKey = randomBytes(32).toString("hex");
    const encrypted = encrypt("secret", TEST_KEY);
    assert.throws(() => decrypt(encrypted, wrongKey));
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("secret", TEST_KEY);
    const parts = encrypted.split(":");
    // Flip a character in the ciphertext
    const tampered = parts[0] + ":" + parts[1] + ":ff" + parts[2]!.slice(2);
    assert.throws(() => decrypt(tampered, TEST_KEY));
  });

  it("throws on invalid format", () => {
    assert.throws(() => decrypt("not-valid", TEST_KEY));
  });
});
