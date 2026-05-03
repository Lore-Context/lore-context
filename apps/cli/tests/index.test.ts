import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyConfigPlans,
  buildConfigPlans,
  buildDisconnectPlans,
  checkCloudWhoami,
  detectClients,
  getBridgeStatus,
  getBridgeStatusWithCloudCheck,
  readStoredCredentials,
  redeemInstallToken,
  rollbackConfig,
  runCli,
  runWatchBridgeOnce,
  runWatchOnce,
  revokeStoredDeviceToken,
  storeCredentials,
  type BridgeRuntime,
  type CredentialBundle
} from "../src/index.js";

describe("lore bridge client detection", () => {
  it("detects Claude/Codex managed clients and Cursor/OpenCode P1 clients without writing files", () => {
    withTempRuntime((runtime) => {
      mkdirSync(join(runtime.homeDir, ".claude", "projects"), { recursive: true });
      mkdirSync(join(runtime.homeDir, ".codex"), { recursive: true });
      writeFileSync(join(runtime.homeDir, ".codex", "config.toml"), "[mcp_servers.lore]\ncommand = \"node\"\n", "utf8");
      mkdirSync(join(runtime.homeDir, ".cursor"), { recursive: true });
      writeFileSync(join(runtime.homeDir, ".cursor", "mcp.json"), "{\"mcpServers\":{\"lore\":{}}}\n", "utf8");
      mkdirSync(join(runtime.homeDir, ".config", "opencode"), { recursive: true });

      const detections = detectClients(runtime);
      expect(detections).toHaveLength(4);
      expect(detections.find((client) => client.id === "claude-code")).toMatchObject({ installed: true, connected: false, managed: true });
      expect(detections.find((client) => client.id === "codex")).toMatchObject({ installed: true, connected: true, managed: true });
      expect(detections.find((client) => client.id === "cursor")).toMatchObject({ installed: true, connected: true, managed: false });
      expect(detections.find((client) => client.id === "opencode")).toMatchObject({ installed: true, connected: false, managed: false });
    });
  });
});

describe("lore connect planning", () => {
  it("defaults to dry-run planning and does not write raw tokens into config previews or files", () => {
    withTempRuntime((runtime) => {
      const secret = "lct_device_secret_123";
      const plans = buildConfigPlans({
        runtime,
        clients: ["claude-code"],
        cloudUrl: "https://api.lorecontext.test",
        credentials: credential(runtime, { deviceToken: secret })
      });

      expect(plans).toHaveLength(1);
      expect(plans[0]).toMatchObject({ clientId: "claude-code", action: "create", beforeExists: false });
      expect(plans[0].afterContent).not.toContain(secret);
      expect(plans[0].afterPreview).not.toContain(secret);
      expect(plans[0].afterPreview).toContain("LORE_BRIDGE_CREDENTIAL_REF");
      expect(existsSync(join(runtime.homeDir, ".claude.json"))).toBe(false);
    });
  });

  it("preserves unrelated Claude MCP servers, writes only on request, and rollbacks exactly", () => {
    withTempRuntime((runtime) => {
      const claudePath = join(runtime.homeDir, ".claude.json");
      const original = JSON.stringify({ mcpServers: { old: { command: "node" } }, theme: "dark" }, null, 2) + "\n";
      writeFileSync(claudePath, original, "utf8");

      const result = applyConfigPlans(buildConfigPlans({
        runtime,
        clients: ["claude-code"],
        cloudUrl: "https://api.lorecontext.test",
        credentials: credential(runtime)
      }), runtime);

      expect(result.changes[0].backupPath).toBeDefined();
      expect(readFileSync(claudePath, "utf8")).toContain("\"old\"");
      expect(readFileSync(claudePath, "utf8")).toContain("\"lore\"");

      const rollback = rollbackConfig(result.rollbackId, runtime);
      expect(rollback.restored).toHaveLength(1);
      expect(readFileSync(claudePath, "utf8")).toBe(original);
    });
  });

  it("preserves existing Codex settings with a managed block and rollbacks exactly", () => {
    withTempRuntime((runtime) => {
      const codexPath = join(runtime.homeDir, ".codex", "config.toml");
      mkdirSync(join(runtime.homeDir, ".codex"), { recursive: true });
      const original = "model = \"gpt-5.4\"\nreasoning_effort = \"high\"\n";
      writeFileSync(codexPath, original, "utf8");

      const result = applyConfigPlans(buildConfigPlans({
        runtime,
        clients: ["codex"],
        cloudUrl: "https://api.lorecontext.test",
        credentials: credential(runtime)
      }), runtime);

      const after = readFileSync(codexPath, "utf8");
      expect(after).toContain("model = \"gpt-5.4\"");
      expect(after).toContain("# BEGIN LORE BRIDGE MANAGED");
      expect(after).not.toContain("lct_device");

      rollbackConfig(result.rollbackId, runtime);
      expect(readFileSync(codexPath, "utf8")).toBe(original);
    });
  });

  it("warns on malformed JSON and backs it up before replacement", () => {
    withTempRuntime((runtime) => {
      const claudePath = join(runtime.homeDir, ".claude.json");
      writeFileSync(claudePath, "{not-json", "utf8");

      const plans = buildConfigPlans({ runtime, clients: ["claude-code"], credentials: credential(runtime) });
      expect(plans[0].warnings.some((warning) => warning.includes("malformed JSON"))).toBe(true);

      const result = applyConfigPlans(plans, runtime);
      expect(result.changes[0].backupPath).toBeDefined();
      expect(readFileSync(result.changes[0].backupPath ?? "", "utf8")).toBe("{not-json");
      expect(readFileSync(claudePath, "utf8")).toContain("\"lore\"");
    });
  });

  it("does not redeem single-use install tokens during dry-run", async () => {
    await withTempRuntimeAsync(async (runtime) => {
      let called = false;
      const code = await runCli(["connect", "--install-token", "install_should_not_be_used"], sink(), {
        ...runtime,
        fetchImpl: async () => {
          called = true;
          return Response.json({});
        }
      });

      expect(code).toBe(0);
      expect(called).toBe(false);
      expect(readStoredCredentials(runtime)).toBeUndefined();
    });
  });
});

