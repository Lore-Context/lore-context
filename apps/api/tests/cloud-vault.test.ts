import { describe, expect, it } from "vitest";
import { CloudPlatform, InMemoryCloudStore } from "../src/cloud.js";

const NOW = () => new Date("2026-04-30T12:00:00.000Z");

async function pairDevice(platform: CloudPlatform, label: string) {
  const installed = await platform.issueInstallToken();
  return platform.redeemInstallToken(installed.plaintext, { label });
}

describe("cloud-vault: tenancy isolation", () => {
  it("denies a device token from one vault when accessing capture jobs in another vault", async () => {
    const store = new InMemoryCloudStore();
    const alice = new CloudPlatform({
      store,
      now: NOW,
      defaultAccountId: "acct_alice",
      defaultVaultId: "vault_alice"
    });
    const bob = new CloudPlatform({
      store,
      now: NOW,
      defaultAccountId: "acct_bob",
      defaultVaultId: "vault_bob"
    });

    // Bootstrap both tenants in the shared store.
    await alice.defaultVault();
    await bob.defaultVault();

    const alicePair = await pairDevice(alice, "alice-mac");
    const bobPair = await pairDevice(bob, "bob-mac");

    expect(alicePair.vault.id).toBe("vault_alice");
    expect(bobPair.vault.id).toBe("vault_bob");

    const aliceJob = await alice.enqueueStubJob({ vaultId: "vault_alice", type: "session.summarize" });
    const bobJob = await bob.enqueueStubJob({ vaultId: "vault_bob", type: "session.summarize" });

    const aliceAuth = await alice.authenticate(alicePair.deviceToken.plaintext);
    const bobAuth = await bob.authenticate(bobPair.deviceToken.plaintext);

    // Alice can fetch her own job, Bob can fetch his.
    await expect(alice.getJob(aliceAuth, aliceJob.id)).resolves.toMatchObject({ vaultId: "vault_alice" });
    await expect(bob.getJob(bobAuth, bobJob.id)).resolves.toMatchObject({ vaultId: "vault_bob" });

    // Cross-vault job lookup must be denied even though both tokens are
    // structurally valid.
    await expect(alice.getJob(aliceAuth, bobJob.id)).rejects.toMatchObject({
      code: "cloud.cross_vault_denied",
      status: 403
    });
    await expect(bob.getJob(bobAuth, aliceJob.id)).rejects.toMatchObject({
      code: "cloud.cross_vault_denied",
      status: 403
    });
  });

  it("rejects heartbeat collisions where two vaults claim the same source id", async () => {
    const store = new InMemoryCloudStore();
    const alice = new CloudPlatform({
      store,
      now: NOW,
      defaultAccountId: "acct_alice",
      defaultVaultId: "vault_alice"
    });
    const bob = new CloudPlatform({
      store,
      now: NOW,
      defaultAccountId: "acct_bob",
      defaultVaultId: "vault_bob"
    });

    await alice.defaultVault();
    await bob.defaultVault();

    const alicePair = await pairDevice(alice, "alice-mac");
    const bobPair = await pairDevice(bob, "bob-mac");
    const aliceAuth = await alice.authenticate(alicePair.deviceToken.plaintext);
    const bobAuth = await bob.authenticate(bobPair.deviceToken.plaintext);

    await alice.recordHeartbeat({ auth: aliceAuth, sourceId: "src_shared", sourceProvider: "claude_code" });
    await expect(
      bob.recordHeartbeat({ auth: bobAuth, sourceId: "src_shared", sourceProvider: "codex" })
    ).rejects.toMatchObject({ code: "cloud.cross_vault_denied", status: 403 });
  });

  it("listVaultsForAccount only returns vaults owned by the caller's account", async () => {
    const store = new InMemoryCloudStore();
    const alice = new CloudPlatform({
      store,
      now: NOW,
      defaultAccountId: "acct_alice",
      defaultVaultId: "vault_alice"
    });
    const bob = new CloudPlatform({
      store,
      now: NOW,
      defaultAccountId: "acct_bob",
      defaultVaultId: "vault_bob"
    });

    await alice.defaultVault();
    await bob.defaultVault();

    const aliceVaults = await alice.listVaultsForAccount("acct_alice");
    const bobVaults = await alice.listVaultsForAccount("acct_bob");

    expect(aliceVaults.map((v) => v.id)).toEqual(["vault_alice"]);
    expect(bobVaults.map((v) => v.id)).toEqual(["vault_bob"]);
  });
});
