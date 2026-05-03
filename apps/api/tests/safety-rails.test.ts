import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CloudPlatform,
  InMemoryCloudStore,
  type InstallTokenQuotaConfig
} from "../src/cloud.js";
import { ActivationTelemetrySink } from "../src/activation-telemetry.js";
import { type FeatureFlagSnapshot } from "../src/feature-flags.js";
import { HOSTED_MCP_WRITE_TOOLS, peekHostedMcpWriteIntent } from "../src/index.js";

const FIXED_NOW = new Date("2026-05-03T12:00:00.000Z");
const CLIENT_ID = "mock-client.local";

function defaultFlags(overrides: Partial<FeatureFlagSnapshot> = {}): FeatureFlagSnapshot {
  return {
    publicSignup: true,
    tokenIssuance: true,
    captureIngest: true,
    captureClaudeCode: true,
    captureCodex: true,
    captureCursor: true,
    captureOpencode: true,
    browserExtensionCapture: true,
    modelGateway: true,
    hostedMcpWrites: true,
    dashboardBetaControls: true,
    publicBetaPaused: false,
    allowlistRequired: false,
    allowlist: [],
    ...overrides
  };
}

function defaultQuota(overrides: Partial<InstallTokenQuotaConfig> = {}): InstallTokenQuotaConfig {
  return {
    perAccountPerHour: 5,
    perAccountPerDay: 50,
    perVaultPerHour: 5,
    perVaultPerDay: 50,
    ...overrides
  };
}

interface PlatformContext {
  platform: CloudPlatform;
  setFlags: (next: FeatureFlagSnapshot) => void;
  setQuota: (next: InstallTokenQuotaConfig) => void;
  telemetry: ActivationTelemetrySink;
}

function makePlatform(initial: {
  flags?: Partial<FeatureFlagSnapshot>;
  quota?: Partial<InstallTokenQuotaConfig>;
} = {}): PlatformContext {
  let flags = defaultFlags(initial.flags);
  let quota = defaultQuota(initial.quota);
  const telemetry = new ActivationTelemetrySink({ now: () => FIXED_NOW });
  const platform = new CloudPlatform({
    store: new InMemoryCloudStore(),
    now: () => FIXED_NOW,
    activationTelemetry: telemetry,
    featureFlagsProvider: () => flags,
    installTokenQuotaProvider: () => quota
  });
  return {
    platform,
    telemetry,
    setFlags: (next) => {
      flags = next;
    },
    setQuota: (next) => {
      quota = next;
    }
  };
}

function enableGoogleMockEnv(): void {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("LORE_AUTH_MOCK_GOOGLE", "1");
  vi.stubEnv("GOOGLE_CLIENT_ID", CLIENT_ID);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "mock-google-secret");
  vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost/auth/google/callback");
  vi.stubEnv("SESSION_SECRET", "test-safety-rails-secret");
}

function mockClaims(overrides: Record<string, unknown> = {}) {
  return {
    sub: "google-user-1",
    aud: CLIENT_ID,
    iss: "https://accounts.google.com",
    exp: Math.floor(FIXED_NOW.getTime() / 1000) + 3600,
    email: "user@example.com",
    name: "Lore User",
    ...overrides
  };
}

