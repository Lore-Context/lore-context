import { describe, it, expect } from "vitest";
import { describeMcpConnectionStatus, summarizeMcpConnections } from "../src/connection-status.js";

describe("describeMcpConnectionStatus", () => {
  it("returns service_degraded when operator marks degraded", () => {
    const r = describeMcpConnectionStatus({ serviceDegraded: true, hasServiceToken: true });
    expect(r.state).toBe("service_degraded");
    expect(r.isHealthy).toBe(false);
    expect(r.hint).not.toMatch(/MCP|stdio|hook/i);
  });

  it("returns unauthenticated when there is no service token", () => {
    const r = describeMcpConnectionStatus({});
    expect(r.state).toBe("unauthenticated");
    expect(r.action).toBe("sign_in");
  });

  it("returns token_expired when token is expired", () => {
    const r = describeMcpConnectionStatus({ hasServiceToken: true, tokenExpired: true });
    expect(r.state).toBe("token_expired");
    expect(r.action).toBe("reconnect");
  });

  it("returns helper_not_running when local helper is down", () => {
    const r = describeMcpConnectionStatus({ hasServiceToken: true, helperRunning: false });
    expect(r.state).toBe("helper_not_running");
    expect(r.action).toBe("start_helper");
  });

  it("returns source_paused when capture source is paused", () => {
    const r = describeMcpConnectionStatus({ hasServiceToken: true, helperRunning: true, sourcePaused: true });
    expect(r.state).toBe("source_paused");
    expect(r.action).toBe("resume_source");
  });

  it("returns rate_limited when API throttled", () => {
    const r = describeMcpConnectionStatus({ hasServiceToken: true, helperRunning: true, rateLimited: true });
    expect(r.state).toBe("rate_limited");
    expect(r.action).toBe("wait");
  });

  it("returns reconnect_needed on lastReconnectError without expiry", () => {
    const r = describeMcpConnectionStatus({
      hasServiceToken: true,
      helperRunning: true,
      lastReconnectError: "network_unreachable",
    });
    expect(r.state).toBe("reconnect_needed");
    expect(r.action).toBe("reconnect");
  });

  it("returns connecting when negotiating", () => {
    const r = describeMcpConnectionStatus({
      hasServiceToken: true,
      helperRunning: true,
      isNegotiating: true,
    });
    expect(r.state).toBe("connecting");
  });

  it("returns connected for hosted-only flow (helperRunning undefined)", () => {
    const r = describeMcpConnectionStatus({ hasServiceToken: true });
    expect(r.state).toBe("connected");
    expect(r.isHealthy).toBe(true);
  });

  it("returns connected when helper is running", () => {
    const r = describeMcpConnectionStatus({ hasServiceToken: true, helperRunning: true });
    expect(r.state).toBe("connected");
    expect(r.isHealthy).toBe(true);
  });

  it("never exposes MCP/stdio/hook jargon in user-facing copy", () => {
    const states = [
      describeMcpConnectionStatus({}),
      describeMcpConnectionStatus({ hasServiceToken: true, tokenExpired: true }),
      describeMcpConnectionStatus({ hasServiceToken: true, helperRunning: false }),
      describeMcpConnectionStatus({ hasServiceToken: true, helperRunning: true, sourcePaused: true }),
      describeMcpConnectionStatus({ hasServiceToken: true, helperRunning: true, rateLimited: true }),
      describeMcpConnectionStatus({ hasServiceToken: true, helperRunning: true, lastReconnectError: "x" }),
      describeMcpConnectionStatus({ serviceDegraded: true, hasServiceToken: true }),
    ];
    for (const s of states) {
      expect(s.label).not.toMatch(/\bMCP\b|stdio|hook|adapter|JSON-RPC/i);
      expect(s.hint).not.toMatch(/\bMCP\b|stdio|hook|adapter|JSON-RPC/i);
    }
  });
});

describe("summarizeMcpConnections", () => {
  it("returns connected when all sources are connected", () => {
    const r = summarizeMcpConnections([
      { hasServiceToken: true, helperRunning: true },
      { hasServiceToken: true, helperRunning: true },
    ]);
    expect(r.state).toBe("connected");
  });

  it("returns the most actionable state across mixed sources", () => {
    const r = summarizeMcpConnections([
      { hasServiceToken: true, helperRunning: true },
      { hasServiceToken: true, tokenExpired: true },
      { hasServiceToken: true, helperRunning: true, sourcePaused: true },
    ]);
    // token_expired ranks higher than source_paused, so the user sees the auth issue first.
    expect(r.state).toBe("token_expired");
  });

  it("falls back to unauthenticated for an empty list", () => {
    const r = summarizeMcpConnections([]);
    expect(r.state).toBe("unauthenticated");
  });
});
