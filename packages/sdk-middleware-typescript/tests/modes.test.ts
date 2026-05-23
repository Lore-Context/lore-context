/**
 * Tests for S6: 3 modes (hybrid/context/tools) behave per spec; writes golden
 * fixtures used for cross-language parity check with Lane T (T5).
 *
 * Trace shape is intentionally simple + deterministic so Python pytest can
 * deep-equal against the same file:
 *
 *   {
 *     "mode": "hybrid" | "context" | "tools",
 *     "client_type": "openai",
 *     "events": [
 *       { "kind": "inject" | "retain", "skipped": bool, "reason": string | null }
 *     ]
 *   }
 */
import { describe, it, expect, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { withMemoryHooks } from "../src/index.js";
import type { MiddlewareMode } from "../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GOLDEN_DIR = resolve(__dirname, "__snapshots__/middleware-modes");
mkdirSync(GOLDEN_DIR, { recursive: true });

interface TraceEvent {
  kind: "inject" | "retain";
  skipped: boolean;
  reason: string | null;
}

function makeCollector(mode: MiddlewareMode) {
  const events: TraceEvent[] = [];
  return {
    events,
    options: {
      mode,
      onInjectAudit: (e: { skipped: boolean; reason?: string }) =>
        events.push({ kind: "inject", skipped: e.skipped, reason: e.reason ?? null }),
      onRetainAudit: (e: { skipped: boolean; reason?: string }) =>
        events.push({ kind: "retain", skipped: e.skipped, reason: e.reason ?? null }),
    },
  };
}

const expectedTraces: Record<MiddlewareMode, { mode: MiddlewareMode; client_type: string; events: TraceEvent[] }> = {
  hybrid: {
    mode: "hybrid",
    client_type: "openai",
    events: [
      { kind: "inject", skipped: false, reason: null },
      { kind: "retain", skipped: false, reason: null },
    ],
  },
  context: {
    mode: "context",
    client_type: "openai",
    events: [
      { kind: "inject", skipped: false, reason: null },
      { kind: "retain", skipped: false, reason: null },
    ],
  },
  tools: {
    mode: "tools",
    client_type: "openai",
    events: [],
  },
};

describe("withMemoryHooks (S6) — 3 modes + golden fixtures", () => {
  for (const mode of ["hybrid", "context", "tools"] as const) {
    it(`mode='${mode}': canonical trace matches golden + writes ${mode}.golden.json`, async () => {
      const collector = makeCollector(mode);
      const mockLore = {
        contextQuery: vi.fn().mockResolvedValue({ contextBlock: "User context." }),
        memoryWrite: vi.fn().mockResolvedValue({ memoryId: "mem-1" }),
      };
      const originalCreate = vi.fn().mockResolvedValue({
        id: "cc-test",
        choices: [{ message: { role: "assistant", content: "ok" }, index: 0 }],
      });
      const mockOpenAI = { chat: { completions: { create: originalCreate } } };

      const client = withMemoryHooks(
        mockOpenAI as unknown as Record<string, unknown>,
        mockLore as never,
        collector.options,
      ) as { chat: { completions: { create: (args: unknown) => Promise<unknown> } } };

      await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello." }],
      });
      // Allow fire-and-forget retain to settle
      await new Promise((r) => setTimeout(r, 20));

      const trace = {
        mode,
        client_type: "openai",
        events: collector.events,
      };

      expect(trace).toEqual(expectedTraces[mode]);

      // Mode-specific extra assertions
      if (mode === "tools") {
        expect(mockLore.contextQuery).not.toHaveBeenCalled();
        expect(mockLore.memoryWrite).not.toHaveBeenCalled();
      } else {
        expect(mockLore.contextQuery).toHaveBeenCalledTimes(1);
        expect(mockLore.memoryWrite).toHaveBeenCalledTimes(1);
        // memoryWrite carries idempotency_key
        const writeArgs = mockLore.memoryWrite.mock.calls[0]?.[0] as { idempotency_key?: string };
        expect(typeof writeArgs.idempotency_key).toBe("string");
        expect(writeArgs.idempotency_key?.length ?? 0).toBeGreaterThan(0);
      }

      // Write golden file for Lane T consumption (T5)
      const goldenPath = resolve(GOLDEN_DIR, `${mode}.golden.json`);
      writeFileSync(goldenPath, JSON.stringify(expectedTraces[mode], null, 2) + "\n");
    });
  }
});