async function startGoogleAuthCookie(platform: CloudPlatform): Promise<{ stateCookie: string; state: string }> {
  const result = await platform.handle({
    request: new Request("http://localhost/auth/google/start"),
    url: new URL("http://localhost/auth/google/start"),
    path: "/auth/google/start",
    method: "GET",
    hasAdminApiKey: false,
    isLoopback: false
  });
  const setCookies = result.headers?.["set-cookie"];
  const cookies = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
  const stateRaw = cookies.find((cookie) => cookie.startsWith("lore_oauth_state="));
  if (!stateRaw) throw new Error("missing state cookie");
  const stateCookie = stateRaw.split(";")[0]!;
  const state = stateCookie.split("=")[1]!;
  return { stateCookie, state };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("safety-rails: install-token kill switches", () => {
  it("returns 503 cloud.feature_disabled when tokenIssuance is off", async () => {
    enableGoogleMockEnv();
    const ctx = makePlatform({ flags: { tokenIssuance: false } });

    await expect(
      ctx.platform.handle({
        request: new Request("http://localhost/v1/cloud/install-token", {
          method: "POST",
          headers: { "content-type": "application/json", cookie: "lore_session=lct_session_X" },
          body: "{}"
        }),
        url: new URL("http://localhost/v1/cloud/install-token"),
        path: "/v1/cloud/install-token",
        method: "POST",
        hasAdminApiKey: false,
        isLoopback: false
      })
    ).rejects.toMatchObject({ code: "cloud.feature_disabled", status: 503 });
  });

  it("returns 503 cloud.feature_disabled when publicBetaPaused is on", async () => {
    enableGoogleMockEnv();
    const ctx = makePlatform({ flags: { publicBetaPaused: true, tokenIssuance: false } });

    await expect(
      ctx.platform.handle({
        request: new Request("http://localhost/v1/cloud/install-token", {
          method: "POST",
          headers: { "content-type": "application/json", cookie: "lore_session=lct_session_X" },
          body: "{}"
        }),
        url: new URL("http://localhost/v1/cloud/install-token"),
        path: "/v1/cloud/install-token",
        method: "POST",
        hasAdminApiKey: false,
        isLoopback: false
      })
    ).rejects.toMatchObject({ code: "cloud.feature_disabled", status: 503 });
  });

  it("admin path bypasses kill switches", async () => {
    const ctx = makePlatform({ flags: { tokenIssuance: false } });
    const result = await ctx.platform.handle({
      request: new Request("http://localhost/v1/cloud/install-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      }),
      url: new URL("http://localhost/v1/cloud/install-token"),
      path: "/v1/cloud/install-token",
      method: "POST",
      hasAdminApiKey: true,
      isLoopback: false
    });
    expect(result.status).toBe(200);
  });
});

describe("safety-rails: install-token per-account/vault quota", () => {
  it("rejects subsequent issuance with cloud.token_quota_exceeded once cap reached", async () => {
    enableGoogleMockEnv();
    const ctx = makePlatform({ quota: { perAccountPerHour: 2, perVaultPerHour: 2 } });

    // Sign in once via mock Google to obtain session+csrf cookies.
    const { stateCookie, state } = await startGoogleAuthCookie(ctx.platform);
    const idToken = CloudPlatform.encodeMockIdToken(mockClaims());
    const callback = await ctx.platform.handle({
      request: new Request("http://localhost/auth/google/callback", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: stateCookie },
        body: JSON.stringify({ id_token: idToken, state })
      }),
      url: new URL("http://localhost/auth/google/callback"),
      path: "/auth/google/callback",
      method: "POST",
      hasAdminApiKey: false,
      isLoopback: false
    });
    expect(callback.status).toBe(200);
    const setCookies = (callback.headers?.["set-cookie"] as string[] | undefined) ?? [];
    const cookieHeader = setCookies
      .filter((cookie) => cookie.startsWith("lore_session=") || cookie.startsWith("lore_csrf="))
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    const csrf = cookieHeader.match(/(?:^|; )lore_csrf=([^;]+)/)?.[1];
    expect(csrf).toBeDefined();

    const issueOne = async () =>
      ctx.platform.handle({
        request: new Request("http://localhost/v1/cloud/install-token", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: cookieHeader,
            "x-lore-csrf": csrf!
          },
          body: "{}"
        }),
        url: new URL("http://localhost/v1/cloud/install-token"),
        path: "/v1/cloud/install-token",
        method: "POST",
        hasAdminApiKey: false,
        isLoopback: false
      });

    const first = await issueOne();
    expect(first.status).toBe(200);
    const second = await issueOne();
    expect(second.status).toBe(200);
    await expect(issueOne()).rejects.toMatchObject({
      code: "cloud.token_quota_exceeded",
      status: 429
    });
  });
});

describe("safety-rails: Google sign-in allowlist", () => {
  it("rejects with auth.allowlist_required 403 when email is not on the allowlist", async () => {
    enableGoogleMockEnv();
    const ctx = makePlatform({
      flags: {
        allowlistRequired: true,
        allowlist: ["@allowed.example", "explicit@example.com"]
      }
    });

    const { stateCookie, state } = await startGoogleAuthCookie(ctx.platform);
    const idToken = CloudPlatform.encodeMockIdToken(
      mockClaims({ email: "stranger@evil.example", sub: "stranger-1" })
    );

    await expect(
      ctx.platform.handle({
        request: new Request("http://localhost/auth/google/callback", {
          method: "POST",
          headers: { "content-type": "application/json", cookie: stateCookie },
          body: JSON.stringify({ id_token: idToken, state })
        }),
        url: new URL("http://localhost/auth/google/callback"),
        path: "/auth/google/callback",
        method: "POST",
        hasAdminApiKey: false,
        isLoopback: false
      })
    ).rejects.toMatchObject({ code: "auth.allowlist_required", status: 403 });
  });

  it("admits an email matching a domain entry in the allowlist", async () => {
    enableGoogleMockEnv();
    const ctx = makePlatform({
      flags: {
        allowlistRequired: true,
        allowlist: ["@allowed.example"]
      }
    });

    const { stateCookie, state } = await startGoogleAuthCookie(ctx.platform);
    const idToken = CloudPlatform.encodeMockIdToken(
      mockClaims({ email: "vip@allowed.example", sub: "vip-1" })
    );

    const result = await ctx.platform.handle({
      request: new Request("http://localhost/auth/google/callback", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: stateCookie },
        body: JSON.stringify({ id_token: idToken, state })
      }),
      url: new URL("http://localhost/auth/google/callback"),
      path: "/auth/google/callback",
      method: "POST",
      hasAdminApiKey: false,
      isLoopback: false
    });
    expect(result.status).toBe(200);
  });

  it("rejects /auth/google/start with auth.public_beta_paused 503 when master switch is on", async () => {
    enableGoogleMockEnv();
    const ctx = makePlatform({ flags: { publicBetaPaused: true, publicSignup: false, tokenIssuance: false } });

    await expect(
      ctx.platform.handle({
        request: new Request("http://localhost/auth/google/start"),
        url: new URL("http://localhost/auth/google/start"),
        path: "/auth/google/start",
        method: "GET",
        hasAdminApiKey: false,
        isLoopback: false
      })
    ).rejects.toMatchObject({ code: "auth.public_beta_paused", status: 503 });
  });
});

