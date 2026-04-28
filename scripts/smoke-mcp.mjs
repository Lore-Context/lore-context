import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = join(repoRoot, "apps/mcp-server/dist/index.js");

if (!existsSync(serverEntry)) {
  throw new Error("apps/mcp-server/dist/index.js is missing. Run `pnpm build` before `pnpm smoke:mcp`.");
}

await smokeTransport("legacy", {});
await smokeTransport("sdk", { LORE_MCP_TRANSPORT: "sdk" });

console.log("Lore MCP smoke passed");

async function smokeTransport(name, extraEnv) {
  const child = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...extraEnv,
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
  assert(messages[1].result?.tools?.some((tool) => tool.name === "context_query"), `${name}: tools/list did not include context_query`);
  assert(messages[1].result?.tools?.some((tool) => tool.name === "memory_supersede"), `${name}: tools/list did not include memory_supersede`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
