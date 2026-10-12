import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const port = await new Promise((resolve, reject) => {
  const probe = createNetServer();
  probe.unref();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    probe.close(() => resolve(typeof address === "object" && address ? address.port : 0));
  });
});

const server = spawn("node", ["scripts/serve.mjs", "--port", String(port)], {
  cwd: websiteRoot,
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  const base = `http://127.0.0.1:${port}`;
  await waitForOk(`${base}/`);
  const missing = await fetch(`${base}/.env`);
  const body = await missing.text();
  assert.equal(missing.status, 404);
  assert.match(body, /Not found/);
  assert.doesNotMatch(body, /All your AI agents/);
  const clean = await fetch(`${base}/docs`);
  assert.equal(clean.status, 200);
  assert.match(await clean.text(), /Hosted sign-in is offline/);
  console.log("serve 404 check passed");
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
}

async function waitForOk(url) {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw lastError ?? new Error(`${url} did not become ready`);
}
