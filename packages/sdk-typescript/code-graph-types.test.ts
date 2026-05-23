import { describe, expect, it } from "vitest";

import { UpsertPayloadSchema, buildUpsertPayload, stripSecretPatterns } from "./code-graph-types.js";

describe("code-graph wire payload schemas", () => {
  it("accepts the minimal Tier-1 structural upload payload", () => {
    const payload = buildUpsertPayload({
      repo: {
        name: "lore-cloud",
        primary_lang: "typescript",
      },
      files: [
        {
          relative_path: "src/index.ts",
          language: "typescript",
          content_hash: "0123456789abcdef",
          ast_hash: "fedcba9876543210",
          last_modified_at: "2026-05-13T00:00:00.000Z",
          symbols: [
            {
              name: "handler",
              qualified_name: "src.index.handler",
              kind: "function",
              signature: "handler(input: Request): Response",
              start_line: 1,
              end_line: 5,
              is_exported: true,
            },
          ],
          relations: [],
        },
      ],
    });

    expect(payload.files[0]?.symbols[0]?.qualified_name).toBe("src.index.handler");
  });

  it("rejects raw body fields through strict object validation", () => {
    const result = UpsertPayloadSchema.safeParse({
      repo: {
        name: "lore-cloud",
      },
      files: [
        {
          relative_path: "src/index.ts",
          language: "typescript",
          content_hash: "0123456789abcdef",
          ast_hash: "fedcba9876543210",
          last_modified_at: "2026-05-13T00:00:00.000Z",
          symbols: [
            {
              name: "handler",
              qualified_name: "src.index.handler",
              kind: "function",
              start_line: 1,
              end_line: 5,
              is_exported: true,
              function_body: "return secret;",
            },
          ],
          relations: [],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("redacts common secret patterns from doc comments", () => {
    expect(stripSecretPatterns("token sk-live-abcdefghijklmnop")).toContain(
      "[REDACTED:secret-pattern]",
    );
  });
});
