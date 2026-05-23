// Lore v1.8 Lane M — V1.8-M7. Wires the wiki-recompile CLI command to real
// `pg` + `@aws-sdk/client-sqs` clients. Kept separate from `wiki-recompile.ts`
// so the unit tests can import the pure function without pulling in heavy
// SDKs, and so the CLI start-up cost is not paid until the subcommand runs.

import {
  runWikiRecompile,
  type WikiRecompileArgs,
  type WikiRecompilePgClient,
  type WikiRecompileResult,
  type WikiRecompileSqsClient,
} from "./wiki-recompile.js";

export interface WikiRecompileCliIo {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
}

/**
 * CLI bridge: lazy-load real Postgres + SQS clients and invoke
 * runWikiRecompile. Returns the structured result so the caller can decide
 * how to surface the exit code.
 */
export async function runWikiRecompileFromCli(
  args: WikiRecompileArgs,
  io: WikiRecompileCliIo,
  env: NodeJS.ProcessEnv,
): Promise<WikiRecompileResult> {
  const databaseUrl = env.LORE_DATABASE_URL ?? env.DATABASE_URL;
  if (!databaseUrl) {
    io.stderr.write(
      "missing_database_url: set LORE_DATABASE_URL or DATABASE_URL\n",
    );
    return { exitCode: 1, enqueuedCount: 0, totalEntities: 0, dryRun: args.dryRun };
  }

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: databaseUrl });
  const pgClient: WikiRecompilePgClient = {
    query: (text, values) =>
      pool.query(text, values as unknown[]) as Promise<{ rows: Array<{ entity_id: string }> }>,
  };

  let sqsClient: WikiRecompileSqsClient | undefined;
  if (!args.dryRun) {
    const { SQSClient, SendMessageCommand } = await import("@aws-sdk/client-sqs");
    const sqs = new SQSClient({});
    sqsClient = {
      sendMessage: (input) => sqs.send(new SendMessageCommand(input)),
    };
  }

  try {
    return await runWikiRecompile(args, {
      pgClient,
      sqsClient,
      stdout: io.stdout,
      stderr: io.stderr,
    });
  } finally {
    await pool.end().catch(() => undefined);
  }
}