describe("pairing and secure credentials", () => {
  it("redeems install tokens against the cloud API contract without logging tokens", async () => {
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      expect(String(init?.body)).toContain("install_one_time");
      return Response.json({
        deviceId: "dev_1",
        vaultId: "vault_1",
        accountId: "acct_1",
        deviceToken: "lct_device_real_secret",
        deviceTokenExpiresAt: "2026-07-30T00:00:00.000Z",
        serviceToken: "lct_service_real_secret",
        serviceTokenExpiresAt: "2026-07-30T00:00:00.000Z"
      });
    };

    const result = await redeemInstallToken({
      cloudUrl: "https://api.lorecontext.test",
      installToken: "install_one_time",
      fetchImpl
    });
    expect(result).toMatchObject({ deviceId: "dev_1", vaultId: "vault_1" });
  });

  it("uses secure-file fallback with 0600 mode when Keychain is disabled", () => {
    withTempRuntime((runtime) => {
      const stored = storeCredentials(credential(runtime), runtime);
      expect(stored.kind).toBe("file");
      expect(stored.warning).toContain("Keychain unavailable");
      const mode = statSync(stored.path ?? "").mode & 0o777;
      expect(mode).toBe(0o600);
      expect(readStoredCredentials(runtime)?.deviceToken).toBe("lct_device_test_secret");
    });
  });

  it("does not print tokens during CLI mock pairing write", async () => {
    await withTempRuntimeAsync(async (runtime) => {
      const stdout: string[] = [];
      const code = await runCli(["connect", "--client", "codex", "--mock-pairing", "--write"], {
        stdout: { write: (chunk: string) => { stdout.push(chunk); return true; } },
        stderr: { write: () => true }
      }, runtime);

      expect(code).toBe(0);
      expect(stdout.join("")).not.toMatch(/lct_(device|service)_/);
      expect(readStoredCredentials(runtime)?.deviceToken).toMatch(/^lct_device_mock_/);
      expect(readFileSync(join(runtime.homeDir, ".codex", "config.toml"), "utf8")).toContain("LORE_BRIDGE_CREDENTIAL_SOURCE = \"file\"");
    });
  });
});

