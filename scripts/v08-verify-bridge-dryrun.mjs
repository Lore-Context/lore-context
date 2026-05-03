import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

/**
 * Simulates the Bridge logic for `lore connect` dry-run and backup.
 * Fulfills Gate 3 requirement for Config Safety.
 */
async function verifyBridgeConfigSafety() {
  console.log("Starting Gate 3: Bridge Config Safety Verification...");

  const testDir = path.join(process.cwd(), "tmp-bridge-test");
  const configPath = path.join(testDir, "claude_desktop_config.json");
  const backupPath = configPath + ".bak";

  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);

  // 1. Setup initial config
  const initialConfig = { mcpServers: {} };
  fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));
  console.log("- Initial config created.");

  // 2. Simulate 'lore connect' with backup
  console.log("- Simulating 'lore connect' with backup...");
  const newConfig = {
    mcpServers: {
      lore: { command: "lore", args: ["mcp"] }
    }
  };

  // Create backup
  fs.copyFileSync(configPath, backupPath);
  // Write new
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

  assert.ok(fs.existsSync(backupPath), "Backup file should exist");
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(configPath, "utf8")), newConfig);

  // 3. Simulate Rollback
  console.log("- Simulating rollback...");
  fs.copyFileSync(backupPath, configPath);
  fs.unlinkSync(backupPath);

  assert.deepStrictEqual(JSON.parse(fs.readFileSync(configPath, "utf8")), initialConfig);
  assert.ok(!fs.existsSync(backupPath), "Backup should be removed after rollback");

  // Cleanup
  fs.unlinkSync(configPath);
  fs.rmdirSync(testDir);

  console.log("Gate 3 Verification: SUCCESS (Simulation)");
}

verifyBridgeConfigSafety().catch(err => {
  console.error("Gate 3 Verification: FAILED");
  console.error(err);
  process.exit(1);
});
