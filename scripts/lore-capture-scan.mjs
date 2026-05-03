#!/usr/bin/env node
// lore-capture-scan: safe local CLI helper for the v0.7 capture engine.
//
// Usage:
//   node scripts/lore-capture-scan.mjs                # discover only
//   node scripts/lore-capture-scan.mjs --parse        # parse + summarize
//   node scripts/lore-capture-scan.mjs --json         # machine-readable output
//
// This script never uploads. It is a local inspection tool used by `lore status`
// and during dev. All output is summary-only by default.

import { readFile } from "node:fs/promises";

const args = new Set(process.argv.slice(2));
const wantParse = args.has("--parse");
const wantJson = args.has("--json");

const cap = await import("../packages/capture/dist/index.js").catch(async (err) => {
  console.error("error: @lore/capture is not built. Run `pnpm --filter @lore/capture build` first.");
  console.error(String(err?.message ?? err));
  process.exit(2);
});

const claude = await cap.scanClaudeCode();
const codex = await cap.scanCodex();

const summary = {
  claudeCode: claude.length,
  codex: codex.length,
  parsed: 0,
  errors: 0
};

const results = [];
const sources = [...claude, ...codex];

if (wantParse) {
  for (const src of sources) {
    try {
      const content = await readFile(src.path, "utf-8");
      const parsed =
        src.provider === "claude-code"
          ? cap.parseClaudeCodeJsonl({ filePath: src.path, content })
          : cap.parseCodexSession({ filePath: src.path, content });
      summary.parsed += 1;
      results.push({
        provider: src.provider,
        path: src.path,
        sessionId: parsed.session.source.originalId,
        turnCount: parsed.session.turns.length,
        idempotencyKey: parsed.session.idempotencyKey,
        redactionStats: parsed.session.redactionStats,
        warnings: parsed.warnings
      });
    } catch (err) {
      summary.errors += 1;
      results.push({ provider: src.provider, path: src.path, error: String(err?.message ?? err) });
    }
  }
}

if (wantJson) {
  console.log(JSON.stringify({ summary, sources, results }, null, 2));
} else {
  console.log(`Claude Code sessions: ${summary.claudeCode}`);
  console.log(`Codex sessions:       ${summary.codex}`);
  if (wantParse) {
    console.log(`Parsed:               ${summary.parsed}`);
    console.log(`Errors:               ${summary.errors}`);
    for (const r of results) {
      const tag = r.error ? "ERR" : "OK ";
      console.log(`  [${tag}] ${r.provider} ${r.sessionId ?? r.path} turns=${r.turnCount ?? "-"}`);
    }
  } else {
    console.log("(use --parse to summarize content; nothing leaves this machine)");
  }
}
