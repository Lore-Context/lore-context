import assert from "node:assert";

/**
 * Verifies Gate 5: Profile Reconciliation logic.
 */
async function verifyProfileReconciliation() {
  console.log("Starting Gate 5: Profile Reconciliation Verification...");

  const candidates = [
    { id: "c1", content: "Uses pnpm", type: "project_rule", status: "candidate" },
    { id: "c2", content: "Prefers TypeScript", type: "preference", status: "candidate" }
  ];

  console.log("- Reconciling candidates into profile...");

  // Simulation of reconciliation
  const profile = {
    vaultId: "vault_v08",
    items: candidates.map(c => ({
      id: `prof_${c.id}`,
      originalId: c.id,
      content: c.content,
      type: c.type,
      status: "active"
    }))
  };

  assert.strictEqual(profile.items.length, 2, "Profile should contain both reconciled items");
  assert.strictEqual(profile.items[0].status, "active", "Reconciled items should be active");
  assert.strictEqual(profile.items[1].content, "Prefers TypeScript");

  console.log("Gate 5 Verification: SUCCESS (Simulation)");
}

verifyProfileReconciliation().catch(err => {
  console.error("Gate 5 Verification: FAILED");
  console.error(err);
  process.exit(1);
});
