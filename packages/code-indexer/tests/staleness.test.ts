/**
 * staleness.test.ts
 *
 * U3 verification: given a mock code.list_repos response with last_indexed_at,
 * the client computes staleness vs Date.now().
 *
 * No MCP server is needed — this tests the client-side staleness heuristic
 * documented in the SDK Quickstart: `Date.now() - last_indexed_at > threshold`.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

// Staleness threshold: 1 hour (3600 seconds)
const DEFAULT_STALE_THRESHOLD_MS = 60 * 60 * 1000;

/** Client-side staleness check — mirrors the agent prompt template heuristic. */
function isStale(last_indexed_at: string, thresholdMs = DEFAULT_STALE_THRESHOLD_MS): boolean {
  const lastIndexed = new Date(last_indexed_at).getTime();
  return Date.now() - lastIndexed > thresholdMs;
}

/** Simulate a code.list_repos response. */
interface RepoInfo {
  name: string;
  last_indexed_at: string | null;
  total_files: number;
  total_symbols: number;
}

function computeRepoStaleness(
  repos: RepoInfo[],
  thresholdMs = DEFAULT_STALE_THRESHOLD_MS
): Array<{ repo: RepoInfo; stale: boolean; ageMs: number | null }> {
  return repos.map((repo) => {
    if (!repo.last_indexed_at) {
      return { repo, stale: true, ageMs: null };
    }
    const ageMs = Date.now() - new Date(repo.last_indexed_at).getTime();
    return { repo, stale: ageMs > thresholdMs, ageMs };
  });
}

describe("staleness signal (U3)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("repo indexed 30 minutes ago is NOT stale (threshold 1h)", () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(isStale(thirtyMinutesAgo)).toBe(false);
  });

  it("repo indexed 2 hours ago IS stale (threshold 1h)", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(isStale(twoHoursAgo)).toBe(true);
  });

  it("repo with null last_indexed_at is stale", () => {
    const repos: RepoInfo[] = [
      { name: "my-repo", last_indexed_at: null, total_files: 0, total_symbols: 0 },
    ];
    const result = computeRepoStaleness(repos);
    expect(result[0].stale).toBe(true);
    expect(result[0].ageMs).toBeNull();
  });

  it("code.list_repos response: computes staleness for multiple repos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T12:00:00.000Z"));

    const repos: RepoInfo[] = [
      {
        name: "fresh-repo",
        last_indexed_at: "2026-05-13T11:30:00.000Z", // 30 min ago
        total_files: 100,
        total_symbols: 500,
      },
      {
        name: "stale-repo",
        last_indexed_at: "2026-05-13T09:00:00.000Z", // 3 hours ago
        total_files: 200,
        total_symbols: 1000,
      },
      {
        name: "never-indexed",
        last_indexed_at: null,
        total_files: 0,
        total_symbols: 0,
      },
    ];

    const results = computeRepoStaleness(repos);

    expect(results[0].stale).toBe(false); // fresh-repo: 30min < 1h threshold
    expect(results[0].ageMs).toBe(30 * 60 * 1000);

    expect(results[1].stale).toBe(true);  // stale-repo: 3h > 1h threshold
    expect(results[1].ageMs).toBe(3 * 60 * 60 * 1000);

    expect(results[2].stale).toBe(true);  // never-indexed
    expect(results[2].ageMs).toBeNull();
  });

  it("custom threshold respected", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    // With 10-minute threshold: NOT stale
    expect(isStale(fiveMinutesAgo, 10 * 60 * 1000)).toBe(false);
    // With 1-minute threshold: IS stale
    expect(isStale(fiveMinutesAgo, 1 * 60 * 1000)).toBe(true);
  });
});
