import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const sharedBuild = spawnSync("pnpm", ["--filter", "@lore/shared", "build"], {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: "pipe"
});

if (sharedBuild.status !== 0) {
  process.stderr.write(sharedBuild.stderr || sharedBuild.stdout);
  throw new Error("@lore/shared build failed before OpenAPI verification");
}

const build = spawnSync("pnpm", ["--filter", "@lore/api", "build"], {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: "pipe"
});

if (build.status !== 0) {
  process.stderr.write(build.stderr || build.stdout);
  throw new Error("@lore/api build failed before OpenAPI verification");
}

const modulePath = join(repoRoot, "apps/api/dist/openapi.js");
if (!existsSync(modulePath)) {
  throw new Error(`OpenAPI build output is missing: ${modulePath}`);
}

const { openApiDocument, requiredOpenApiOperations, requiredOpenApiPaths } = await import(pathToFileURL(modulePath).href);
const failures = [];

if (openApiDocument.openapi !== "3.1.0") {
  failures.push("OpenAPI version must be 3.1.0");
}

if (!openApiDocument.info?.title || !openApiDocument.info?.version) {
  failures.push("OpenAPI info.title and info.version are required");
}

const paths = openApiDocument.paths ?? {};
for (const path of requiredOpenApiPaths) {
  if (!paths[path]) {
    failures.push(`Missing required path ${path}`);
  }
}

for (const [method, path] of requiredOpenApiOperations) {
  if (!paths[path]?.[method]) {
    failures.push(`Missing required operation ${method.toUpperCase()} ${path}`);
  }
}

const securitySchemes = openApiDocument.components?.securitySchemes ?? {};
if (securitySchemes.bearerAuth?.type !== "http" || securitySchemes.bearerAuth?.scheme !== "bearer") {
  failures.push("bearerAuth security scheme must be HTTP bearer");
}
if (securitySchemes.loreApiKey?.type !== "apiKey" || securitySchemes.loreApiKey?.name !== "x-lore-api-key") {
  failures.push("loreApiKey security scheme must use x-lore-api-key header");
}

for (const [path, pathItem] of Object.entries(paths)) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!["get", "post", "patch", "put", "delete"].includes(method)) {
      continue;
    }
    if (!operation.operationId) {
      failures.push(`${method.toUpperCase()} ${path} is missing operationId`);
    }
    if (!operation.responses || Object.keys(operation.responses).length === 0) {
      failures.push(`${method.toUpperCase()} ${path} is missing responses`);
    }
  }
}

try {
  JSON.parse(JSON.stringify(openApiDocument));
} catch (error) {
  failures.push(`OpenAPI document is not JSON-serializable: ${error instanceof Error ? error.message : String(error)}`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, paths: Object.keys(paths).length }, null, 2));
