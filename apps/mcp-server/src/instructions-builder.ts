export interface CanonicalEpisode {
  record_id: string;
  subject: string;
  one_line_summary: string;
  recall_hit_count: number;
  last_recall_at: string | null;
}

export interface BuildInstructionsParams {
  baseText: string;
  episodes: CanonicalEpisode[];
  maxTokens?: number;
  maxEpisodes?: number;
  preamble?: string;
}

const DEFAULT_PREAMBLE = "Relevant memories for this vault (prioritize when answering):\n";
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_MAX_EPISODES = 10;
// Rough byte budget: ~4 chars/token, so 2000 tokens ≈ 8000 bytes
const BYTES_PER_TOKEN = 4;

export function estimateTokens(s: string): number {
  return Math.ceil(s.length / BYTES_PER_TOKEN);
}

export function buildInstructions(params: BuildInstructionsParams): string {
  const {
    baseText,
    episodes,
    maxTokens = DEFAULT_MAX_TOKENS,
    maxEpisodes = DEFAULT_MAX_EPISODES,
    preamble = DEFAULT_PREAMBLE
  } = params;

  if (episodes.length === 0) {
    return baseText;
  }

  const byteBudget = maxTokens * BYTES_PER_TOKEN;
  const capped = episodes.slice(0, maxEpisodes);
  const episodeLines = capped.map((ep) => `- [${ep.subject}] ${ep.one_line_summary}`);

  // Build full string and truncate episodes until within budget
  let includedLines = episodeLines;
  while (includedLines.length > 0) {
    const body = baseText + "\n\n" + preamble + includedLines.join("\n");
    if (body.length <= byteBudget) {
      return body;
    }
    includedLines = includedLines.slice(0, includedLines.length - 1);
  }

  // Even with zero episodes, check base fits; return base regardless
  return baseText;
}
