#!/usr/bin/env node
// smoke-capture-candidate: evidence for rc.1 Lane C acceptance criterion.
//
// Shows the first automatic candidate path:
//   fixture JSONL → parse → redact → build wire session → sessionToCandidate
//
// Key invariant verified:
//   candidate.state === "pending"   (never "approved" / trusted recall memory)
//
// Usage:
//   node scripts/smoke-capture-candidate.mjs
//   node scripts/smoke-capture-candidate.mjs --json

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const wantJson = process.argv.includes("--json");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ── Load the @lore/capture dist bundle ──────────────────────────────────────
const cap = await import(path.join(root, "packages/capture/dist/index.js")).catch((err) => {
  console.error("error: @lore/capture is not built. Run `pnpm --filter @lore/capture build` first.");
  console.error(String(err?.message ?? err));
  process.exit(2);
});

// rc.2 Lane D: smoke now exercises the two real auto-capture clients
// (Claude Code + Cursor). Pass `--client cursor|claude-code` to focus on one.
const wantClient = (() => {
  const idx = process.argv.indexOf("--client");
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
})();

const clients = [
  {
    id: "claude-code",
    label: "Claude Code",
    fixture: "packages/capture/tests/fixtures/claude-code/session-basic.jsonl",
    parse: (filePath, content) => cap.parseClaudeCodeJsonl({ filePath, content })
  },
  {
    id: "cursor",
    label: "Cursor",
    fixture: "packages/capture/tests/fixtures/cursor/session-basic.json",
    parse: (filePath, content) => cap.parseCursorSession({ filePath, content })
  }
].filter((c) => !wantClient || c.id === wantClient);

if (clients.length === 0) {
  console.error(`error: unknown --client ${wantClient}; valid: claude-code, cursor`);
  process.exit(2);
}

// ── Run the smoke pass for the first selected client (default behaviour) ────
const primary = clients[0];
const fixturePath = path.join(root, primary.fixture);
const content = await readFile(fixturePath, "utf-8");
const parseResult = primary.parse(fixturePath, content);
const { session, warnings } = parseResult;

// ── Build v0.8 wire session ──────────────────────────────────────────────────
const sourceIdForClient = `src_smoke_${primary.id.replace(/-/g, "_")}`;
const wireSession = cap.toWireSession(session, {
  vaultId: "v_smoke_test",
  deviceId: "dev_smoke_test",
  sourceId: sourceIdForClient,
  rawArchive: false,
  privateMode: false,
  projectHint: "smoke-test-project"
});

// ── Source state: check capture is allowed ───────────────────────────────────
const sourceState = "active";
const canCapture = cap.canCapture(sourceState);
const uploadDecision = cap.decideUpload({
  sourceStatus: sourceState,
  vaultRawArchiveEnabled: false,
  sessionMode: wireSession.captureMode
});

// ── Create inbox candidate ────────────────────────────────────────────────────
const candidate = cap.sessionToCandidate(wireSession, {
  sourceId: sourceIdForClient,
  now: new Date("2026-05-02T10:00:00.000Z")
});

// rc.2 Lane D: also exercise the second client when smoke runs without
// --client filter, so the script proves coverage of two auto-capture paths.
const additionalClientResults = [];
if (!wantClient) {
  for (const client of clients.slice(1)) {
    const altPath = path.join(root, client.fixture);
    const altContent = await readFile(altPath, "utf-8");
    const altParse = client.parse(altPath, altContent);
    const altSourceId = `src_smoke_${client.id.replace(/-/g, "_")}`;
    const altWire = cap.toWireSession(altParse.session, {
      vaultId: "v_smoke_test",
      deviceId: "dev_smoke_test",
      sourceId: altSourceId,
      rawArchive: false,
      privateMode: false
    });
    const altCandidate = cap.sessionToCandidate(altWire, {
      sourceId: altSourceId,
      now: new Date("2026-05-02T10:00:00.000Z")
    });
    additionalClientResults.push({
      client: client.id,
      candidateId: altCandidate.id,
      state: altCandidate.state,
      idempotencyKey: altWire.idempotencyKey,
      provider: altWire.provider,
      turnCount: altWire.turns.length
    });
  }
}