describe("safety-rails: capture kill switches", () => {
  async function pairDevice(platform: CloudPlatform): Promise<{ token: string }> {
    const installed = await platform.issueInstallToken();
    const paired = await platform.redeemInstallToken(installed.plaintext, { label: "safety-rails" });
    return { token: paired.deviceToken.plaintext };
  }

  it("heartbeat returns 503 capture.feature_disabled when captureIngest is off", async () => {
    const ctx = makePlatform();
    const { token } = await pairDevice(ctx.platform);
    ctx.setFlags(defaultFlags({ captureIngest: false }));

    await expect(
      ctx.platform.handle({
        request: new Request("http://localhost/v1/capture/sources/src_1/heartbeat", {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({ source_provider: "claude_code" })
        }),
        url: new URL("http://localhost/v1/capture/sources/src_1/heartbeat"),
        path: "/v1/capture/sources/src_1/heartbeat",
        method: "POST",
        hasAdminApiKey: false,
        isLoopback: false
      })
    ).rejects.toMatchObject({ code: "capture.feature_disabled", status: 503 });
  });

  it("heartbeat returns 503 capture.provider_disabled when the provider switch is off", async () => {
    const ctx = makePlatform();
    const { token } = await pairDevice(ctx.platform);
    ctx.setFlags(defaultFlags({ captureClaudeCode: false }));

    await expect(
      ctx.platform.handle({
        request: new Request("http://localhost/v1/capture/sources/src_2/heartbeat", {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({ source_provider: "claude_code" })
        }),
        url: new URL("http://localhost/v1/capture/sources/src_2/heartbeat"),
        path: "/v1/capture/sources/src_2/heartbeat",
        method: "POST",
        hasAdminApiKey: false,
        isLoopback: false
      })
    ).rejects.toMatchObject({ code: "capture.provider_disabled", status: 503 });
  });

  it("capture sessions POST returns 503 capture.provider_disabled for the body provider", async () => {
    const ctx = makePlatform();
    const { token } = await pairDevice(ctx.platform);
    ctx.setFlags(defaultFlags({ captureCursor: false }));

    const body = {
      provider: "cursor",
      source_id: "src_cursor",
      source_original_id: "session-1",
      content_hash: "hash-1",
      idempotency_key: "cap_idem_1",
      capture_mode: "summary_only",
      redaction: { version: "v1", secret_count: 0, private_block_count: 0 },
      turn_summary: [{ role: "user", text: "hi" }]
    };
    await expect(
      ctx.platform.handle({
        request: new Request("http://localhost/v1/capture/sessions", {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify(body)
        }),
        url: new URL("http://localhost/v1/capture/sessions"),
        path: "/v1/capture/sessions",
        method: "POST",
        hasAdminApiKey: false,
        isLoopback: false
      })
    ).rejects.toMatchObject({ code: "capture.provider_disabled", status: 503 });
  });
});

