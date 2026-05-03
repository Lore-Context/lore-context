import { describe, expect, it } from "vitest";
import {
  CloudPlatform,
  hashToken,
  InMemoryCloudStore,
  type CloudStore
} from "../src/cloud.js";

const FIXED_NOW = new Date("2026-04-30T12:00:00.000Z");

function freshPlatform(now: Date = FIXED_NOW): { platform: CloudPlatform; store: CloudStore } {
  const store = new InMemoryCloudStore();
  return { store, platform: new CloudPlatform({ store, now: () => now }) };
}

describe("cloud-auth: token hashing and lifecycle", () => {
  it("stores tokens as sha256 hashes and never persists plaintext", async () => {
    const { platform, store } = freshPlatform();
    const issued = await platform.issueInstallToken();
    expect(issued.plaintext.startsWith("lct_install_")).toBe(true);
    expect(issued.record.tokenHash).toBe(hashToken(issued.plaintext));
    // The plaintext must not appear anywhere in the persisted snapshot.
    const stored = await store.findTokenByHash(hashToken(issued.plaintext));
    expect(stored).toBeDefined();
    expect(JSON.stringify(stored)).not.toContain(issued.plaintext);
    expect(stored?.tokenHash).not.toContain(issued.plaintext);
  });

  it("rejects install tokens that have already been redeemed (single-use)", async () => {
    const { platform } = freshPlatform();
    const installed = await platform.issueInstallToken();
    await platform.redeemInstallToken(installed.plaintext, { label: "first" });
    await expect(
      platform.redeemInstallToken(installed.plaintext, { label: "replay" })
    ).rejects.toMatchObject({ code: "cloud.token_already_used", status: 401 });
  });

  it("rejects install tokens after the 10-minute TTL elapses", async () => {
    const store = new InMemoryCloudStore();
    let now = new Date("2026-04-30T12:00:00.000Z");
    const platform = new CloudPlatform({ store, now: () => now });
    const installed = await platform.issueInstallToken();
    now = new Date("2026-04-30T12:11:00.000Z");
    await expect(
      platform.redeemInstallToken(installed.plaintext, { label: "expired" })
    ).rejects.toMatchObject({ code: "cloud.token_expired", status: 401 });
  });

  it("revokes tokens so the bearer can no longer authenticate", async () => {
    const { platform } = freshPlatform();
    const installed = await platform.issueInstallToken();
    const paired = await platform.redeemInstallToken(installed.plaintext, { label: "rev" });
    await platform.revokeToken(paired.deviceToken.plaintext);
    await expect(
      platform.authenticate(paired.deviceToken.plaintext)
    ).rejects.toMatchObject({ code: "cloud.token_revoked", status: 401 });
  });

  it("rotates a device token and disables the prior secret", async () => {
    const { platform } = freshPlatform();
    const installed = await platform.issueInstallToken();
    const paired = await platform.redeemInstallToken(installed.plaintext, { label: "rotate" });
    const rotated = await platform.rotateToken(paired.deviceToken.plaintext);
    expect(rotated.plaintext).not.toBe(paired.deviceToken.plaintext);
    expect(rotated.record.rotatedFrom).toBe(paired.deviceToken.record.id);

    await expect(
      platform.authenticate(paired.deviceToken.plaintext)
    ).rejects.toMatchObject({ code: "cloud.token_revoked", status: 401 });

    const auth = await platform.authenticate(rotated.plaintext);
    expect(auth).toMatchObject({
      vaultId: paired.vault.id,
      accountId: paired.vault.accountId,
      deviceId: paired.device.id,
      tokenKind: "device"
    });
  });

  it("refuses to use install tokens to authorize requests", async () => {
    const { platform } = freshPlatform();
    const installed = await platform.issueInstallToken();
    await expect(
      platform.authenticate(installed.plaintext)
    ).rejects.toMatchObject({ code: "cloud.token_kind_invalid", status: 401 });
  });

  it("rejects unknown bearer tokens", async () => {
    const { platform } = freshPlatform();
    await expect(
      platform.authenticate("lct_device_unknown")
    ).rejects.toMatchObject({ code: "cloud.token_invalid", status: 401 });
  });

  it("blocks authentication when the device has been revoked", async () => {
    const { platform } = freshPlatform();
    const installed = await platform.issueInstallToken();
    const paired = await platform.redeemInstallToken(installed.plaintext, { label: "block" });
    // Revoking the device token marks the device as revoked. The service
    // token still has its own `revoked_at IS NULL` row but must be denied
    // because the underlying device is gone.
    await platform.revokeToken(paired.deviceToken.plaintext);
    await expect(
      platform.authenticate(paired.serviceToken.plaintext)
    ).rejects.toMatchObject({ code: "cloud.device_revoked", status: 401 });
  });
});

describe("cloud-auth: HTTP surface", () => {
  it("admin install-token, pair, whoami, revoke happy path", async () => {
    const { platform } = freshPlatform();

    const installResponse = await platform.handle({
      request: new Request("http://localhost/v1/cloud/install-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      }),
      url: new URL("http://localhost/v1/cloud/install-token"),
      path: "/v1/cloud/install-token",
      method: "POST",
      hasAdminApiKey: true,
      isLoopback: false
    });
    expect(installResponse.status).toBe(200);
    const installPayload = installResponse.payload as { installToken: string; expiresAt: string };
    expect(installPayload.installToken.startsWith("lct_install_")).toBe(true);

    const pairResponse = await platform.handle({
      request: new Request("http://localhost/v1/cloud/devices/pair", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ install_token: installPayload.installToken, device_label: "claude-mac-1" })
      }),
      url: new URL("http://localhost/v1/cloud/devices/pair"),
      path: "/v1/cloud/devices/pair",
      method: "POST",
      hasAdminApiKey: false,
      isLoopback: false
    });
    expect(pairResponse.status).toBe(200);
    const pairPayload = pairResponse.payload as { deviceId: string; deviceToken: string };
    expect(pairPayload.deviceToken.startsWith("lct_device_")).toBe(true);

    const whoamiResponse = await platform.handle({
      request: new Request("http://localhost/v1/cloud/whoami", {
        headers: { authorization: `Bearer ${pairPayload.deviceToken}` }
      }),
      url: new URL("http://localhost/v1/cloud/whoami"),
      path: "/v1/cloud/whoami",
      method: "GET",
      hasAdminApiKey: false,
      isLoopback: false
    });
    expect(whoamiResponse.status).toBe(200);
    const whoami = whoamiResponse.payload as { vault: { id: string }; device: { id: string } };
    expect(whoami.vault.id).toBe("vault_local");
    expect(whoami.device.id).toBe(pairPayload.deviceId);
  });

  it("install-token endpoint requires admin api key or loopback", async () => {
    const { platform } = freshPlatform();
    await expect(
      platform.handle({
        request: new Request("http://localhost/v1/cloud/install-token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}"
        }),
        url: new URL("http://localhost/v1/cloud/install-token"),
        path: "/v1/cloud/install-token",
        method: "POST",
        hasAdminApiKey: false,
        isLoopback: false
      })
    ).rejects.toMatchObject({ code: "cloud.admin_required", status: 403 });
  });
});
