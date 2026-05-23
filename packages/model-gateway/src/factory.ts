import { CloudProvider, type CloudProviderConfig } from "./providers/cloud.js";
import { ModelGateway, type ModelGatewayConfig } from "./gateway.js";
import type { ModelBudget } from "./budget.js";

/**
 * Environment variables that drive the cloud model gateway. Operators flip a
 * deployment from "no model / safe fallback" to a real provider purely
 * through these — no code change required.
 *
 * Required for real cloud operation:
 *   LORE_MODEL_GATEWAY_ENDPOINT  Chat-completions URL (OpenAI-compatible).
 *   LORE_MODEL_GATEWAY_API_KEY   Bearer key for the endpoint.
 *
 * Optional:
 *   LORE_MODEL_GATEWAY_MODEL          Model id (default "gpt-4o-mini").
 *   LORE_MODEL_GATEWAY_TIMEOUT_MS     Per-call timeout (default 15000).
 *   LORE_MODEL_GATEWAY_COST_PER_K     Cost units per 1k tokens (default 0.0001).
 *   LORE_MODEL_GATEWAY_DISABLED       "1" forces fallback even with creds.
 *   LORE_MODEL_GATEWAY_MAX_JOBS_HOUR  Per-process hourly cap.
 *   LORE_MODEL_GATEWAY_MAX_JOBS_DAY   Per-process daily cap.
 *   LORE_MODEL_GATEWAY_MAX_INPUT_BYTES Per-call byte cap.
 */
export interface ModelGatewayEnv {
  LORE_MODEL_GATEWAY_ENDPOINT?: string;
  LORE_MODEL_GATEWAY_API_KEY?: string;
  LORE_MODEL_GATEWAY_MODEL?: string;
  LORE_MODEL_GATEWAY_TIMEOUT_MS?: string;
  LORE_MODEL_GATEWAY_COST_PER_K?: string;
  LORE_MODEL_GATEWAY_DISABLED?: string;
  LORE_MODEL_GATEWAY_MAX_JOBS_HOUR?: string;
  LORE_MODEL_GATEWAY_MAX_JOBS_DAY?: string;
  LORE_MODEL_GATEWAY_MAX_INPUT_BYTES?: string;
}

export function createCloudProviderFromEnv(
  env: ModelGatewayEnv = readProcessEnv(),
  overrides: Partial<CloudProviderConfig> = {},
): CloudProvider | null {
  if (env.LORE_MODEL_GATEWAY_DISABLED === "1") return null;
  const endpoint = env.LORE_MODEL_GATEWAY_ENDPOINT?.trim();
  const apiKey = env.LORE_MODEL_GATEWAY_API_KEY?.trim();
  if (!endpoint || !apiKey) return null;

  const config: CloudProviderConfig = {
    endpoint,
    apiKey,
    model: env.LORE_MODEL_GATEWAY_MODEL?.trim() || undefined,
    timeoutMs: parsePositiveInt(env.LORE_MODEL_GATEWAY_TIMEOUT_MS),
    costPerKTokens: parsePositiveFloat(env.LORE_MODEL_GATEWAY_COST_PER_K),
    ...overrides,
  };
  return new CloudProvider(config);
}

export function createModelGatewayFromEnv(
  env: ModelGatewayEnv = readProcessEnv(),
  overrides: Partial<ModelGatewayConfig> = {},
): ModelGateway {
  const provider = createCloudProviderFromEnv(env, overrides.provider as Partial<CloudProviderConfig> | undefined);
  const budget: Partial<ModelBudget> = {};
  const hourly = parsePositiveInt(env.LORE_MODEL_GATEWAY_MAX_JOBS_HOUR);
  const daily = parsePositiveInt(env.LORE_MODEL_GATEWAY_MAX_JOBS_DAY);
  const maxBytes = parsePositiveInt(env.LORE_MODEL_GATEWAY_MAX_INPUT_BYTES);
  if (hourly !== undefined) budget.maxJobsPerHour = hourly;
  if (daily !== undefined) budget.maxDailyJobs = daily;
  if (maxBytes !== undefined) budget.maxInputBytesPerJob = maxBytes;

  return new ModelGateway({
    provider: provider ?? overrides.provider,
    budget: { ...budget, ...overrides.budget },
    metricsRecorder: overrides.metricsRecorder,
    disabled: overrides.disabled ?? env.LORE_MODEL_GATEWAY_DISABLED === "1",
  });
}

export interface ModelGatewayEnvStatus {
  configured: boolean;
  provider: "cloud" | "noop";
  endpointConfigured: boolean;
  apiKeyConfigured: boolean;
  forcedDisabled: boolean;
  model?: string;
  budgetOverrides: {
    maxJobsPerHour?: number;
    maxDailyJobs?: number;
    maxInputBytesPerJob?: number;
  };
}

export function describeModelGatewayEnv(env: ModelGatewayEnv = readProcessEnv()): ModelGatewayEnvStatus {
  const endpointConfigured = !!env.LORE_MODEL_GATEWAY_ENDPOINT?.trim();
  const apiKeyConfigured = !!env.LORE_MODEL_GATEWAY_API_KEY?.trim();
  const forcedDisabled = env.LORE_MODEL_GATEWAY_DISABLED === "1";
  const configured = endpointConfigured && apiKeyConfigured && !forcedDisabled;
  return {
    configured,
    provider: configured ? "cloud" : "noop",
    endpointConfigured,
    apiKeyConfigured,
    forcedDisabled,
    model: env.LORE_MODEL_GATEWAY_MODEL?.trim() || undefined,
    budgetOverrides: {
      maxJobsPerHour: parsePositiveInt(env.LORE_MODEL_GATEWAY_MAX_JOBS_HOUR),
      maxDailyJobs: parsePositiveInt(env.LORE_MODEL_GATEWAY_MAX_JOBS_DAY),
      maxInputBytesPerJob: parsePositiveInt(env.LORE_MODEL_GATEWAY_MAX_INPUT_BYTES),
    },
  };
}

function readProcessEnv(): ModelGatewayEnv {
  const e = (typeof process !== "undefined" && process?.env ? process.env : {}) as Record<string, string | undefined>;
  return {
    LORE_MODEL_GATEWAY_ENDPOINT: e.LORE_MODEL_GATEWAY_ENDPOINT,
    LORE_MODEL_GATEWAY_API_KEY: e.LORE_MODEL_GATEWAY_API_KEY,
    LORE_MODEL_GATEWAY_MODEL: e.LORE_MODEL_GATEWAY_MODEL,
    LORE_MODEL_GATEWAY_TIMEOUT_MS: e.LORE_MODEL_GATEWAY_TIMEOUT_MS,
    LORE_MODEL_GATEWAY_COST_PER_K: e.LORE_MODEL_GATEWAY_COST_PER_K,
    LORE_MODEL_GATEWAY_DISABLED: e.LORE_MODEL_GATEWAY_DISABLED,
    LORE_MODEL_GATEWAY_MAX_JOBS_HOUR: e.LORE_MODEL_GATEWAY_MAX_JOBS_HOUR,
    LORE_MODEL_GATEWAY_MAX_JOBS_DAY: e.LORE_MODEL_GATEWAY_MAX_JOBS_DAY,
    LORE_MODEL_GATEWAY_MAX_INPUT_BYTES: e.LORE_MODEL_GATEWAY_MAX_INPUT_BYTES,
  };
}

function parsePositiveInt(value?: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parsePositiveFloat(value?: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
