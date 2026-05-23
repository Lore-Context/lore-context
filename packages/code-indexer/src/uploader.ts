/**
 * HTTP uploader — POST to /v1/code-graph/upsert with exponential backoff + 429 handling.
 *
 * Privacy invariant: ONLY accepts UpsertPayload objects validated through
 * UpsertPayloadSchema.parse(). Raw object literals are NOT accepted — the parameter
 * type enforces this at the TypeScript level.
 *
 * Backoff strategy:
 *  - Initial delay: 1s
 *  - Multiplier: 2×
 *  - Max delay: 30s
 *  - Max attempts: 5
 *  - 429 response: honor Retry-After header if present
 */

import { UpsertPayloadSchema } from "@lore-context/sdk/code-graph-types";
import type { UpsertPayload } from "@lore-context/sdk/code-graph-types";

export interface UploaderOptions {
  /** Base URL of the Lore API, e.g. "https://api.lorecontext.com". */
  baseUrl: string;
  /** Auth token (Bearer). */
  authToken: string;
  /** Vault ID. */
  vaultId: string;
  /** Max retry attempts (default: 5). */
  maxAttempts?: number;
  /** Initial backoff delay in ms (default: 1000). */
  initialDelayMs?: number;
  /** Maximum backoff delay in ms (default: 30000). */
  maxDelayMs?: number;
}

export interface UploadResult {
  ok: boolean;
  status?: number;
  body?: unknown;
  error?: string;
}

/** Sleep for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upload a validated UpsertPayload to POST /v1/code-graph/upsert.
 *
 * The `payload` parameter MUST be the result of UpsertPayloadSchema.parse(...)
 * — this is enforced by the type system. The function additionally re-validates
 * as a defense-in-depth measure (catches runtime bypass attempts).
 */
export async function uploadPayload(
  opts: UploaderOptions,
  payload: UpsertPayload
): Promise<UploadResult> {
  // Defense-in-depth: re-validate the sealed schema even though type system enforces it.
  const validated = UpsertPayloadSchema.safeParse(payload);
  if (!validated.success) {
    return {
      ok: false,
      error: `Payload failed schema validation: ${validated.error.message}`,
    };
  }

  const url = `${opts.baseUrl}/v1/code-graph/upsert`;
  const body = JSON.stringify(validated.data);
  const maxAttempts = opts.maxAttempts ?? 5;
  const initialDelayMs = opts.initialDelayMs ?? 1000;
  const maxDelayMs = opts.maxDelayMs ?? 30000;

  let attempt = 0;
  let delayMs = initialDelayMs;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.authToken}`,
          "X-Vault-Id": opts.vaultId,
        },
        body,
      });

      if (response.ok) {
        const respBody = await response.json().catch(() => null);
        return { ok: true, status: response.status, body: respBody };
      }

      if (response.status === 429) {
        // Honor Retry-After header if present
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : delayMs;
        if (attempt < maxAttempts) {
          await sleep(Math.min(waitMs, maxDelayMs));
          delayMs = Math.min(delayMs * 2, maxDelayMs);
          continue;
        }
        return { ok: false, status: 429, error: "Rate limited — max attempts exceeded" };
      }

      // 4xx (non-429): don't retry
      if (response.status >= 400 && response.status < 500) {
        const errBody = await response.text().catch(() => "");
        return {
          ok: false,
          status: response.status,
          error: `Client error ${response.status}: ${errBody.slice(0, 256)}`,
        };
      }

      // 5xx: retry with backoff
      if (attempt < maxAttempts) {
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, maxDelayMs);
        continue;
      }

      return { ok: false, status: response.status, error: `Server error after ${maxAttempts} attempts` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) {
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, maxDelayMs);
        continue;
      }
      return { ok: false, error: `Network error after ${maxAttempts} attempts: ${msg}` };
    }
  }

  return { ok: false, error: "Max upload attempts exceeded" };
}
