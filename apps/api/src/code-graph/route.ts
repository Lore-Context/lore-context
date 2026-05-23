/**
 * Lore v2.0.4 — Lane R HTTP route handler: POST /v1/code-graph/upsert
 *
 * Auth: cloud bearer token (same vault-scoping pattern as /v1/butler/dreams/recent).
 * Body: UpsertPayloadSchema (Zod, strict)
 * Returns: UpsertSummary on success, 400 on validation failure, 401/403 on auth failure.
 *
 * See: docs/plans/v2.0.4-plan.md §2 Lane R
 */

import { UpsertPayloadSchema } from "@lore-context/sdk/code-graph-types";
import { validateFilePayload } from "./validators.js";
import { resolveAndUpsert, type CodeSymbolEmbedQueue, type PgPool } from "./resolver.js";
import { log } from "../logger.js";

// ---------------------------------------------------------------------------
// Route dependencies injected by index.ts
// ---------------------------------------------------------------------------

export interface CodeGraphRouteDeps {
  /**
   * Postgres pool — the route MUST acquire a dedicated client via
   * `pool.connect()` so BEGIN/COMMIT/ROLLBACK run on the same physical
   * connection. Passing a raw Pool (where every .query() picks any client)
   * would silently break the transaction.
   */
  pgPool: PgPool;
  /** Optional BullMQ queue for async embedding */
  embedQueue?: CodeSymbolEmbedQueue;
}

const IS_PRODUCTION = process.env["NODE_ENV"] === "production";

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function handleCodeGraphUpsert(
  request: Request,
  vaultId: string,
  deps: CodeGraphRouteDeps,
): Promise<Response> {
  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "code_graph.payload_invalid", issues: ["request body is not valid JSON"] }, 400);
  }

  // Validate via Zod schema
  const parseResult = UpsertPayloadSchema.safeParse(body);
  if (!parseResult.success) {
    return json(
      { error: "code_graph.payload_invalid", issues: parseResult.error.issues },
      400,
    );
  }

  const payload = parseResult.data;
  const e2eEncrypted = payload.e2e_encrypted === true;

  // Per-file content-type validation (P3/P7/P8).
  // When e2e_encrypted=true, symbol fields contain ciphertext — skip per-field
  // identifier/signature/secret-pattern checks (they'd all fail on base64).
  // The EncryptedSymbolRecordSchema already validated the base64 shape upstream.
  if (!e2eEncrypted) {
    for (const file of payload.files) {
      // Type assertion safe: when e2e_encrypted is false/absent, files is FilePayload[]
      const validationResult = validateFilePayload(file as import("@lore-context/sdk/code-graph-types").FilePayload, false);
      if (!validationResult.ok) {
        return json({ error: validationResult.error, reason: validationResult.reason }, 400);
      }
    }
  }

  // Upsert — acquire a dedicated PoolClient so BEGIN/COMMIT/ROLLBACK run on
  // the same physical connection (otherwise pg.Pool may dispatch each .query()
  // to a different connection, silently breaking the transaction).
  const client = await deps.pgPool.connect();
  try {
    await client.query("BEGIN");
    const summary = await resolveAndUpsert(client, vaultId, payload, deps.embedQueue);
    await client.query("COMMIT");
    return json(summary, 200);
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rbErr) {
      log.error("code-graph: ROLLBACK failed after upsert error", { vaultId, error: String(rbErr) });
    }
    log.error("code-graph: upsert failed", { vaultId, error: String(err) });
    const body: Record<string, unknown> = { error: "code_graph.upsert_failed" };
    if (!IS_PRODUCTION) body["reason"] = String(err);
    return json(body, 500);
  } finally {
    client.release?.();
  }
}

// ---------------------------------------------------------------------------
// Minimal JSON response helper (avoids importing from index.ts to stay lean)
// ---------------------------------------------------------------------------

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
