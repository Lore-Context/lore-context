import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const apiUrl = process.env.LORE_API_URL ?? "http://127.0.0.1:3000";
const apiKey = process.env.LORE_API_KEY ?? "${LORE_API_KEY}";
const transport = process.env.LORE_MCP_TRANSPORT ?? "sdk";
const command = process.env.LORE_MCP_COMMAND ?? "node";
const args = process.env.LORE_MCP_ARGS
  ? process.env.LORE_MCP_ARGS.split(" ")
  : ["apps/mcp-server/dist/index.js"];
const outPath = readArg("--out");

const config = {
  qwenCode: {
    mcpServers: {
      lore: {
        command,
        args,
        env: {
          LORE_API_URL: apiUrl,
          LORE_API_KEY: apiKey,
          LORE_MCP_TRANSPORT: transport
        },
        includeTools: [
          "context_query",
          "memory_write",
          "memory_search",
          "memory_supersede",
          "memory_forget",
          "eval_run",
          "trace_get"
        ]
      }
    }
  },
  claudeCode: {
    lore: {
      command,
      args,
      env: {
        LORE_API_URL: apiUrl,
        LORE_API_KEY: apiKey,
        LORE_MCP_TRANSPORT: transport
      }
    }
  },
  cursor: {
    mcpServers: {
      lore: {
        command,
        args,
        env: {
          LORE_API_URL: apiUrl,
          LORE_API_KEY: apiKey,
          LORE_MCP_TRANSPORT: transport
        }
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
} else {
  process.stdout.write(output);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}
