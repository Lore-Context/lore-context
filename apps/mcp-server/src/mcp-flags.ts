export interface McpInstructionFlags {
  /** LORE_MCP_INSTRUCTIONS_INJECT_ENABLED=1 enables dynamic vault canonical episode injection */
  injectEnabled: boolean;
  /** Cap on episodes to include (LORE_MCP_INSTRUCTIONS_MAX_EPISODES, default 10) */
  maxEpisodes: number;
  /** Token budget for instructions (LORE_MCP_INSTRUCTIONS_MAX_TOKENS, default 2000) */
  maxTokens: number;
}

export function readMcpInstructionFlags(): McpInstructionFlags {
  const injectEnabled = process.env.LORE_MCP_INSTRUCTIONS_INJECT_ENABLED === "1";

  const rawEpisodes = process.env.LORE_MCP_INSTRUCTIONS_MAX_EPISODES;
  const maxEpisodes = rawEpisodes && /^\d+$/.test(rawEpisodes)
    ? Math.max(1, parseInt(rawEpisodes, 10))
    : 10;

  const rawTokens = process.env.LORE_MCP_INSTRUCTIONS_MAX_TOKENS;
  const maxTokens = rawTokens && /^\d+$/.test(rawTokens)
    ? Math.max(100, parseInt(rawTokens, 10))
    : 2000;

  return { injectEnabled, maxEpisodes, maxTokens };
}
