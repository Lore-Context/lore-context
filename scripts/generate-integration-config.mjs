import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// This script generates the AI app connection config for each supported tool.
// The "lore" mcpServer entry is the internal connection adapter — ordinary users
// connect through the Lore dashboard; this config is for advanced/developer use.
//
// rc.2 Lane D: by default the script emits a *plain-language* summary that
// names which AI apps are about to be wired up. Pass `--advanced` (or
// `--out PATH` / pipe-out usage) to emit raw JSON config; the dashboard's
// one-click connect path uses the JSON form, but ordinary CLI users see the
// plain summary first so they do not need to read MCP/JSON config to verify
// what changed.

const apiUrl = process.env.LORE_API_URL ?? "http://127.0.0.1:3000";
const apiKey = process.env.LORE_API_KEY ?? "${LORE_API_KEY}";
const transport = process.env.LORE_MCP_TRANSPORT ?? "sdk";
const command = process.env.LORE_MCP_COMMAND ?? "node";
const args = process.env.LORE_MCP_ARGS
  ? process.env.LORE_MCP_ARGS.split(" ")
  : ["apps/mcp-server/dist/index.js"];
const outPath = readArg("--out");
const advanced = process.argv.includes("--advanced") || process.argv.includes("--json") || Boolean(outPath) || !process.stdout.isTTY;
const plainOnly = process.argv.includes("--plain");

// Base connection env shared by all AI app connections.
// LORE_MCP_ADVANCED_TOOLS=1 opt-in enables the full support tool surface.
const baseConnectionEnv = {
  LORE_API_URL: apiUrl,
  LORE_API_KEY: apiKey,
  LORE_MCP_TRANSPORT: transport
};

const config = {
  // QwenCode: use a focused default tool set (no advanced tools).
  qwenCode: {
    mcpServers: {
      lore: {
        command,
        args,
        env: baseConnectionEnv,
        // Default surface: context_query, memory_write, memory_search, source controls.
        // Advanced tools (memory_supersede, memory_forget, eval_run, trace_get) require
        // LORE_MCP_ADVANCED_TOOLS=1 in env or explicit opt-in.
        includeTools: [
          "context_query",
          "memory_write",
          "memory_search",
          "source.pause",
          "source.resume"
        ]
      }
    }
  },
  // Claude Code: full default tool surface for the primary Lore connection.
  claudeCode: {
    mcpServers: {
      lore: {
        command,
        args,
        env: baseConnectionEnv
      }
    }
  },
  // Cursor: same default tool surface as Claude Code.
  cursor: {
    mcpServers: {
      lore: {
        command,
        args,
        env: baseConnectionEnv
      }
    }
  }
};

const output = `${JSON.stringify(config, null, 2)}\n`;
if (outPath) {
  const target = resolve(outPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, output, "utf8");
  console.log(JSON.stringify({ ok: true, path: target }, null, 2));
} else if (plainOnly || (!advanced && process.stdout.isTTY)) {
  printPlainSummary();
} else {
  process.stdout.write(output);
}

function printPlainSummary() {
  // Names match the labels users see on the dashboard. We do not mention MCP,
  // JSON, or bearer tokens at this level — those live behind --advanced.
  const apps = [
    { id: "claudeCode", label: "Claude Code", note: "automatic capture supported" },
    { id: "codex", label: "Codex", note: "automatic capture supported" },
    { id: "cursor", label: "Cursor", note: "automatic capture supported (rc.2)" },
    { id: "qwenCode", label: "QwenCode", note: "default tool surface only" }
  ];
  console.log("Lore can connect these AI apps:");
  for (const app of apps) {
    console.log(`  - ${app.label}: ${app.note}`);
  }
  console.log("");
  console.log("To finish the connection, open the Lore dashboard and click \"Connect AI app\".");
  console.log("Advanced users: re-run with `--advanced` for the technical config, or `--out <path>` to write to disk.");
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}
