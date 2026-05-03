import type { CaptureEvent } from "./types.js";

export interface Extractor {
  extract(): CaptureEvent[];
}

export type Provider = "chatgpt" | "claude" | "gemini" | "perplexity" | "unknown";

const PROVIDER_LABELS: Record<Provider, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude.ai",
  gemini: "Gemini",
  perplexity: "Perplexity",
  unknown: "Unknown"
};

const SUPPORTED: ReadonlyArray<{ host: RegExp; provider: Provider }> = [
  { host: /(^|\.)chatgpt\.com$/i, provider: "chatgpt" },
  { host: /(^|\.)chat\.openai\.com$/i, provider: "chatgpt" },
  { host: /(^|\.)claude\.ai$/i, provider: "claude" },
  { host: /(^|\.)gemini\.google\.com$/i, provider: "gemini" },
  { host: /(^|\.)perplexity\.ai$/i, provider: "perplexity" }
];

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function getProvider(url: string): Provider {
  const host = getDomain(url);
  if (!host) return "unknown";
  for (const { host: pattern, provider } of SUPPORTED) {
    if (pattern.test(host)) return provider;
  }
  return "unknown";
}

export function isSupported(url: string): boolean {
  return getProvider(url) !== "unknown";
}

export function getSourceLabel(url: string): string {
  return PROVIDER_LABELS[getProvider(url)];
}
