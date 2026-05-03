import { CloudPlatform } from "../apps/api/src/cloud.js";
import assert from "node:assert";

async function testAuthAndVaultIsolation() {
  console.log("Starting Gate 1: Auth and Vault Isolation Verification...");
  const cloud = new CloudPlatform();

  // 1. Issue Install Token (Admin required)
  console.log("- Issuing install token...");
  const installToken = cloud.issueInstallToken();
  assert.ok(installToken.token.startsWith("lct_install_"), "Install token should have correct prefix");
  assert.strictEqual(installToken.scopes[0], "device.pair");

  // 2. Redeem Install Token for Device & Service Tokens
  console.log("- Redeeming install token for pairing...");
  const pairResult = cloud.redeemInstallToken(installToken.token, { label: "Verification Device", platform: "darwin" });
  assert.ok(pairResult.deviceToken.token.startsWith("lct_device_"), "Device token prefix check");
  assert.ok(pairResult.serviceToken.token.startsWith("lct_service_"), "Service token prefix check");
  assert.strictEqual(pairResult.device.label, "Verification Device");

  // 3. Verify Isolation (Authenticate with Device Token)
  console.log("- Verifying authentication and whoami isolation...");
  const authContext = cloud.authenticate(pairResult.deviceToken.token);
  assert.strictEqual(authContext.vaultId, pairResult.vault.id);
  assert.strictEqual(authContext.tokenKind, "device");

  const me = cloud.whoami(authContext);
  assert.strictEqual(me.vault.id, pairResult.vault.id);
  assert.strictEqual(me.device.id, pairResult.device.id);

  // 4. Test Token Rotation
  console.log("- Testing token rotation...");
  const rotated = cloud.rotateToken(pairResult.deviceToken.token);
  assert.notStrictEqual(rotated.token, pairResult.deviceToken.token, "Rotated token should be different");
  assert.strictEqual(rotated.kind, "device");

  // Old token should be revoked
  try {
    cloud.authenticate(pairResult.deviceToken.token);
    assert.fail("Old token should be invalid after rotation");
  } catch (e) {
    assert.strictEqual(e.code, "cloud.token_revoked");
  }

  // New token should work
  const rotatedAuth = cloud.authenticate(rotated.token);
  assert.strictEqual(rotatedAuth.vaultId, pairResult.vault.id);

  // 5. Test Token Revocation
  console.log("- Testing token revocation...");
  cloud.revokeToken(rotated.token);
  try {
    cloud.authenticate(rotated.token);
    assert.fail("Token should be invalid after revocation");
  } catch (e) {
    assert.strictEqual(e.code, "cloud.token_revoked");
  }

  console.log("Gate 1 Verification: SUCCESS");
}

testAuthAndVaultIsolation().catch(err => {
  console.error("Gate 1 Verification: FAILED");
  console.error(err);
  process.exit(1);
});
