import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Lore rc.1 MCP smoke. Verifies the default/advanced tier contract from
// Lane E:
//
//   - Default mode: ordinary AI apps see only the small Lore tool surface;
//     advanced support tools such as `memory_supersede`, `memory_list`, and
//     `eval_run` MUST be hidden.
//   - Advanced mode (LORE_MCP_ADVANCED_TOOLS=1 or includeAdvanced=true): the
//     full surface including `memory_supersede` MUST be exposed.
//
// The smoke runs the published mcp-server binary over stdio in both
// transports (legacy custom JSON-RPC + the modelcontextprotocol SDK) and
// asserts both tiers behave as expected. Anything else is a regression.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = join(repoRoot, "apps/mcp-server/dist/index.js");

if (!existsSync(serverEntry)) {
  throw new Error("apps/mcp-server/dist/index.js is missing. Run `pnpm build` before `pnpm smoke:mcp`.");
}

// Tools that MUST appear in the default tier (visible to ordinary AI apps).
const REQUIRED_DEFAULT_TOOLS = [
  "context_query",
  "memory.recall",
  "memory.add_candidate",
  "memory.inbox_list",
  "memory.inbox_approve",
  "memory.inbox_reject",
  "memory_write",
  "memory_search",
  "source.pause",
  "source.resume"
];

// Tools that MUST be hidden by default. Listing these proactively keeps the
// "ordinary user surface stays small" contract honest as new tools are added.
const FORBIDDEN_DEFAULT_TOOLS = [
  "memory_supersede",
  "memory_list",
  "memory_get",
  "memory_update",
  "memory_export",
  "memory_forget",
  "evidence.trace_get",
  "profile.get",
  "profile.update_candidate",
  "eval_run",
  "trace_get"
];

// Tools that MUST appear once advanced mode is opted in.
const REQUIRED_ADVANCED_TOOLS = [
  "memory_supersede",
  "memory_list",
  "memory_get",
  "memory_update",
  "memory_export",
  "memory_forget",
  "evidence.trace_get",
  "eval_run"
];

await smokeTransport("legacy/default", { mode: "default", env: {} });
await smokeTransport("legacy/advanced", { mode: "advanced", env: { LORE_MCP_ADVANCED_TOOLS: "1" } });
await smokeTransport("sdk/default", { mode: "default", env: { LORE_MCP_TRANSPORT: "sdk" } });
await smokeTransport("sdk/advanced", { mode: "advanced", env: { LORE_MCP_TRANSPORT: "sdk", LORE_MCP_ADVANCED_TOOLS: "1" } });

console.log("Lore MCP smoke passed (default + advanced tiers verified across legacy and SDK transports)");

async function smokeTransport(name, { mode, env }) {
  const child = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      LORE_MCP_ADVANCED_TOOLS: undefined,
      LORE_MCP_TRANSPORT: undefined,
      ...env,
      LORE_API_URL: "http://127.0.0.1:3000"
    },
    stdio: ["pipe", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "smoke", version: "0" }
      }
    })}\n`
  );
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })}\n`);
  child.stdin.end();

  const [code] = await once(child, "exit");
  assert(code === 0, `${name} MCP server exited with ${code}: ${stderr}`);
  assert(!stdout.includes("lore-context@"), `${name} MCP stdout contains package-manager output`);

  const messages = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  assert(messages.length === 2, `${name}: expected 2 JSON-RPC responses, got ${messages.length}`);
  assert(messages[0].result?.capabilities?.tools, `${name}: initialize did not advertise tools capability`);

  const tools = messages[1].result?.tools;
  assert(Array.isArray(tools), `${name}: tools/list did not return a tools array`);
  const toolNames = tools.map((tool) => tool.name);

  for (const required of REQUIRED_DEFAULT_TOOLS) {
    assert(
      toolNames.includes(required),
      `${name}: tools/list missing required default tool ${required}; got [${toolNames.join(", ")}]`
    );
  }

  if (mode === "default") {
    for (const forbidden of FORBIDDEN_DEFAULT_TOOLS) {
      assert(
        !toolNames.includes(forbidden),
        `${name}: tools/list unexpectedly exposed advanced tool ${forbidden} in default mode`
      );
    }
  } else {
    for (const advanced of REQUIRED_ADVANCED_TOOLS) {
      assert(
        toolNames.includes(advanced),
        `${name}: advanced mode missing required tool ${advanced}; got [${toolNames.join(", ")}]`
      );
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