describe("safety-rails: activation telemetry redaction", () => {
  it("never persists raw memory content keys when an event is recorded", () => {
    const ctx = makePlatform();
    ctx.platform.activationTelemetry.record(
      {
        event: "first_candidate_seen",
        surface: "memory_inbox",
        metadata: {
          // Whitelisted scalar fields:
          provider: "claude_code",
          captureMode: "summary_only",
          // Disallowed raw content keys must be dropped by sanitizeMetadata:
          rawContent: "AKIA-secret-do-not-store",
          turnSummary: "user: ssh root@... password=hunter2",
          plaintext: "any raw text",
          email: "leaked@example.com"
        }
      },
      { vaultId: "vault_v1", accountId: "acct_v1" }
    );
    const events = ctx.telemetry.list();
    expect(events).toHaveLength(1);
    const recorded = events[0]!;
    const serialized = JSON.stringify(recorded);
    expect(recorded.metadata).toEqual({ provider: "claude_code", captureMode: "summary_only" });
    expect(serialized).not.toContain("AKIA-secret-do-not-store");
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("leaked@example.com");
  });

  it("emits signin_started + signin_completed without any raw token plaintext", async () => {
    enableGoogleMockEnv();
    const ctx = makePlatform();
    const { stateCookie, state } = await startGoogleAuthCookie(ctx.platform);
    const idToken = CloudPlatform.encodeMockIdToken(mockClaims({ email: "telemetry@allowed.example" }));
    const callback = await ctx.platform.handle({
      request: new Request("http://localhost/auth/google/callback", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: stateCookie },
        body: JSON.stringify({ id_token: idToken, state })
      }),
      url: new URL("http://localhost/auth/google/callback"),
      path: "/auth/google/callback",
      method: "POST",
      hasAdminApiKey: false,
      isLoopback: false
    });
    expect(callback.status).toBe(200);
    const events = ctx.telemetry.list();
    const eventNames = events.map((entry) => entry.event);
    expect(eventNames).toContain("signin_started");
    expect(eventNames).toContain("signin_completed");
    const serialized = JSON.stringify(events);
    // No raw session plaintext, id_token, or email body should appear.
    expect(serialized).not.toContain("lct_session_");
    expect(serialized).not.toContain(idToken);
    expect(serialized).not.toContain("telemetry@allowed.example");
  });
});

describe("safety-rails: model gateway kill switch", () => {
  it("processCaptureJob short-circuits the model gateway when modelGateway flag is off", async () => {
    const ctx = makePlatform({ flags: { modelGateway: false } });
    const install = await ctx.platform.issueInstallToken();
    const paired = await ctx.platform.redeemInstallToken(install.plaintext, { label: "modelgw-killswitch" });
    const auth = await ctx.platform.authenticate(paired.deviceToken.plaintext);
    const enqueue = await ctx.platform.enqueueSession({
      auth,
      sourceId: "src_modelgw_off",
      provider: "claude_code",
      sourceOriginalId: "sess_modelgw_off",
      contentHash: "hash_modelgw_off",
      idempotencyKey: "cap_modelgw_off",
      captureMode: "summary_only",
      startedAt: "2026-05-03T11:00:00.000Z",
      endedAt: "2026-05-03T11:01:00.000Z",
      redaction: { version: "v1", secretCount: 0, privateBlockCount: 0 },
      metadata: {},
      turnSummary: [
        { role: "user", text: "Confirm the model gateway kill switch suppresses provider work." },
        { role: "assistant", text: "It does — fallback path is used and provenance reports disabled." }
      ]
    });

    const outcome = await ctx.platform.processCaptureJob(enqueue.job.id);

    expect(outcome.job.status).toBe("completed");
    expect(outcome.candidate?.status).toBe("pending");
    expect(outcome.degraded).toBe(true);
    expect(outcome.ruleBasedFallback).toBe(true);
    expect(outcome.modelError).toMatch(/disabled by operator kill switch/);
    expect(outcome.candidate?.metadata.provenance).toMatchObject({ provider: "noop", model: "disabled" });
  });
});

describe("safety-rails: hosted MCP write kill switch", () => {
  function rpcRequest(body: unknown): Request {
    return new Request("http://localhost/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  it("flags every documented mutating tool as a write", async () => {
    for (const toolName of HOSTED_MCP_WRITE_TOOLS) {
      const result = await peekHostedMcpWriteIntent(
        rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: toolName, arguments: {} } })
      );
      expect(result.isWrite).toBe(true);
      if (result.isWrite) {
        expect(result.toolName).toBe(toolName);
      }
    }
  });

  it("does not flag read/discovery tool calls as writes", async () => {
    for (const toolName of [
      "context_query",
      "memory_search",
      "memory_list",
      "memory_get",
      "memory_export",
      "evidence.trace_get",
      "trace_get",
      "profile.get",
      "memory.recall",
      "memory.inbox_list"
    ]) {
      const result = await peekHostedMcpWriteIntent(
        rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: toolName, arguments: {} } })
      );
      expect(result).toEqual({ isWrite: false });
    }
  });

  it("does not flag discovery JSON-RPC methods (tools/list, initialize, resources/list) as writes", async () => {
    for (const method of ["tools/list", "initialize", "resources/list", "prompts/list"]) {
      const result = await peekHostedMcpWriteIntent(
        rpcRequest({ jsonrpc: "2.0", id: 1, method })
      );
      expect(result).toEqual({ isWrite: false });
    }
  });

  it("returns isWrite=false for malformed bodies (so unrelated parse errors do not 503)", async () => {
    const garbage = new Request("http://localhost/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json"
    });
    const result = await peekHostedMcpWriteIntent(garbage);
    expect(result).toEqual({ isWrite: false });
  });
});
