import { describe, expect, it } from "vitest";
import {
  authorizeDomain,
  DEFAULT_STATE,
  isDomainAuthorized,
  isDomainCaptureBlocked,
  loadState,
  pauseDomain,
  resetState,
  resumeDomain,
  revokeDomain,
  saveState,
  setPrivateForDomain
} from "../src/state.js";
import type { KeyValueStore } from "../src/queue.js";

function fakeStore(): KeyValueStore {
  const data: Record<string, unknown> = {};
  return {
    async get<T>(key: string) {
      return data[key] as T | undefined;
    },
    async set<T>(key: string, value: T) {
      data[key] = value;
    }
  };
}

describe("DEFAULT_STATE", () => {
  it("starts with no authorized domains and raw archive disabled", () => {
    expect(DEFAULT_STATE.authorizedDomains).toEqual([]);
    expect(DEFAULT_STATE.rawArchiveEnabled).toBe(false);
    expect(DEFAULT_STATE.isAuthorized).toBe(false);
    expect(DEFAULT_STATE.apiEndpoint).toMatch(/^https:\/\//);
  });
});

describe("authorize/revoke domain", () => {
  it("adds a domain to the authorized list", () => {
    const next = authorizeDomain(DEFAULT_STATE, "chatgpt.com");
    expect(next.authorizedDomains).toContain("chatgpt.com");
    expect(next.isAuthorized).toBe(true);
    expect(isDomainAuthorized(next, "chatgpt.com")).toBe(true);
  });
  it("is idempotent", () => {
    let s = authorizeDomain(DEFAULT_STATE, "claude.ai");
    s = authorizeDomain(s, "claude.ai");
    expect(s.authorizedDomains).toEqual(["claude.ai"]);
  });
  it("revokes a domain", () => {
    let s = authorizeDomain(DEFAULT_STATE, "claude.ai");
    s = revokeDomain(s, "claude.ai");
    expect(isDomainAuthorized(s, "claude.ai")).toBe(false);
    expect(s.isAuthorized).toBe(false);
  });
  it("normalizes case", () => {
    const s = authorizeDomain(DEFAULT_STATE, "ChatGPT.com ");
    expect(isDomainAuthorized(s, "chatgpt.com")).toBe(true);
  });
});

describe("isDomainCaptureBlocked", () => {
  it("blocks when global pause is on", () => {
    const s = { ...DEFAULT_STATE, isPaused: true };
    expect(isDomainCaptureBlocked(s, "chatgpt.com")).toBe(true);
  });
  it("blocks when global private mode is on", () => {
    const s = { ...DEFAULT_STATE, isPrivateMode: true };
    expect(isDomainCaptureBlocked(s, "chatgpt.com")).toBe(true);
  });
  it("blocks when domain is paused", () => {
    let s = pauseDomain(DEFAULT_STATE, "chatgpt.com");
    expect(isDomainCaptureBlocked(s, "chatgpt.com")).toBe(true);
    s = resumeDomain(s, "chatgpt.com");
    expect(isDomainCaptureBlocked(s, "chatgpt.com")).toBe(false);
  });
  it("blocks when domain is private", () => {
    let s = setPrivateForDomain(DEFAULT_STATE, "claude.ai", true);
    expect(isDomainCaptureBlocked(s, "claude.ai")).toBe(true);
    s = setPrivateForDomain(s, "claude.ai", false);
    expect(isDomainCaptureBlocked(s, "claude.ai")).toBe(false);
  });
});

describe("loadState/saveState round trip", () => {
  it("merges defaults for missing keys", async () => {
    const store = fakeStore();
    await store.set("state", { authorizedDomains: ["chatgpt.com"] });
    const loaded = await loadState(store);
    expect(loaded.authorizedDomains).toEqual(["chatgpt.com"]);
    expect(loaded.rawArchiveEnabled).toBe(false);
    expect(loaded.apiEndpoint).toBe(DEFAULT_STATE.apiEndpoint);
  });
  it("save then load is idempotent", async () => {
    const store = fakeStore();
    const s = { ...DEFAULT_STATE, vaultId: "vault_x" };
    await saveState(store, s);
    const loaded = await loadState(store);
    expect(loaded.vaultId).toBe("vault_x");
  });
});

describe("resetState", () => {
  it("returns a clean default copy", () => {
    const reset = resetState();
    expect(reset.authorizedDomains).toEqual([]);
    expect(reset.deviceToken).toBeUndefined();
  });
});
