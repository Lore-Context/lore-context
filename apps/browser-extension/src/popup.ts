import {
  authorizeDomain,
  isDomainAuthorized,
  loadState,
  pauseDomain,
  resumeDomain,
  saveState,
  setPrivateForDomain
} from "./state.js";
import type { ExtensionState } from "./types.js";
import { getDomain, getSourceLabel, isSupported } from "./extractor.js";
import { redactForLog } from "./redaction.js";

interface PopupContext {
  url: string;
  domain: string;
  sourceLabel: string;
  supported: boolean;
}

async function readContext(): Promise<PopupContext> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0]?.url ?? "";
  const domain = getDomain(url);
  return {
    url,
    domain,
    sourceLabel: getSourceLabel(url),
    supported: isSupported(url)
  };
}

const chromeStore = {
  async get<T>(key: string) {
    const data = await chrome.storage.local.get(key);
    return data[key] as T | undefined;
  },
  async set<T>(key: string, value: T) {
    await chrome.storage.local.set({ [key]: value });
  }
};

async function updateUI(): Promise<void> {
  const ctx = await readContext();
  const state = await loadState(chromeStore);

  setText("source-label", ctx.supported ? ctx.sourceLabel : "Unsupported page");
  setText("status-text", deriveStatus(state, ctx));
  setStatusClass("status-text", deriveTone(state, ctx));
  setText("last-capture", formatRelative(state.lastCaptureAt) ?? "—");
  setText("last-error", state.lastError ? `${state.lastError} (${formatRelative(state.lastErrorAt) ?? "recent"})` : "none");

  toggleVisibility("auth-btn", ctx.supported && !isDomainAuthorized(state, ctx.domain));
  toggleVisibility("revoke-btn", ctx.supported && isDomainAuthorized(state, ctx.domain));
  toggleVisibility("pause-btn", ctx.supported && isDomainAuthorized(state, ctx.domain));
  toggleVisibility("private-btn", ctx.supported && isDomainAuthorized(state, ctx.domain));

  setText("pause-btn", state.pausedDomains.includes(ctx.domain) ? "Resume Capture" : "Pause Capture");
  setText("private-btn", state.privateDomains.includes(ctx.domain) ? "Disable Private" : "Enable Private");
}

function deriveStatus(state: ExtensionState, ctx: PopupContext): string {
  if (!ctx.supported) return "Unsupported";
  if (!isDomainAuthorized(state, ctx.domain)) return "Not authorized";
  if (state.isPrivateMode || state.privateDomains.includes(ctx.domain)) return "Private";
  if (state.isPaused || state.pausedDomains.includes(ctx.domain)) return "Paused";
  return "Active";
}

function deriveTone(state: ExtensionState, ctx: PopupContext): "ok" | "paused" | "unauth" {
  if (!ctx.supported || !isDomainAuthorized(state, ctx.domain)) return "unauth";
  if (state.isPaused || state.pausedDomains.includes(ctx.domain) || state.isPrivateMode || state.privateDomains.includes(ctx.domain)) {
    return "paused";
  }
  return "ok";
}

document.getElementById("auth-btn")?.addEventListener("click", async () => {
  const ctx = await readContext();
  if (!ctx.supported) return;
  let state = await loadState(chromeStore);
  state = authorizeDomain(state, ctx.domain);
  await saveState(chromeStore, state);
  await updateUI();
});

document.getElementById("revoke-btn")?.addEventListener("click", async () => {
  const ctx = await readContext();
  let state = await loadState(chromeStore);
  state = { ...state, authorizedDomains: state.authorizedDomains.filter((d) => d !== ctx.domain) };
  await saveState(chromeStore, state);
  await updateUI();
});

document.getElementById("pause-btn")?.addEventListener("click", async () => {
  const ctx = await readContext();
  let state = await loadState(chromeStore);
  state = state.pausedDomains.includes(ctx.domain) ? resumeDomain(state, ctx.domain) : pauseDomain(state, ctx.domain);
  await saveState(chromeStore, state);
  await updateUI();
});

document.getElementById("private-btn")?.addEventListener("click", async () => {
  const ctx = await readContext();
  let state = await loadState(chromeStore);
  const enable = !state.privateDomains.includes(ctx.domain);
  state = setPrivateForDomain(state, ctx.domain, enable);
  await saveState(chromeStore, state);
  await updateUI();
});

document.getElementById("review-btn")?.addEventListener("click", () => {
  void chrome.tabs.create({ url: "https://lorecontext.com/inbox" });
});

document.getElementById("options-btn")?.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function setStatusClass(id: string, tone: "ok" | "paused" | "unauth"): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `status-badge status-${tone}`;
}

function toggleVisibility(id: string, visible: boolean): void {
  const el = document.getElementById(id);
  if (!el) return;
  (el as HTMLElement).style.display = visible ? "" : "none";
}

function formatRelative(iso?: string): string | undefined {
  if (!iso) return undefined;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return undefined;
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

void updateUI().catch((error) => {
  console.log("Lore popup update failed", redactForLog({ error: String(error) }));
});
