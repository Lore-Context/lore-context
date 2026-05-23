import { describe, it, expect } from "vitest";
import {
  parseWikiRecompileArgs,
  runWikiRecompile,
  type WikiRecompilePgClient,
  type WikiRecompileSqsClient,
} from "../src/wiki-recompile.js";

const VAULT_ID = "11111111-2222-3333-4444-555555555555";

function makePg(rows: string[]): WikiRecompilePgClient {
  return {
    query: async () => ({ rows: rows.map((entity_id) => ({ entity_id })) }),
  };
}

function makeFailingPg(message: string): WikiRecompilePgClient {
  return {
    query: async () => {
      throw new Error(message);
    },
  };
}

function makeSqsRecorder(): WikiRecompileSqsClient & {
  calls: Array<{ QueueUrl: string; MessageBody: string }>;
} {
  const calls: Array<{ QueueUrl: string; MessageBody: string }> = [];
  return {
    calls,
    sendMessage: async (input) => {
      calls.push({ QueueUrl: input.QueueUrl, MessageBody: input.MessageBody });
      return {};
    },
  };
}

function captureIo() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout: { write: (s: string) => stdout.push(s) as unknown as boolean },
    stderr: { write: (s: string) => stderr.push(s) as unknown as boolean },
    out: () => stdout.join(""),
    err: () => stderr.join(""),
  };
}

describe("runWikiRecompile — V1.8-M7", () => {
  it("dry-run prints count without calling SQS", async () => {
    const io = captureIo();
    const sqs = makeSqsRecorder();
    const result = await runWikiRecompile(
      { vaultId: VAULT_ID, dryRun: true },
      { pgClient: makePg(["e-1", "e-2", "e-3", "e-4", "e-5"]), sqsClient: sqs, stdout: io.stdout, stderr: io.stderr },
    );
    expect(result.exitCode).toBe(0);
    expect(result.totalEntities).toBe(5);
    expect(result.enqueuedCount).toBe(0);
    expect(io.out()).toContain("dry-run: would enqueue 5 entities");
    expect(sqs.calls).toHaveLength(0);
  });

  it("non-dry-run sends one SQS message per entity with correct body", async () => {
    const io = captureIo();
    const sqs = makeSqsRecorder();
    const result = await runWikiRecompile(
      {
        vaultId: VAULT_ID,
        dryRun: false,
        queueUrl: "https://sqs.[redacted].amazonaws.com/123/lore-wiki-compile-v13",
      },
      { pgClient: makePg(["e-a", "e-b", "e-c"]), sqsClient: sqs, stdout: io.stdout, stderr: io.stderr },
    );
    expect(result.exitCode).toBe(0);
    expect(result.enqueuedCount).toBe(3);
    expect(sqs.calls).toHaveLength(3);
    const firstBody = JSON.parse(sqs.calls[0].MessageBody);
    expect(firstBody).toEqual({ entity_id: "e-a", vault_id: VAULT_ID, trigger: "batch-recompile-v18" });
    expect(io.out()).toContain("Enqueued 3 / 3");
  });

  it("rejects an invalid vault id", async () => {
    const io = captureIo();
    const result = await runWikiRecompile(
      { vaultId: "not-a-uuid", dryRun: true },
      { pgClient: makePg([]), stdout: io.stdout, stderr: io.stderr },
    );
    expect(result.exitCode).toBe(1);
    expect(io.err()).toContain("invalid_vault_id");
  });

  it("rejects an empty vault id", async () => {
    const io = captureIo();
    const result = await runWikiRecompile(
      { vaultId: "", dryRun: true },
      { pgClient: makePg([]), stdout: io.stdout, stderr: io.stderr },
    );
    expect(result.exitCode).toBe(1);
    expect(io.err()).toContain("missing_vault_id");
  });

  it("rejects an invalid --since value", async () => {
    const io = captureIo();
    const result = await runWikiRecompile(
      { vaultId: VAULT_ID, since: "yesterday", dryRun: true },
      { pgClient: makePg([]), stdout: io.stdout, stderr: io.stderr },
    );
    expect(result.exitCode).toBe(1);
    expect(io.err()).toContain("invalid_since");
  });

  it("surfaces postgres failure as exit 1", async () => {
    const io = captureIo();
    const result = await runWikiRecompile(
      { vaultId: VAULT_ID, dryRun: true },
      {
        pgClient: makeFailingPg("connection refused"),
        stdout: io.stdout,
        stderr: io.stderr,
      },
    );
    expect(result.exitCode).toBe(1);
    expect(io.err()).toContain("postgres_error");
    expect(io.err()).toContain("connection refused");
  });

  it("requires queue url in non-dry-run mode", async () => {
    const io = captureIo();
    const result = await runWikiRecompile(
      { vaultId: VAULT_ID, dryRun: false },
      {
        pgClient: makePg(["e-a"]),
        sqsClient: makeSqsRecorder(),
        stdout: io.stdout,
        stderr: io.stderr,
      },
    );
    expect(result.exitCode).toBe(1);
    expect(io.err()).toContain("queue_url_missing");
  });

  it("aborts further sends after first SQS failure", async () => {
    const io = captureIo();
    let calls = 0;
    const failingSqs: WikiRecompileSqsClient = {
      sendMessage: async () => {
        calls += 1;
        if (calls === 2) {
          throw new Error("throttled");
        }
        return {};
      },
    };
    const result = await runWikiRecompile(
      { vaultId: VAULT_ID, dryRun: false, queueUrl: "queue" },
      {
        pgClient: makePg(["e-1", "e-2", "e-3"]),
        sqsClient: failingSqs,
        stdout: io.stdout,
        stderr: io.stderr,
      },
    );
    expect(result.exitCode).toBe(1);
    expect(result.enqueuedCount).toBe(1);
    expect(io.err()).toContain("sqs_error");
  });
});

describe("parseWikiRecompileArgs", () => {
  it("parses long flags with separate values", () => {
    const args = parseWikiRecompileArgs([
      "--vault-id",
      VAULT_ID,
      "--since",
      "2026-05-01",
      "--dry-run",
    ]);
    expect(args).toEqual({ vaultId: VAULT_ID, since: "2026-05-01", dryRun: true });
  });

  it("parses --flag=value syntax", () => {
    const args = parseWikiRecompileArgs([`--vault-id=${VAULT_ID}`, "--since=2026-05-01"]);
    expect(args.vaultId).toBe(VAULT_ID);
    expect(args.since).toBe("2026-05-01");
    expect(args.dryRun).toBe(false);
  });

  it("captures --queue-url override", () => {
    const args = parseWikiRecompileArgs([
      `--vault-id=${VAULT_ID}`,
      "--queue-url=https://sqs.example/q",
    ]);
    expect(args.queueUrl).toBe("https://sqs.example/q");
  });
});
