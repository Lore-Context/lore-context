import { describe, expect, it } from "vitest";
import { buildIdempotencyKey, canonicalSessionId, hashContent } from "../src/idempotency.js";
import type { CaptureTurn } from "../src/types.js";

const turnsA: CaptureTurn[] = [
  { index: 0, role: "user", text: "Hello" },
  { index: 1, role: "assistant", text: "Hi" }
];

const turnsBSameContent: CaptureTurn[] = [
  { index: 0, role: "user", text: "Hello" },
  { index: 1, role: "assistant", text: "Hi" }
];

const turnsC: CaptureTurn[] = [
  { index: 0, role: "user", text: "Hello!" },
  { index: 1, role: "assistant", text: "Hi" }
];

describe("idempotency key", () => {
  it("is deterministic across runs with identical content", () => {
    expect(buildIdempotencyKey("claude-code", "abc", turnsA)).toBe(
      buildIdempotencyKey("claude-code", "abc", turnsBSameContent)
    );
  });

  it("differs when content differs", () => {
    expect(buildIdempotencyKey("claude-code", "abc", turnsA)).not.toBe(
      buildIdempotencyKey("claude-code", "abc", turnsC)
    );
  });

  it("differs when provider differs", () => {
    expect(buildIdempotencyKey("claude-code", "abc", turnsA)).not.toBe(
      buildIdempotencyKey("codex", "abc", turnsA)
    );
  });

  it("differs when session id differs", () => {
    expect(buildIdempotencyKey("claude-code", "abc", turnsA)).not.toBe(
      buildIdempotencyKey("claude-code", "xyz", turnsA)
    );
  });

  it("hashContent stays stable", () => {
    expect(hashContent(turnsA)).toBe(hashContent(turnsBSameContent));
  });

  it("canonicalSessionId formats provider:id", () => {
    expect(canonicalSessionId("codex", "sess-1")).toBe("codex:sess-1");
  });
});
