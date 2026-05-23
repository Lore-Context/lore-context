import { describe, expect, it } from "vitest";
import {
  encryptString,
  decryptString,
  encryptSymbolFields,
  decryptSymbolFields,
  deterministicIdentifier,
} from "../src/encryption-tier2.js";

describe("tier2 e2e round-trip (P4)", () => {
  it("round-trip preserves exact bytes for a short signature", () => {
    const plaintext = "function fetchUser(id: string): Promise<User>";
    const passphrase = "correct-horse-battery-staple-2026-05-13";
    const envelope = encryptString(plaintext, passphrase);
    expect(envelope).not.toEqual(plaintext);
    expect(envelope.length).toBeGreaterThan(plaintext.length);
    const recovered = decryptString(envelope, passphrase);
    expect(recovered).toEqual(plaintext);
  });

  it("round-trip preserves a multi-line doc comment", () => {
    const plaintext = [
      "/**",
      " * Compute the SHA-256 hash of a buffer.",
      " * @param input - raw bytes",
      " * @returns hex digest",
      " */",
    ].join("\n");
    const pass = "another-test-passphrase";
    const recovered = decryptString(encryptString(plaintext, pass), pass);
    expect(recovered).toEqual(plaintext);
  });

  it("each encrypt of the same plaintext produces a different envelope (random salt + iv)", () => {
    const pass = "same-pass";
    const a = encryptString("hello", pass);
    const b = encryptString("hello", pass);
    expect(a).not.toEqual(b);
    expect(decryptString(a, pass)).toEqual("hello");
    expect(decryptString(b, pass)).toEqual("hello");
  });

  it("wrong passphrase fails the AES-GCM auth tag — decryption throws", () => {
    const envelope = encryptString("secret data", "right-pass");
    expect(() => decryptString(envelope, "wrong-pass")).toThrow();
  });

  it("tampered ciphertext fails the auth tag", () => {
    const pass = "pass-1";
    const envelope = encryptString("hello world", pass);
    // Flip one base64 character near the end of the ciphertext.
    const buf = Buffer.from(envelope, "base64");
    buf[buf.length - 20] ^= 0xff;
    const tampered = buf.toString("base64");
    expect(() => decryptString(tampered, pass)).toThrow();
  });

  it("symbol-field encryption: name/qname use deterministic HMAC, signature/doc decrypt round-trips", () => {
    // CRITICAL 6 — Tier-2 split:
    //   - name / qualified_name → deterministic HMAC (one-way, equality-preserving)
    //   - signature / doc_comment → random-IV AES-GCM (decryptable)
    const original = {
      name: "fetchUser",
      qualified_name: "billing.api.fetchUser",
      kind: "function" as const,
      signature: "function fetchUser(id: string): Promise<User>",
      doc_comment: "/** Fetch a user by ID from the billing service. */",
      start_line: 42,
      end_line: 58,
      is_exported: true,
    };
    const pass = "tier-2-test-pass";
    const encrypted = encryptSymbolFields(original, pass);
    expect(encrypted.name).not.toEqual(original.name);
    expect(encrypted.signature).not.toEqual(original.signature);
    expect(encrypted.doc_comment).not.toEqual(original.doc_comment);
    // Structural fields pass through unchanged.
    expect(encrypted.kind).toEqual(original.kind);
    expect(encrypted.start_line).toEqual(original.start_line);
    expect(encrypted.is_exported).toEqual(original.is_exported);

    const recovered = decryptSymbolFields(encrypted, pass);
    // signature + doc_comment recover bytewise
    expect(recovered.signature).toEqual(original.signature);
    expect(recovered.doc_comment).toEqual(original.doc_comment);
    // name + qualified_name remain as their HMAC outputs (one-way by design)
    expect(recovered.name).toEqual(encrypted.name);
    expect(recovered.qualified_name).toEqual(encrypted.qualified_name);
  });

  it("symbol-field handles missing optional fields without throwing", () => {
    const original = {
      name: "Logger",
      qualified_name: "util.Logger",
      kind: "class" as const,
      start_line: 1,
      end_line: 10,
      is_exported: true,
    };
    const pass = "pass-x";
    const encrypted = encryptSymbolFields(original, pass);
    expect(encrypted.signature).toBeUndefined();
    expect(encrypted.doc_comment).toBeUndefined();
    const recovered = decryptSymbolFields(encrypted, pass);
    expect(recovered.kind).toEqual(original.kind);
    expect(recovered.start_line).toEqual(original.start_line);
    expect(recovered.is_exported).toEqual(original.is_exported);
  });

  it("CRITICAL 6: deterministicIdentifier produces identical output for same (plaintext, passphrase)", () => {
    const pass = "det-pass-001";
    const a = deterministicIdentifier("Module.foo", pass);
    const b = deterministicIdentifier("Module.foo", pass);
    expect(a).toEqual(b);
  });

  it("CRITICAL 6: deterministicIdentifier produces different outputs for different plaintexts", () => {
    const pass = "det-pass-002";
    expect(deterministicIdentifier("a", pass)).not.toEqual(deterministicIdentifier("b", pass));
  });

  it("CRITICAL 6: deterministicIdentifier output matches base64 (the EncryptedSymbolRecordSchema shape)", () => {
    const out = deterministicIdentifier("Some.Identifier", "pass-base64-shape");
    expect(out).toMatch(/^[A-Za-z0-9+/]{20,}={0,2}$/);
  });

  it("CRITICAL 6: encryptSymbolFields(name) is deterministic across calls", () => {
    const pass = "tier2-det-symfields";
    const a = encryptSymbolFields(
      { name: "x", qualified_name: "M.x", kind: "function" as const, start_line: 1, end_line: 2, is_exported: true },
      pass,
    );
    const b = encryptSymbolFields(
      { name: "x", qualified_name: "M.x", kind: "function" as const, start_line: 1, end_line: 2, is_exported: true },
      pass,
    );
    expect(a.name).toEqual(b.name);
    expect(a.qualified_name).toEqual(b.qualified_name);
  });

  it("rejects empty or short envelope (defensive)", () => {
    expect(() => decryptString("", "pass")).toThrow();
    expect(() => decryptString("AAAA", "pass")).toThrow();
  });
});
