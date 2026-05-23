// Lore v1.4 Lane A Phase 4.1 — Redis client resolver for production embedding cache wiring.
//
// This is the single boundary between EmbeddingCache and the actual Redis client
// implementation. EmbeddingCache only requires a structural interface (get/set/quit),
// so we lazy-load ioredis and degrade gracefully if it's missing.
//
// Fallback hierarchy:
//   1. LORE_EMBEDDING_CACHE_ENABLED unset/0 → returns null (cache disabled)
//   2. LORE_REDIS_URL missing → returns null (LRU-only mode)
//   3. ioredis not installed → returns null, logs warn (LRU-only mode)
//   4. Redis connection error → returns null, logs warn (LRU-only mode)
//
// v2.0.2 US-B — extended RedisClientV19 interface for butler trigger (Lane B).
// Adds incr / del / exists + NX EX set overload required by butler-trigger.ts.

import type { RedisClient } from "./embedding-cache.js";

// ── Extended interface for butler event trigger (v2.0.2 Lane B) ──────────────

/**
 * Superset of RedisClient with the additional commands needed by the butler
 * event-trigger subsystem (incr, del, exists, NX+EX set variant).
 */
export interface RedisClientV19 {
  get(key: string): Promise<string | null>;
  /** Standard EX set — set key to value with TTL in seconds. */
  set(key: string, value: string, exSeconds: number): Promise<unknown>;
  /**
   * NX+EX set — set key to value only if not exists, with TTL in seconds.
   * Returns "OK" on success, null if key already exists.
   */
  setNxEx(key: string, value: string, exSeconds: number): Promise<"OK" | null>;
  /** INCR — increment a counter, returns the new value. */
  incr(key: string): Promise<number>;
  /** DEL — delete a key, returns number of keys deleted. */
  del(key: string): Promise<number>;
  /** EXISTS — returns 1 if key exists, 0 otherwise. */
  exists(key: string): Promise<number>;
  quit(): Promise<unknown>;
}

/**
 * Build a RedisClientV19 from a live ioredis instance.
 * The raw ioredis client supports all required commands natively.
 */
export function wrapIoredisAsV19(
  client: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, exMode: string, ttl: number): Promise<unknown>;
    set(key: string, value: string, nxMode: string, exMode: string, ttl: number): Promise<"OK" | null>;
    incr(key: string): Promise<number>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    quit(): Promise<unknown>;
  },
): RedisClientV19 {
  return {
    get: (key) => client.get(key),
    set: (key, value, exSeconds) => client.set(key, value, "EX", exSeconds),
    setNxEx: (key, value, exSeconds) =>
      (client.set as (k: string, v: string, nx: string, ex: string, ttl: number) => Promise<"OK" | null>)(
        key, value, "NX", "EX", exSeconds,
      ),
    incr: (key) => client.incr(key),
    del: (key) => client.del(key),
    exists: (key) => client.exists(key),
    quit: () => client.quit(),
  };
}

/**
 * In-memory stub for RedisClientV19 — used in tests and LRU-only fallback.
 * incr/del/exists operate on an internal Map; setNxEx enforces NX semantics.
 */
export function makeInMemoryRedisV19(): RedisClientV19 {
  const store = new Map<string, string>();

  return {
    async get(key) { return store.get(key) ?? null; },
    async set(key, value, _exSeconds) { store.set(key, value); },
    async setNxEx(key, value, _exSeconds) {
      if (store.has(key)) return null;
      store.set(key, value);
      return "OK";
    },
    async incr(key) {
      const prev = parseInt(store.get(key) ?? "0", 10);
      const next = prev + 1;
      store.set(key, String(next));
      return next;
    },
    async del(key) {
      const had = store.has(key) ? 1 : 0;
      store.delete(key);
      return had;
    },
    async exists(key) { return store.has(key) ? 1 : 0; },
    async quit() { return undefined; },
  };
}

export interface RedisClientConfig {
  url?: string;
  connectTimeoutMs?: number;
  enabled: boolean;
}

/**
 * Resolves a Redis client for production embedding cache wiring.
 * Returns null when cache is disabled, LORE_REDIS_URL is missing,
 * or ioredis is not installed (graceful LRU-only fallback).
 */
export async function resolveRedisClient(
  config: RedisClientConfig,
): Promise<RedisClient | null> {
  if (!config.enabled || !config.url) return null;

  try {
    // Lazy-load ioredis. If not installed, fall back to LRU-only mode.
    const mod = await import("ioredis").catch(() => null);
    if (!mod) {
      console.warn(
        "[redis-client-v14] ioredis npm package not installed; falling back to LRU-only cache",
      );
      return null;
    }
    const Redis = (mod as { default?: unknown; Redis?: unknown }).default ?? (mod as { Redis?: unknown }).Redis;
    const client = new (Redis as new (url: string, opts: unknown) => unknown)(config.url, {
      connectTimeout: config.connectTimeoutMs ?? 2000,
      lazyConnect: false,
      maxRetriesPerRequest: 1,
    }) as {
      get(key: string): Promise<string | null>;
      set(key: string, value: string, ex: string, ttl: number): Promise<unknown>;
      quit(): Promise<unknown>;
    };

    // Wrap to match RedisClient structural interface (set takes exSeconds as 3rd arg)
    return {
      async get(key: string): Promise<string | null> {
        return client.get(key);
      },
      async set(key: string, value: string, exSeconds: number): Promise<void> {
        await client.set(key, value, "EX", exSeconds);
      },
      async quit(): Promise<unknown> {
        return client.quit();
      },
    };
  } catch (err) {
    console.warn(
      `[redis-client-v14] failed to initialize Redis client: ${err}; falling back to LRU-only cache`,
    );
    return null;
  }
}

export function readRedisConfig(
  env: Record<string, string | undefined> = process.env,
): RedisClientConfig {
  const enabled =
    env.LORE_EMBEDDING_CACHE_ENABLED === "1" ||
    env.LORE_EMBEDDING_CACHE_ENABLED === "true";
  return {
    enabled,
    url: env.LORE_REDIS_URL,
    connectTimeoutMs: env.LORE_REDIS_CONNECT_TIMEOUT_MS
      ? parseInt(env.LORE_REDIS_CONNECT_TIMEOUT_MS, 10)
      : 2000,
  };
}
