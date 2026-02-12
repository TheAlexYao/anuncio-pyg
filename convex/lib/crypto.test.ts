import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "crypto";
import { encrypt, decrypt } from "./crypto.js";

const TEST_KEY = randomBytes(32).toString("hex");

describe("encrypt/decrypt", () => {
  it("round-trips arbitrary text", () => {
    const text = "hello world, this is a secret token!";
    const encrypted = encrypt(text, TEST_KEY);
    assert.equal(decrypt(encrypted, TEST_KEY), text);
  });

  it("round-trips empty string", () => {
    const encrypted = encrypt("", TEST_KEY);
    assert.equal(decrypt(encrypted, TEST_KEY), "");
  });

  it("round-trips unicode text", () => {
    const text = "guaraníes ₲ — contraseña 🔑";
    const encrypted = encrypt(text, TEST_KEY);
    assert.equal(decrypt(encrypted, TEST_KEY), text);
  });

  it("returns format iv:tag:ciphertext (all hex)", () => {
    const encrypted = encrypt("test", TEST_KEY);
    const parts = encrypted.split(":");
    assert.equal(parts.length, 3, "should have 3 colon-separated parts");
    for (const part of parts) {
      assert.match(part!, /^[0-9a-f]+$/i, "each part should be hex");
    }
    // IV = 12 bytes = 24 hex chars
    assert.equal(parts[0]!.length, 24, "IV should be 24 hex chars");
    // Auth tag = 16 bytes = 32 hex chars
    assert.equal(parts[1]!.length, 32, "auth tag should be 32 hex chars");
  });

  it("produces different ciphertexts for the same input (random IV)", () => {
    const text = "same input";
    const a = encrypt(text, TEST_KEY);
    const b = encrypt(text, TEST_KEY);
    assert.notEqual(a, b);
  });

  it("throws on wrong key", () => {
    const encrypted = encrypt("secret", TEST_KEY);
    const wrongKey = randomBytes(32).toString("hex");
    assert.throws(() => decrypt(encrypted, wrongKey));
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("secret", TEST_KEY);
    const parts = encrypted.split(":");
    // Flip a byte in the ciphertext
    const tampered = parts[0] + ":" + parts[1] + ":ff" + parts[2]!.slice(2);
    assert.throws(() => decrypt(tampered, TEST_KEY));
  });

  it("throws on tampered auth tag", () => {
    const encrypted = encrypt("secret", TEST_KEY);
    const parts = encrypted.split(":");
    const tampered = parts[0] + ":ff" + parts[1]!.slice(2) + ":" + parts[2];
    assert.throws(() => decrypt(tampered, TEST_KEY));
  });

  it("throws on invalid key length", () => {
    assert.throws(() => encrypt("test", "tooshort"), /32 bytes/);
    assert.throws(() => decrypt("aa:bb:cc", "tooshort"), /32 bytes/);
  });

  it("throws on invalid format", () => {
    assert.throws(() => decrypt("not-valid-format", TEST_KEY), /format/);
  });
});