// ── Verify invariants ────────────────────────────────────────────────────────
const checks = [
  { name: "candidate.state === 'pending' (never auto-promoted to trusted memory)", pass: candidate.state === "pending" },
  { name: "candidate.id starts with 'cand_'", pass: candidate.id.startsWith("cand_") },
  { name: "candidate.candidateType === 'session_summary'", pass: candidate.candidateType === "session_summary" },
  { name: "candidate.idempotencyKey matches session", pass: candidate.idempotencyKey === wireSession.idempotencyKey },
  { name: "candidate.confidence in [0, 1]", pass: candidate.confidence >= 0 && candidate.confidence <= 1 },
  { name: "candidate.expiresAt is in the future", pass: new Date(candidate.expiresAt) > new Date("2026-05-02T10:00:00.000Z") },
  { name: "source state 'active' canCapture === true", pass: canCapture === true },
  { name: "upload decision is 'upload'", pass: uploadDecision.action === "upload" },
  { name: "redaction removed secrets from session", pass: session.redactionStats.secretsRemoved > 0 },
  { name: "candidate is valid shape (isCaptureInboxCandidate)", pass: cap.isCaptureInboxCandidate(candidate) }
];

// rc.2 Lane D: when smoke covers both clients in one run, prove that the
// secondary client also produces a valid pending candidate.
for (const extra of additionalClientResults) {
  checks.push({
    name: `secondary client ${extra.client} produced pending candidate (rc.2 two-client coverage)`,
    pass: extra.state === "pending" && extra.candidateId.startsWith("cand_")
  });
}

// rc.2 Lane D: prove the no-memory-found UX state behaves as expected so the
// dashboard can render an empty Memory Inbox without looking broken.
const emptySession = {
  ...wireSession,
  turns: [],
  captureMode: "summary_only",
  redaction: { ...wireSession.redaction, secretCount: 0, privateBlockCount: 0 }
};
const noMem = cap.explainNoMemoryFound(emptySession, {
  sourceId: sourceIdForClient,
  reason: cap.inferNoMemoryReason(emptySession),
  now: new Date("2026-05-02T10:00:00.000Z")
});
checks.push({
  name: "no-memory-found record has reason and source attribution",
  pass: cap.isNoMemoryCaptureRecord(noMem) && noMem.sourceId === sourceIdForClient && typeof noMem.message === "string" && noMem.message.length > 0
});

const passed = checks.filter((c) => c.pass).length;
const failed = checks.filter((c) => !c.pass).length;

if (wantJson) {
  console.log(JSON.stringify({
    fixture: fixturePath,
    primaryClient: primary.id,
    parseWarnings: warnings,
    wireSession: {
      provider: wireSession.provider,
      idempotencyKey: wireSession.idempotencyKey,
      captureMode: wireSession.captureMode,
      turnCount: wireSession.turns.length,
      redaction: wireSession.redaction
    },
    sourceState,
    uploadDecision,
    candidate,
    additionalClientResults,
    noMemoryRecord: noMem,
    checks,
    summary: { passed, failed, total: checks.length }
  }, null, 2));
} else {
  console.log("=== smoke-capture-candidate ===");
  console.log(`Primary client: ${primary.label} (${primary.id})`);
  console.log(`Fixture:        ${fixturePath}`);
  console.log(`Provider:       ${wireSession.provider}`);
  console.log(`Turns:          ${wireSession.turns.length}`);
  console.log(`Capture mode:   ${wireSession.captureMode}`);
  console.log(`Redacted:       ${wireSession.redaction.secretCount} secrets, ${wireSession.redaction.privateBlockCount} private blocks`);
  console.log(`Source state:   ${sourceState} (canCapture=${canCapture})`);
  console.log(`Upload:         ${uploadDecision.action} — ${uploadDecision.reason}`);
  console.log("");
  console.log(`Candidate ID:   ${candidate.id}`);
  console.log(`State:          ${candidate.state}  ← must be "pending", never trusted memory`);
  console.log(`Type:           ${candidate.candidateType}`);
  console.log(`Title:          ${candidate.title}`);
  console.log(`Confidence:     ${candidate.confidence}`);
  console.log(`Excerpt:        ${candidate.excerpt.slice(0, 80)}…`);
  console.log(`Expires:        ${candidate.expiresAt}`);
  console.log("");
  console.log("Invariant checks:");
  for (const check of checks) {
    console.log(`  [${check.pass ? "PASS" : "FAIL"}] ${check.name}`);
  }
  if (additionalClientResults.length > 0) {
    console.log("");
    console.log("Additional auto-capture clients covered (rc.2 Lane D):");
    for (const extra of additionalClientResults) {
      console.log(`  - ${extra.client}: candidate=${extra.candidateId.slice(0, 16)}… state=${extra.state} turns=${extra.turnCount}`);
    }
  }
  console.log(`\nResult: ${passed}/${checks.length} passed, ${failed} failed`);
  if (warnings.length > 0) {
    console.log(`Parse warnings: ${warnings.join(", ")}`);
  }
}

if (failed > 0) {
  process.exit(1);
}
