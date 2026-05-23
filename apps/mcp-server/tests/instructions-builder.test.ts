import { describe, expect, it } from "vitest";
import { buildInstructions, estimateTokens, type CanonicalEpisode } from "../src/instructions-builder.js";

const makeEpisode = (i: number): CanonicalEpisode => ({
  record_id: `rec_${i}`,
  subject: `Subject ${i}`,
  one_line_summary: `Summary for episode ${i}`,
  recall_hit_count: i,
  last_recall_at: i % 2 === 0 ? `2026-01-0${(i % 9) + 1}T00:00:00Z` : null
});

describe("estimateTokens", () => {
  it("returns ceiling of length / 4", () => {
    expect(estimateTokens("1234")).toBe(1);
    expect(estimateTokens("12345")).toBe(2);
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});

describe("buildInstructions", () => {
  const BASE = "Use context_query for read-first context assembly.";

  it("H1/H3: returns baseText unchanged when episodes is empty", () => {
    const result = buildInstructions({ baseText: BASE, episodes: [] });
    expect(result).toBe(BASE);
  });

  it("H2: includes preamble and all episode lines when 5 episodes provided", () => {
    const episodes = [1, 2, 3, 4, 5].map(makeEpisode);
    const result = buildInstructions({ baseText: BASE, episodes });

    expect(result).toContain(BASE);
    expect(result).toContain("Relevant memories for this vault");
    for (const ep of episodes) {
      expect(result).toContain(`[${ep.subject}]`);
      expect(result).toContain(ep.one_line_summary);
    }
  });

  it("H2: episode lines are formatted as '- [subject] summary'", () => {
    const episodes = [makeEpisode(1)];
    const result = buildInstructions({ baseText: BASE, episodes });
    expect(result).toContain("- [Subject 1] Summary for episode 1");
  });

  it("H2: custom preamble is used when provided", () => {
    const episodes = [makeEpisode(1)];
    const result = buildInstructions({ baseText: BASE, episodes, preamble: "Custom preamble:\n" });
    expect(result).toContain("Custom preamble:");
    expect(result).not.toContain("Relevant memories for this vault");
  });

  it("H2: respects maxEpisodes cap — only first N episodes included", () => {
    const episodes = [1, 2, 3, 4, 5, 6, 7, 8].map(makeEpisode);
    const result = buildInstructions({ baseText: BASE, episodes, maxEpisodes: 3 });
    expect(result).toContain("[Subject 1]");
    expect(result).toContain("[Subject 2]");
    expect(result).toContain("[Subject 3]");
    expect(result).not.toContain("[Subject 4]");
  });

  it("H4: truncates episodes when result would exceed byte budget", () => {
    // Create 100 episodes with long summaries to exceed 8000-byte budget
    const longEpisodes: CanonicalEpisode[] = Array.from({ length: 100 }, (_, i) => ({
      record_id: `rec_${i}`,
      subject: `Subject ${i} with a fairly long subject name`,
      one_line_summary: `This is a detailed one-line summary for episode number ${i} that adds significant byte count to the total output`,
      recall_hit_count: i,
      last_recall_at: null
    }));

    const result = buildInstructions({
      baseText: BASE,
      episodes: longEpisodes,
      maxTokens: 2000,
      maxEpisodes: 100
    });

    // 2000 tokens * 4 bytes/token = 8000 byte budget
    expect(result.length).toBeLessThanOrEqual(8000);
  });

  it("H4: truncated result still contains baseText", () => {
    const longEpisodes: CanonicalEpisode[] = Array.from({ length: 50 }, (_, i) => ({
      record_id: `rec_${i}`,
      subject: `LongSubjectName${i}`.repeat(3),
      one_line_summary: `Very long summary text repeated many times for episode ${i} `.repeat(5),
      recall_hit_count: i,
      last_recall_at: null
    }));

    const result = buildInstructions({
      baseText: BASE,
      episodes: longEpisodes,
      maxTokens: 200
    });

    expect(result).toContain(BASE);
    expect(result.length).toBeLessThanOrEqual(800); // 200 tokens * 4 bytes
  });

  it("H3: returns baseText (no preamble) when episodes empty even with inject conceptually enabled", () => {
    // Simulates the caller (index.ts) passing episodes=[] when vault not available
    const result = buildInstructions({
      baseText: BASE,
      episodes: [],
      maxTokens: 2000,
      maxEpisodes: 10
    });
    expect(result).toBe(BASE);
    expect(result).not.toContain("Relevant memories");
  });
});
