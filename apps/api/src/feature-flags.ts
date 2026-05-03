// Lore v1.0.0-rc.2 — env-driven feature flags and kill switches.
//
// These primitives let operators disable user-visible surfaces without a code
// deploy when something goes wrong during the public SaaS beta. Every flag has
// a safe-by-default value: tests and local dev keep all flags enabled, while
// production operators can flip the corresponding env var to "0" / "off" /
// "false" / "disabled" to drain a code path.
//
// The "public beta paused" master switch is an opt-in: setting it to "1" /
// "on" / "true" disables signup-style endpoints and emits a clear error so the
// dashboard banner can explain the maintenance state.
//
// The allowlist gate is also opt-in. When `LORE_BETA_ALLOWLIST` is unset,
// signup is open. When it is set to a comma-separated list of email addresses
// or `@domain.tld` suffixes, only matching identities can complete signup.

export type FeatureFlagName =
  | "publicSignup"
  | "tokenIssuance"
  | "captureIngest"
  | "captureClaudeCode"
  | "captureCodex"
  | "captureCursor"
  | "captureOpencode"
  | "browserExtensionCapture"
  | "modelGateway"
  | "hostedMcpWrites"
  | "dashboardBetaControls";

export interface FeatureFlagSnapshot {
  publicSignup: boolean;
  tokenIssuance: boolean;
  captureIngest: boolean;
  captureClaudeCode: boolean;
  captureCodex: boolean;
  captureCursor: boolean;
  captureOpencode: boolean;
  browserExtensionCapture: boolean;
  modelGateway: boolean;
  hostedMcpWrites: boolean;
  dashboardBetaControls: boolean;
  publicBetaPaused: boolean;
  /** When true, only signup attempts that match `LORE_BETA_ALLOWLIST` succeed. */
  allowlistRequired: boolean;
  allowlist: ReadonlyArray<string>;
}

const TRUTHY = new Set(["1", "true", "yes", "on", "enabled"]);
const FALSY = new Set(["0", "false", "no", "off", "disabled"]);

interface FlagSpec {
  flag: FeatureFlagName;
  envName: string;
  defaultValue: boolean;
}

const FLAG_SPECS: ReadonlyArray<FlagSpec> = [
  { flag: "publicSignup", envName: "LORE_FLAG_PUBLIC_SIGNUP", defaultValue: true },
  { flag: "tokenIssuance", envName: "LORE_FLAG_TOKEN_ISSUANCE", defaultValue: true },
  { flag: "captureIngest", envName: "LORE_FLAG_CAPTURE_INGEST", defaultValue: true },
  { flag: "captureClaudeCode", envName: "LORE_FLAG_CAPTURE_CLAUDE_CODE", defaultValue: true },
  { flag: "captureCodex", envName: "LORE_FLAG_CAPTURE_CODEX", defaultValue: true },
  { flag: "captureCursor", envName: "LORE_FLAG_CAPTURE_CURSOR", defaultValue: true },
  { flag: "captureOpencode", envName: "LORE_FLAG_CAPTURE_OPENCODE", defaultValue: true },
  { flag: "browserExtensionCapture", envName: "LORE_FLAG_BROWSER_EXTENSION", defaultValue: true },
  { flag: "modelGateway", envName: "LORE_FLAG_MODEL_GATEWAY", defaultValue: true },
  { flag: "hostedMcpWrites", envName: "LORE_FLAG_HOSTED_MCP_WRITES", defaultValue: true },
  { flag: "dashboardBetaControls", envName: "LORE_FLAG_DASHBOARD_BETA_CONTROLS", defaultValue: true }
];

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (typeof value !== "string") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;
  return defaultValue;
}

export function readFeatureFlags(env: NodeJS.ProcessEnv = process.env): FeatureFlagSnapshot {
  const snapshot: Record<string, unknown> = {};
  for (const spec of FLAG_SPECS) {
    snapshot[spec.flag] = parseBoolean(env[spec.envName], spec.defaultValue);
  }

  // Master switch — when paused, signup-style endpoints disable themselves.
  const publicBetaPaused = parseBoolean(env.LORE_PUBLIC_BETA_PAUSED, false);
  if (publicBetaPaused) {
    snapshot.publicSignup = false;
    snapshot.tokenIssuance = false;
  }

  const allowlist = parseAllowlist(env.LORE_BETA_ALLOWLIST);
  return {
    ...(snapshot as Omit<FeatureFlagSnapshot, "publicBetaPaused" | "allowlistRequired" | "allowlist">),
    publicBetaPaused,
    allowlistRequired: allowlist.length > 0,
    allowlist
  };
}

export function isFeatureEnabled(flag: FeatureFlagName, env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(readFeatureFlags(env)[flag]);
}

function parseAllowlist(value: string | undefined): string[] {
  if (typeof value !== "string" || value.trim().length === 0) return [];
  const out: string[] = [];
  for (const part of value.split(",")) {
    const trimmed = part.trim().toLowerCase();
    if (trimmed.length > 0) out.push(trimmed);
  }
  return out;
}

/**
 * Returns true when the given email is allowed by the configured allowlist.
 * When the allowlist is empty, all signups are allowed. Domain-style entries
 * starting with `@` match by suffix; otherwise the entry must equal the email
 * (case-insensitive).
 */
export function isAllowedByBetaAllowlist(email: string | null | undefined, snapshot: FeatureFlagSnapshot): boolean {
  if (!snapshot.allowlistRequired) return true;
  if (typeof email !== "string" || email.trim().length === 0) return false;
  const normalized = email.trim().toLowerCase();
  for (const entry of snapshot.allowlist) {
    if (entry.startsWith("@")) {
      if (normalized.endsWith(entry)) return true;
    } else if (normalized === entry) {
      return true;
    }
  }
  return false;
}

export interface FeatureFlagPublicView {
  publicSignup: boolean;
  tokenIssuance: boolean;
  captureIngest: boolean;
  modelGateway: boolean;
  hostedMcpWrites: boolean;
  dashboardBetaControls: boolean;
  publicBetaPaused: boolean;
  allowlistRequired: boolean;
  capture: {
    claudeCode: boolean;
    codex: boolean;
    cursor: boolean;
    opencode: boolean;
    browserExtension: boolean;
  };
}

/**
 * Public-safe projection of the feature flag snapshot for the dashboard.
 * Never includes the raw allowlist contents — only whether one is configured.
 */
export function toPublicFeatureFlagView(snapshot: FeatureFlagSnapshot): FeatureFlagPublicView {
  return {
    publicSignup: snapshot.publicSignup,
    tokenIssuance: snapshot.tokenIssuance,
    captureIngest: snapshot.captureIngest,
    modelGateway: snapshot.modelGateway,
    hostedMcpWrites: snapshot.hostedMcpWrites,
    dashboardBetaControls: snapshot.dashboardBetaControls,
    publicBetaPaused: snapshot.publicBetaPaused,
    allowlistRequired: snapshot.allowlistRequired,
    capture: {
      claudeCode: snapshot.captureClaudeCode,
      codex: snapshot.captureCodex,
      cursor: snapshot.captureCursor,
      opencode: snapshot.captureOpencode,
      browserExtension: snapshot.browserExtensionCapture
    }
  };
}

/**
 * Map a capture provider id to its dedicated kill switch flag.
 */
export function captureProviderFlag(provider: string): FeatureFlagName | undefined {
  switch (provider) {
    case "claude_code": return "captureClaudeCode";
    case "codex": return "captureCodex";
    case "cursor": return "captureCursor";
    case "opencode": return "captureOpencode";
    default: return undefined;
  }
}