describe("disconnect", () => {
  it("removes managed Claude/Codex config and clears credentials behind --write", async () => {
    await withTempRuntimeAsync(async (runtime) => {
      await runCli(["connect", "--mock-pairing", "--write"], sink(), runtime);
      expect(readStoredCredentials(runtime)).toBeDefined();

      const stdout: string[] = [];
      const revoked: string[] = [];
      const code = await runCli(["disconnect", "--write"], {
        stdout: { write: (chunk: string) => { stdout.push(chunk); return true; } },
        stderr: { write: () => true }
      }, {
        ...runtime,
        fetchImpl: async (input, init) => {
          revoked.push(String(input));
          expect(new Headers(init?.headers).get("authorization")).toMatch(/^Bearer lct_device_mock_/);
          return Response.json({ revoked: true });
        }
      });

      expect(code).toBe(0);
      expect(revoked).toEqual(["http://127.0.0.1:3000/v1/cloud/tokens/revoke"]);
      expect(readStoredCredentials(runtime)).toBeUndefined();
      expect(readFileSync(join(runtime.homeDir, ".codex", "config.toml"), "utf8")).not.toContain("LORE BRIDGE MANAGED");
      expect(readFileSync(join(runtime.homeDir, ".claude.json"), "utf8")).not.toContain("\"lore\"");
      expect(stdout.join("")).toContain("disconnect applied");
      expect(stdout.join("")).toContain("cloud revoke: ok");
    });
  });

  it("continues local disconnect when cloud revoke is unreachable and redacts token-shaped errors", async () => {
    await withTempRuntimeAsync(async (runtime) => {
      await runCli(["connect", "--client", "codex", "--mock-pairing", "--write"], sink(), runtime);

      const stdout: string[] = [];
      const code = await runCli(["disconnect", "--client", "codex", "--write"], {
        stdout: { write: (chunk: string) => { stdout.push(chunk); return true; } },
        stderr: { write: () => true }
      }, {
        ...runtime,
        fetchImpl: async () => {
          throw new Error("network failed for Bearer lct_device_mock_should_not_print");
        }
      });

      expect(code).toBe(0);
      expect(readStoredCredentials(runtime)).toBeUndefined();
      expect(stdout.join("")).toContain("cloud revoke: failed network_error");
      expect(stdout.join("")).not.toContain("lct_device_mock");
    });
  });

  it("revokes the stored device token through the cloud API contract", async () => {
    await withTempRuntimeAsync(async (runtime) => {
      storeCredentials(credential(runtime), runtime);
      const status = await revokeStoredDeviceToken({
        ...runtime,
        fetchImpl: async (input, init) => {
          expect(String(input)).toBe("https://api.lorecontext.test/v1/cloud/tokens/revoke");
          expect(new Headers(init?.headers).get("authorization")).toBe("Bearer lct_device_test_secret");
          return Response.json({ revoked: true }, { status: 200 });
        }
      });

      expect(status).toEqual({ attempted: true, ok: true, status: 200 });
    });
  });
});

