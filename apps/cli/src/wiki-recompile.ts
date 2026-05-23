// Lore v1.8 Lane M — V1.8-M7. `lore wiki-recompile` CLI subcommand.
//
// Re-enqueues per-entity wiki compile messages onto the existing
// `lore-wiki-compile-v13` SQS queue so a vault's wiki pages can be re-rendered
// retroactively (e.g. after the M4 LLM-rewriter defaults flip).
//
// Decisions kept narrow on purpose:
//   * Reads `memory_wiki_pages` directly so we recompile only entities the
//     compiler has already seen — avoids touching the entity table or the
//     compiler's confidence heuristic.
//   * Postgres + SQS clients are dependency-injected so the test seam can
//     run without `pg` / `@aws-sdk/client-sqs` and so a future caller can
//     reuse `runWikiRecompile()` from a non-CLI entry point.
//   * Dry-run mode emits only the count — operators can plan SQS burst load
//     before paying for a real recompile run.
//   * Idempotency is guaranteed by `wikiPageIdFor(vaultId, entityId)` inside
//     the compiler, not by SQS deduplication. We still pass a deterministic
//     `MessageDeduplicationId` so a future FIFO migration is a no-op.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export interface WikiRecompileArgs {
  vaultId: string;
  since?: string;
  dryRun: boolean;
  queueUrl?: string;
}

export interface WikiRecompilePgClient {
  query(
    text: string,
    values: ReadonlyArray<string | null>,
  ): Promise<{ rows: Array<{ entity_id: string }> }>;
}

export interface WikiRecompileSqsClient {
  sendMessage(input: {
    QueueUrl: string;
    MessageBody: string;
    MessageDeduplicationId?: string;
    MessageGroupId?: string;
  }): Promise<unknown>;
}

export interface WikiRecompileDeps {
  pgClient: WikiRecompilePgClient;
  sqsClient?: WikiRecompileSqsClient;
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
}

export interface WikiRecompileResult {
  exitCode: number;
  enqueuedCount: number;
  totalEntities: number;
  dryRun: boolean;
}

/**
 * Run the wiki-recompile flow with injected deps. Returns the exit code so a
 * caller can decide whether to throw or log. Never throws on Postgres / SQS
 * failure — surfaces as exit 1 with a stderr line.
 */
export async function runWikiRecompile(
  args: WikiRecompileArgs,
  deps: WikiRecompileDeps,
): Promise<WikiRecompileResult> {
  const validation = validateArgs(args);
  if (validation) {
    deps.stderr.write(`${validation}\n`);
    return { exitCode: 1, enqueuedCount: 0, totalEntities: 0, dryRun: args.dryRun };
  }

  let entityIds: string[];
  try {
    entityIds = await fetchEntityIds(args, deps.pgClient);
  } catch (err) {
    deps.stderr.write(`postgres_error: ${errorMessage(err)}\n`);
    return { exitCode: 1, enqueuedCount: 0, totalEntities: 0, dryRun: args.dryRun };
  }

  const total = entityIds.length;

  if (args.dryRun) {
    deps.stdout.write(
      `dry-run: would enqueue ${total} entities for vault ${args.vaultId}\n`,
    );
    return { exitCode: 0, enqueuedCount: 0, totalEntities: total, dryRun: true };
  }

  if (!deps.sqsClient) {
    deps.stderr.write("sqs_client_missing: cannot enqueue without SQS client\n");
    return { exitCode: 1, enqueuedCount: 0, totalEntities: total, dryRun: false };
  }
  if (!args.queueUrl) {
    deps.stderr.write(
      "queue_url_missing: set LORE_SQS_URL_WIKI_COMPILE or pass --queue-url\n",
    );
    return { exitCode: 1, enqueuedCount: 0, totalEntities: total, dryRun: false };
  }

  let enqueued = 0;
  for (const entityId of entityIds) {
    try {
      await deps.sqsClient.sendMessage({
        QueueUrl: args.queueUrl,
        MessageBody: JSON.stringify({
          entity_id: entityId,
          vault_id: args.vaultId,
          trigger: "batch-recompile-v18",
        }),
        MessageDeduplicationId: dedupeId(args.vaultId, entityId),
        MessageGroupId: args.vaultId,
      });
      enqueued += 1;
    } catch (err) {
      deps.stderr.write(`sqs_error: ${errorMessage(err)} (after ${enqueued}/${total})\n`);
      return { exitCode: 1, enqueuedCount: enqueued, totalEntities: total, dryRun: false };
    }
  }

  deps.stdout.write(
    `Enqueued ${enqueued} / ${total} entities for vault ${args.vaultId}\n`,
  );
  return { exitCode: 0, enqueuedCount: enqueued, totalEntities: total, dryRun: false };
}

function validateArgs(args: WikiRecompileArgs): string | undefined {
  if (!args.vaultId) {
    return "missing_vault_id: --vault-id is required";
  }
  if (!UUID_RE.test(args.vaultId)) {
    return `invalid_vault_id: '${args.vaultId}' is not a valid UUID`;
  }
  if (args.since && !ISO_DATE_RE.test(args.since)) {
    return `invalid_since: '${args.since}' is not an ISO date (YYYY-MM-DD)`;
  }
  return undefined;
}

async function fetchEntityIds(
  args: WikiRecompileArgs,
  pg: WikiRecompilePgClient,
): Promise<string[]> {
  // Note: `entity_ids` is JSONB array per row; expand to a deduplicated entity
  // id list so each entity is enqueued at most once per run.
  const sql = `
    SELECT DISTINCT jsonb_array_elements_text(entity_ids) AS entity_id
    FROM memory_wiki_pages
    WHERE vault_id = $1
      AND ($2::timestamptz IS NULL OR updated_at >= $2::timestamptz)
    ORDER BY entity_id
  `;
  const since = args.since ?? null;
  const result = await pg.query(sql, [args.vaultId, since]);
  return result.rows.map((r) => r.entity_id);
}

function dedupeId(vaultId: string, entityId: string): string {
  return `wiki-recompile-${vaultId}-${entityId}`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Parse `lore wiki-recompile` flag set into a structured args object. */
export function parseWikiRecompileArgs(rawArgs: ReadonlyArray<string>): WikiRecompileArgs {
  const result: WikiRecompileArgs = { vaultId: "", dryRun: false };
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (arg === "--vault-id") {
      result.vaultId = rawArgs[++i] ?? "";
      continue;
    }
    if (arg === "--since") {
      result.since = rawArgs[++i] ?? "";
      continue;
    }
    if (arg === "--queue-url") {
      result.queueUrl = rawArgs[++i] ?? "";
      continue;
    }
    if (arg.startsWith("--vault-id=")) {
      result.vaultId = arg.slice("--vault-id=".length);
      continue;
    }
    if (arg.startsWith("--since=")) {
      result.since = arg.slice("--since=".length);
      continue;
    }
    if (arg.startsWith("--queue-url=")) {
      result.queueUrl = arg.slice("--queue-url=".length);
      continue;
    }
  }
  return result;
}
