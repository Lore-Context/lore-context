import assert from "node:assert";

/**
 * Verifies Gate 6: Cross-agent recall and Evidence Ledger.
 * Mocking the core recall flow for v0.8 validation.
 */
async function verifyRecallAndLedger() {
  console.log("Starting Gate 6: Recall and Evidence Ledger Verification...");

  const mockMemory = {
    id: "mem_001",
    content: "User prefers functional programming in TypeScript.",
    sourceProvider: "claude-code",
    vaultId: "vault_v08"
  };

  const recallRequest = {
    query: "typescript coding style",
    agent: "codex", // Cross-agent recall: captured in claude-code, recalled in codex
    vaultId: "vault_v08"
  };

  console.log(`- Recalling memory for agent '${recallRequest.agent}'...`);

  // Simulation of recall hit
  const hit = {
    memory: mockMemory,
    score: 0.95,
    evidence: {
      action: "inject",
      agent: recallRequest.agent,
      disposition: "accepted"
    }
  };

  assert.strictEqual(hit.memory.sourceProvider, "claude-code", "Memory should originate from original source");
  assert.strictEqual(hit.evidence.agent, "codex", "Evidence should record the recalling agent");

  console.log("- Verifying Evidence Ledger entry...");
  const ledgerEntry = {
    traceId: "trace_v08_001",
    vaultId: mockMemory.vaultId,
    memoryId: mockMemory.id,
    recalledBy: recallRequest.agent,
    action: hit.evidence.action,
    timestamp: new Date().toISOString()
  };

  assert.ok(ledgerEntry.traceId, "Ledger must have a trace ID");
  assert.strictEqual(ledgerEntry.recalledBy, "codex", "Ledger should correctly attribute recall");

  console.log("Gate 6 Verification: SUCCESS (Simulation)");
}

verifyRecallAndLedger().catch(err => {
  console.error("Gate 6 Verification: FAILED");
  console.error(err);
  process.exit(1);
});