describe("status and watch", () => {
  it("reports pairing, connected clients, source heartbeat, and queue counters", async () => {
    await withTempRuntimeAsync(async (runtime) => {
      storeCredentials(credential(runtime), runtime);
      mkdirSync(join(runtime.homeDir, ".lore"), { recursive: true });
      writeFileSync(join(runtime.homeDir, ".lore", "bridge-state.json"), JSON.stringify({
        cloudUrl: "https://api.lorecontext.test",
        deviceId: "dev_1",
        vaultId: "vault_1",
        accountId: "acct_1",
        credentialStorage: "file",
        credentialPath: join(runtime.homeDir, ".lore", "credentials.json"),
        connectedClients: ["claude-code"],
        updatedAt: "2026-04-30T00:00:00.000Z"
      }), "utf8");
      writeFileSync(join(runtime.homeDir, ".lore", "watcher-state.json"), JSON.stringify({
        capturedToday: 3,
        uploadedToday: 2,
        failedToday: 1,
        pendingReview: 4,
        lastUploadAt: "2026-04-30T00:10:00.000Z",
        lastUploadError: "last upload failed",
        watching: ["claude-code"],
        connectedSources: 1,
        countersDate: "2026-04-30"
      }), "utf8");
      mkdirSync(join(runtime.homeDir, ".claude", "projects", "demo"), { recursive: true });
      mkdirSync(join(runtime.repoRoot, "packages", "capture"), { recursive: true });
      writeFileSync(join(runtime.homeDir, ".claude", "projects", "demo", "session.jsonl"), "{\"type\":\"user\",\"message\":{\"content\":\"hi\"}}\n", "utf8");
      writeFileSync(join(runtime.homeDir, ".lore", "capture-queue.json"), JSON.stringify({ queued: [{}], uploaded: 2, failed: ["x"] }), "utf8");

      const statuses = await runWatchOnce({
        ...runtime,
        fetchImpl: async () => Response.json({ source: { id: "src_claude-code", status: "active" } })
      });
      expect(statuses.find((source) => source.provider === "claude-code")).toMatchObject({ status: "active", discovered: 1 });

      const status = getBridgeStatus(runtime);
      expect(status.deviceTokenPresent).toBe(true);
      expect(status.captureCounters).toEqual({ queued: 1, uploaded: 2, failed: 1 });
      expect(status.sourceStatuses.map((source) => source.provider)).toContain("claude-code");
      expect(status.accountId).toBe("acct_1");
      expect(status.activeSources).toBe(1);
      expect(status.capturedToday).toBe(3);
      expect(status.pendingInboxCount).toBe(4);
      expect(status.lastSyncAt).toBe("2026-04-30T00:10:00.000Z");
      expect(status.lastError).toBe("last upload failed");
    });
  });

  it("renders useful status from local state without production calls", async () => {
    await withTempRuntimeAsync(async (runtime) => {
      storeCredentials(credential(runtime), runtime);
      mkdirSync(join(runtime.homeDir, ".lore"), { recursive: true });
      writeFileSync(join(runtime.homeDir, ".lore", "bridge-state.json"), JSON.stringify({
        cloudUrl: "https://api.lorecontext.test",
        deviceId: "dev_1",
        vaultId: "vault_1",
        accountId: "acct_1",
        credentialStorage: "file",
        credentialPath: join(runtime.homeDir, ".lore", "credentials.json"),
        connectedClients: [],
        updatedAt: "2026-04-30T00:00:00.000Z"
      }), "utf8");
      writeFileSync(join(runtime.homeDir, ".lore", "source-status.json"), JSON.stringify({
        sources: [{ sourceId: "src_codex", provider: "codex", status: "active", discovered: 2, lastHeartbeatAt: "2026-04-30T00:01:00.000Z", lastError: null }]
      }), "utf8");
      writeFileSync(join(runtime.homeDir, ".lore", "watcher-state.json"), JSON.stringify({
        capturedToday: 5,
        uploadedToday: 5,
        failedToday: 0,
        pendingReview: 2,
        lastUploadAt: "2026-04-30T00:02:00.000Z",
        lastUploadError: null,
        watching: ["codex"],
        connectedSources: 1,
        countersDate: "2026-04-30"
      }), "utf8");

      let called = false;
      const stdout: string[] = [];
      const code = await runCli(["status"], {
        stdout: { write: (chunk: string) => { stdout.push(chunk); return true; } },
        stderr: { write: () => true }
      }, {
        ...runtime,
        fetchImpl: async () => {
          called = true;
          return Response.json({});
        }
      });

      expect(code).toBe(0);
      expect(called).toBe(false);
      expect(stdout.join("")).toContain("account id: acct_1");
      expect(stdout.join("")).toContain("active sources: 1");
      expect(stdout.join("")).toContain("captured today: 5");
      expect(stdout.join("")).toContain("pending inbox: 2");
      expect(stdout.join("")).toContain("last sync: 2026-04-30T00:02:00.000Z");
    });
  });

  it("surfaces revoked token cloud check without leaking the token", async () => {
    const fetchImpl = async (): Promise<Response> => Response.json({
      error: { code: "cloud.token_revoked", message: "token was revoked" }
    }, { status: 401 });

    const check = await checkCloudWhoami("https://api.lorecontext.test", "lct_device_revoked_secret", fetchImpl);
    expect(check).toMatchObject({ ok: false, status: 401, code: "cloud.token_revoked" });

    await withTempRuntimeAsync(async (runtime) => {
      storeCredentials(credential(runtime, { deviceToken: "lct_device_revoked_secret" }), runtime);
      const status = await getBridgeStatusWithCloudCheck({ ...runtime, fetchImpl });
      expect(JSON.stringify(status)).not.toContain("lct_device_revoked_secret");
      expect(status.cloudCheck).toMatchObject({ ok: false, code: "cloud.token_revoked" });
    });
  });

  it("runs the v0.9 watcher path and respects local paused source policy", async () => {
    await withTempRuntimeAsync(async (runtime) => {
      storeCredentials(credential(runtime), runtime);
      mkdirSync(join(runtime.homeDir, ".lore"), { recursive: true });
      writeFileSync(join(runtime.homeDir, ".lore", "source-policies.json"), JSON.stringify({
        policies: [{ sourceId: "src_claude-code", status: "paused" }]
      }), "utf8");
      const claudeDir = join(runtime.homeDir, ".claude", "projects", "demo");
      mkdirSync(claudeDir, { recursive: true });
      writeFileSync(join(claudeDir, "session.jsonl"), [
        JSON.stringify({ type: "user", sessionId: "s1", timestamp: "2026-04-30T00:00:00.000Z", cwd: "/repo", message: { role: "user", content: [{ type: "text", text: "remember this" }] } }),
        JSON.stringify({ type: "assistant", sessionId: "s1", timestamp: "2026-04-30T00:00:01.000Z", message: { role: "assistant", content: [{ type: "text", text: "noted" }] } })
      ].join("\n") + "\n", "utf8");

      let uploadCalls = 0;
      const stdout: string[] = [];
      const code = await runCli(["watch"], {
        stdout: { write: (chunk: string) => { stdout.push(chunk); return true; } },
        stderr: { write: () => true }
      }, {
        ...runtime,
        fetchImpl: async (input) => {
          if (String(input).includes("/v1/capture/sessions")) uploadCalls += 1;
          return Response.json({ source: { id: "src_claude-code", status: "paused" } });
        }
      });

      expect(code).toBe(0);
      expect(uploadCalls).toBe(0);
      expect(stdout.join("")).toContain("skipped");
      expect(stdout.join("")).toContain("source paused");
      expect(readFileSync(join(runtime.homeDir, ".lore", "source-status.json"), "utf8")).toContain("\"paused\"");
    });
  });

  it("uploads through the v0.9 watcher client when paired", async () => {
    await withTempRuntimeAsync(async (runtime) => {
      storeCredentials(credential(runtime), runtime);
      const claudeDir = join(runtime.homeDir, ".claude", "projects", "demo");
      mkdirSync(claudeDir, { recursive: true });
      writeFileSync(join(claudeDir, "session.jsonl"), [
        JSON.stringify({ type: "user", sessionId: "s2", timestamp: "2026-04-30T00:00:00.000Z", cwd: "/repo", message: { role: "user", content: [{ type: "text", text: "ship v1" }] } }),
        JSON.stringify({ type: "assistant", sessionId: "s2", timestamp: "2026-04-30T00:00:01.000Z", message: { role: "assistant", content: [{ type: "text", text: "ok" }] } })
      ].join("\n") + "\n", "utf8");

      const uploads: unknown[] = [];
      const result = await runWatchBridgeOnce({
        ...runtime,
        fetchImpl: async (input, init) => {
          if (String(input).includes("/v1/capture/sessions")) {
            uploads.push(JSON.parse(String(init?.body)));
            return Response.json({ session: { id: "sess_1" }, job: { id: "job_1" }, duplicate: false }, { status: 202 });
          }
          return Response.json({ source: { id: "src_claude-code", status: "active" } });
        }
      });

      expect(result.uploads).toHaveLength(1);
      expect(uploads).toHaveLength(1);
      expect(uploads[0]).toMatchObject({
        provider: "claude_code",
        source_id: "src_claude-code",
        capture_mode: "summary_only"
      });
    });
  });
});

