#!/usr/bin/env node
// Startup-time environment check.
// Refuses to proceed if any env var contains a known demo/placeholder value in production.
// Usage: node scripts/check-env.mjs
// Can be used as a Dockerfile entrypoint pre-check.

const DEMO_PATTERN = /^(?:read-local|write-local|admin-local|change-me|change_me|changeme|demo|test|dev|password|required|#\s*required|<[^>]+>|\$\{[^}]+})$/i;

const CHECKED_VARS = [
  "POSTGRES_PASSWORD",
  "DASHBOARD_LORE_API_KEY",
  "ADMIN_LORE_API_KEY",
  "WRITE_LORE_API_KEY",
  "MCP_LORE_API_KEY",
  "LORE_API_KEY",
  "DASHBOARD_BASIC_AUTH_USER",
  "DASHBOARD_BASIC_AUTH_PASS",
  "AGENTMEMORY_SECRET"
];

if (process.env.NODE_ENV !== "production") {
  process.exit(0);
}

const offending = [];

for (const varName of CHECKED_VARS) {
  const value = process.env[varName];
  if (value && DEMO_PATTERN.test(value.trim())) {
    offending.push(varName);
  }
}

if (offending.length > 0) {
  console.error(
    `[check-env] ERROR: The following environment variables contain placeholder/demo values in production:\n` +
      offending.map((v) => `  - ${v}`).join("\n") +
      `\nGenerate real secrets via: openssl rand -hex 32`
  );
  process.exit(1);
}

console.log("[check-env] All environment variables look good.");
