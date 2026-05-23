#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const read = (path) => readFileSync(join(root, path), 'utf8');
const fail = [];
const assert = (condition, message) => { if (!condition) fail.push(message); };

const tsSdk = readJson('packages/sdk-typescript/package.json');
const tsMw = readJson('packages/sdk-middleware-typescript/package.json');
const codeIndexer = readJson('packages/code-indexer/package.json');
const py = read('packages/sdk-python/pyproject.toml');
const pyMw = read('packages/sdk-middleware-python/pyproject.toml');
const pyIndexer = read('packages/code-indexer-python/pyproject.toml');
const docs = [
  'docs/sdk/README.md',
  'docs/sdk/sdk-matrix.md',
  'docs/sdk/middleware-quickstart.md',
].map((path) => [path, read(path)]);

const includesEverywhere = (needle, paths) => {
  for (const [path, body] of docs.filter(([path]) => paths.includes(path))) {
    assert(body.includes(needle), `${path} must mention ${needle}`);
  }
};

assert(existsSync(join(root, 'packages/sdk-typescript/README.md')), 'TypeScript SDK README must exist');
assert(existsSync(join(root, 'docs/sdk/sdk-matrix.md')), 'SDK matrix must exist');
assert(existsSync(join(root, 'docs/sdk/rest-curl-quickstart.md')), 'REST fallback doc must exist');
assert(existsSync(join(root, 'docs/sdk/openai-agents.md')), 'OpenAI Agents doc must exist');
assert(existsSync(join(root, 'docs/sdk/langchain-langgraph.md')), 'LangChain/LangGraph doc must exist');
assert(existsSync(join(root, 'docs/sdk/go-quickstart.md')), 'Go quickstart must exist');
assert(existsSync(join(root, 'docs/sdk/java-quickstart.md')), 'Java quickstart must exist');
assert(existsSync(join(root, 'docs/sdk/dotnet-quickstart.md')), '.NET quickstart must exist');

includesEverywhere(`@lore-context/sdk`, ['docs/sdk/README.md', 'docs/sdk/sdk-matrix.md']);
includesEverywhere(tsSdk.version, ['docs/sdk/sdk-matrix.md']);
includesEverywhere(tsMw.version, ['docs/sdk/sdk-matrix.md', 'docs/sdk/middleware-quickstart.md']);
includesEverywhere(codeIndexer.version, ['docs/sdk/sdk-matrix.md']);

assert(py.includes('name = "lore-context"'), 'Python SDK package name must remain lore-context');
assert(py.includes('version = "0.1.0"'), 'Python SDK docs/check expect lore-context 0.1.0');
assert(pyMw.includes('version = "0.1.0"'), 'Python middleware docs/check expect lore-context-middleware 0.1.0');
assert(pyIndexer.includes('version = "0.1.0"'), 'Python code-indexer docs/check expect 0.1.0');

const matrix = read('docs/sdk/sdk-matrix.md');
const goModule = 'github.com/lore-context/lore-context-go-sdk';
const javaCoordinate = 'dev.lorecontext:lore-context-sdk';
const javaNamespace = 'com.lore.context.api';
const goDocs = read('docs/sdk/go-quickstart.md') + read('packages/sdk-go/README.md');
const javaDocs = read('docs/sdk/java-quickstart.md') + read('docs/sdk/kotlin-example.md') + read('packages/sdk-java/README.md');

assert(read('packages/sdk-go/go.mod').includes(`module ${goModule}`), `Go module must remain ${goModule}`);
assert(read('scripts/sdk/generate-go-sdk.mjs').includes(`moduleName=${goModule}`), `Go generator must use ${goModule}`);
assert(goDocs.includes(goModule), `Go docs must use ${goModule}`);
assert(!existsSync(join(root, 'packages/sdk-go/git_push.sh')), 'Go SDK dry-run lane must not ship generated git_push.sh');

assert(read('packages/sdk-java/build.gradle').includes("group = 'dev.lorecontext'"), 'Java Gradle group must remain dev.lorecontext');
assert(read('packages/sdk-java/src/main/java/LoreContextApiClient.java').includes(`package ${javaNamespace};`), `Java client package must be ${javaNamespace}`);
assert(read('packages/sdk-java/src/main/java/core/Environment.java').includes(`package ${javaNamespace}.core;`), `Java core package must be ${javaNamespace}.core`);
assert(javaDocs.includes(javaCoordinate), `Java docs must use ${javaCoordinate}`);
assert(javaDocs.includes(`${javaNamespace}.LoreContextApiClient`), `Java docs must import ${javaNamespace}.LoreContextApiClient`);
assert(javaDocs.includes(`${javaNamespace}.core.Environment`), `Java docs must import ${javaNamespace}.core.Environment`);
assert(read('packages/sdk-java/README.md').includes('Environment.DEFAULT'), 'Java README must use the generated Environment.DEFAULT constant');

for (const lang of ['TypeScript', 'Python', 'Go', 'Java/JVM', '.NET/C#']) {
  assert(matrix.includes(lang), `SDK matrix must include ${lang}`);
}
for (const deferred of ['Ruby', 'PHP', 'Rust', 'Swift', 'Kotlin mobile', 'Dart']) {
  assert(matrix.includes(deferred), `SDK matrix must include ${deferred} deferral`);
}

if (fail.length) {
  console.error('SDK matrix check failed:');
  for (const message of fail) console.error(`- ${message}`);
  process.exit(1);
}
console.log('SDK matrix check passed');