function sink() {
  return {
    stdout: { write: () => true },
    stderr: { write: () => true }
  };
}

function withTempRuntime(callback: (runtime: BridgeRuntime) => void): void {
  const root = mkdtempSync(join(tmpdir(), "lore-cli-"));
  try {
    callback(makeRuntime(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function withTempRuntimeAsync(callback: (runtime: BridgeRuntime) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "lore-cli-"));
  try {
    await callback(makeRuntime(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function makeRuntime(root: string): BridgeRuntime {
  const homeDir = join(root, "home");
  const repoRoot = join(root, "repo");
  mkdirSync(homeDir, { recursive: true });
  mkdirSync(repoRoot, { recursive: true });
  return {
    homeDir,
    repoRoot,
    env: { PATH: "", LORE_CLI_DISABLE_KEYCHAIN: "1" },
    now: () => new Date("2026-04-30T00:00:00.000Z")
  };
}

function credential(runtime: BridgeRuntime, overrides: Partial<CredentialBundle> = {}): CredentialBundle {
  return {
    deviceId: "dev_1",
    vaultId: "vault_1",
    accountId: "acct_1",
    deviceToken: "lct_device_test_secret",
    deviceTokenExpiresAt: "2026-07-30T00:00:00.000Z",
    serviceToken: "lct_service_test_secret",
    serviceTokenExpiresAt: "2026-07-30T00:00:00.000Z",
    cloudUrl: "https://api.lorecontext.test",
    pairedAt: runtime.now().toISOString(),
    ...overrides
  };
}
