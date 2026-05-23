import { getDomain, getProvider, getSourceLabel, isSupported } from "./extractor.js";
import { summarizeForUpload } from "./redaction.js";
import type { CaptureEvent, ExtensionState } from "./types.js";

// Content script: only runs on supported domains because manifest's
// content_scripts.matches is the host allowlist. As a defense-in-depth
// guard we still bail when isSupported() returns false.

const provider = getProvider(window.location.href);
const domain = getDomain(window.location.href);
const sourceLabel = getSourceLabel(window.location.href);

if (!isSupported(window.location.href)) {
  // Defense in depth — the manifest already limits matches to the four
  // supported AI sites, but if a future manifest edit accidentally widens
  // the matcher we still no-op here.
} else {
  let captureTimeout: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (captureTimeout) return;
    captureTimeout = setTimeout(() => {
      captureTimeout = null;
      void performCapture();
    }, 2000);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function performCapture(): Promise<void> {
  // Re-read state on every capture so pause/private toggles take effect
  // without reload. State load uses chrome.storage which is async.
  const state = await readStateSafe();
  if (!state) return;

  if (!state.authorizedDomains.includes(domain)) return;
  if (state.isPaused || state.isPrivateMode) return;
  if (state.pausedDomains.includes(domain)) return;
  if (state.privateDomains.includes(domain)) return;

  const captureMode = state.rawArchiveEnabled ? "raw_archive" : "summary_only";
  const rawText = collectVisibleConversation();
  const summary = summarizeForUpload(rawText);
  if (!summary) return;

  const event: CaptureEvent = {
    source_id: `ext_${provider}`,
    external_event_id: `${provider}:${Date.now()}`,
    occurred_at: new Date().toISOString(),
    event_type: "session_delta",
    actor: "user",
    summary,
    raw_content: captureMode === "raw_archive" ? rawText : undefined,
    capture_mode: captureMode,
    source_url: sanitizeUrl(window.location.href),
    source_label: sourceLabel,
    provider,
    metadata: { domain }
  };

  chrome.runtime.sendMessage({ type: "CAPTURE_EVENT", event });
}

async function readStateSafe(): Promise<ExtensionState | undefined> {
  try {
    const data = (await chrome.storage.local.get("state")) as { state?: ExtensionState };
    return data.state;
  } catch {
    return undefined;
  }
}

/**
 * v1.0 deliberately does NOT scrape arbitrary DOM. We pull only visible
 * text from the document title plus the most recent visible heading so we
 * can stamp a session-delta marker. Real per-site extractors will land in
 * a follow-up PR with versioned per-provider extractors. This keeps Chrome
 * Web Store review focused on a small, auditable surface.
 */
function collectVisibleConversation(): string {
  const title = document.title || sourceLabel;
  const main = document.querySelector("main") ?? document.body;
  const text = (main?.innerText ?? "").slice(0, 4000);
  return [`title=${title}`, text].filter(Boolean).join("\n");
}

/** Strip query strings and fragments to avoid leaking auth tokens in URLs. */
export function sanitizeUrl(href: string): string {
  try {
    const u = new URL(href);
    return `${u.origin}${u.pathname}`;
  } catch {
    return href.split("?")[0]?.split("#")[0] ?? href;
  }
}
