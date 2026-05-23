#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const rel = (...parts) => path.join(repoRoot, ...parts);
const exists = (...parts) => fs.existsSync(rel(...parts));
const read = (...parts) => fs.readFileSync(rel(...parts), 'utf8');

const criteriaToBra = new Map([
  ['V2.0.7-A1', 'BRA-593'],
  ['V2.0.7-A2', 'BRA-594'],
  ['V2.0.7-B1', 'BRA-595'],
  ['V2.0.7-B2', 'BRA-596'],
  ['V2.0.7-C1', 'BRA-597'],
  ['V2.0.7-C2', 'BRA-598'],
  ['V2.0.7-D1', 'BRA-599'],
  ['V2.0.7-D2', 'BRA-600'],
  ['V2.0.7-E1', 'BRA-601'],
  ['V2.0.7-F1', 'BRA-602'],
]);

const requiredSdkRoutes = JSON.parse(read('scripts/sdk/request-shape-fixtures.json'));

function hasAll(content, needles) {
  return needles.every((needle) => content.includes(needle));
}

function packageVersion(packageJsonPath) {
  return JSON.parse(read(packageJsonPath)).version;
}

function pyProjectVersion(pyprojectPath) {
  const text = read(pyprojectPath);
  const match = text.match(/^version\s*=\s*["']([^"']+)["']/m);
  return match?.[1] ?? null;
}

function routeParityEvidence() {
  const ts = read('packages/sdk-typescript/Client.ts');
  const py = read('packages/sdk-python/src/lore_context/raw_client.py');
  const missing = [];
  for (const route of requiredSdkRoutes) {
    const tsNeedles = [`public ${route.tsMethod}(`, `"${route.path}"`, `method: "${route.method}"`];
    const pyNeedles = [`def ${route.pyMethod}(`, `"${route.path}"`, `method="${route.method}"`];
    if (!hasAll(ts, tsNeedles)) missing.push(`typescript:${route.method} ${route.path} (${route.tsMethod})`);
    if (!hasAll(py, pyNeedles)) missing.push(`python:${route.method} ${route.path} (${route.pyMethod})`);
  }
  return {
    status: missing.length === 0 ? 'pass' : 'fail',
    checkedRoutes: requiredSdkRoutes.map((route) => `${route.method} ${route.path}`),
    missing,
  };
}

function taskBundleEvidence() {
  const plan = exists('.omc/plans/v2.0.7-plan.md') ? read('.omc/plans/v2.0.7-plan.md') : '';
  const readme = exists('.omc/linear-tasks/v207/README.md') ? read('.omc/linear-tasks/v207/README.md') : '';
  const missing = [];
  for (const [criterion, bra] of criteriaToBra) {
    if (!plan.includes(criterion)) missing.push(`plan:${criterion}`);
    if (!readme.includes(`${bra} — ${criterion}`)) missing.push(`linear-readme:${bra}/${criterion}`);
    const taskFiles = fs.readdirSync(rel('.omc/linear-tasks/v207')).filter((name) => name.includes(criterion));
    if (taskFiles.length !== 1) missing.push(`linear-task-file:${criterion}`);
  }
  return { status: missing.length === 0 ? 'pass' : 'fail', missing };
}

function deferral(reason, nextCommand) {
  return { status: 'deferred', reason, nextCommand };
}

function passOrFail(missing, evidence) {
  return missing.length === 0 ? { status: 'pass', evidence } : { status: 'fail', evidence: missing };
}

function runCheck(command, args, options = {}) {
  const dotnetHome = path.join(process.env.HOME ?? '', '.dotnet');
  const pathEntries = [dotnetHome, process.env.PATH].filter(Boolean);
  const result = spawnSync(command, args, {
    cwd: options.cwd ? rel(options.cwd) : repoRoot,
    env: { ...process.env, PATH: pathEntries.join(path.delimiter), ...(options.env ?? {}) },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const label = [command, ...args].join(' ');
  if (result.status === 0) return { ok: true, label };
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().split('\n').slice(-20).join('\n');
  return { ok: false, label, output };
}

function commandEvidence(verifyCommands) {
  if (!verifyCommands) return { missing: [], evidence: [] };

  const checks = [
    ['packages/sdk-go', 'go', ['test', './...'], 'V2.0.7-B1 command'],
    ['packages/sdk-go/examples', 'go', ['test', './...'], 'V2.0.7-B2 command'],
    ['packages/sdk-java', './gradlew', ['test'], 'V2.0.7-C1 command'],
    ['packages/sdk-java/examples', './gradlew', ['test'], 'V2.0.7-C2 command'],
    [repoRoot, 'dotnet', ['test', 'packages/sdk-dotnet/LoreContext.Sdk.sln'], 'V2.0.7-D1 command'],
    [repoRoot, 'dotnet', ['build', 'packages/sdk-dotnet/examples/AspNetMinimalApi/AspNetMinimalApi.csproj'], 'V2.0.7-D2 command'],
  ];

  const missing = [];
  const evidence = [];
  for (const [cwd, command, args, name] of checks) {
    const result = runCheck(command, args, { cwd: cwd === repoRoot ? undefined : cwd });
    if (result.ok) {
      evidence.push(`${name}: ${result.label}`);
    } else {
      missing.push(`${name} failed: ${result.label}${result.output ? `\n${result.output}` : ''}`);
    }
  }
  return { missing, evidence };
}

function withCommandEvidence(staticResult, commands, criterion) {
  const missing = staticResult.status === 'fail' ? [...staticResult.evidence] : [];
  missing.push(...commands.missing.filter((line) => line.includes(criterion)));
  return passOrFail(missing, [
    ...(staticResult.evidence ?? []),
    ...commands.evidence.filter((line) => line.includes(criterion)),
  ]);
}

function commandRequired(staticResult, commands, criterion, nextCommand, verifyCommands) {
  if (!verifyCommands) {
    return {
      status: 'deferred',
      reason: `${criterion} requires command verification; static file presence is not enough.`,
      nextCommand,
      evidence: staticResult.evidence ?? [],
    };
  }
  return withCommandEvidence(staticResult, commands, criterion);
}

function goSdkContractEvidence() {
  const modulePath = 'github.com/lore-context/lore-context-go-sdk';
  const missing = [];
  for (const file of [
    'packages/sdk-go/go.mod',
    'packages/sdk-go/examples/go.mod',
    'packages/sdk-go/README.md',
    'docs/sdk/go-quickstart.md',
    'docs/sdk/sdk-matrix.md',
    'scripts/sdk/generate-go-sdk.mjs',
  ]) {
    if (!exists(file)) {
      missing.push(`${file}:missing`);
      continue;
    }
    if (!read(file).includes(modulePath)) missing.push(`${file}:missing ${modulePath}`);
  }
  if (exists('packages/sdk-go/git_push.sh')) missing.push('packages/sdk-go/git_push.sh must not ship in dry-run-only lane');
  return passOrFail(missing, [modulePath, 'no generated live push helper']);
}

function javaSdkContractEvidence() {
  const missing = [];
  const expectedRootPackage = 'package com.lore.context.api;';
  const expectedCorePackage = 'package com.lore.context.api.core;';
  const expectedCoordinate = "group = 'dev.lorecontext'";
  const expectedArtifact = 'dev.lorecontext:lore-context-sdk';
  const expectedClientImport = 'import com.lore.context.api.LoreContextApiClient';
  const expectedEnvironmentImport = 'import com.lore.context.api.core.Environment';

  const requiredSnippets = [
    ['packages/sdk-java/src/main/java/LoreContextApiClient.java', expectedRootPackage],
    ['packages/sdk-java/src/main/java/core/Environment.java', expectedCorePackage],
    ['packages/sdk-java/build.gradle', expectedCoordinate],
    ['docs/sdk/java-quickstart.md', expectedArtifact],
    ['docs/sdk/java-quickstart.md', `${expectedEnvironmentImport};`],
    ['docs/sdk/kotlin-example.md', expectedEnvironmentImport],
    ['packages/sdk-java/examples/src/main/java/com/lore/example/SpringBootExample.java', `${expectedClientImport};`],
    ['packages/sdk-java/examples/src/main/kotlin/com/lore/example/KotlinExample.kt', expectedClientImport],
  ];

  for (const [file, snippet] of requiredSnippets) {
    if (!exists(file)) {
      missing.push(`${file}:missing`);
      continue;
    }
    if (!read(file).includes(snippet)) missing.push(`${file}:missing ${snippet}`);
  }

  const javaFiles = fs.readdirSync(rel('packages/sdk-java/src/main/java'), { recursive: true })
    .filter((name) => String(name).endsWith('.java'));
  for (const file of javaFiles) {
    const body = read('packages/sdk-java/src/main/java', file);
    if (/^package (core|requests|types|errors);/m.test(body)) missing.push(`packages/sdk-java/src/main/java/${file}:legacy package`);
    if (/^import (core|requests|types|errors)\./m.test(body)) missing.push(`packages/sdk-java/src/main/java/${file}:legacy import`);
  }

  return passOrFail(missing, [expectedArtifact, 'com.lore.context.api namespace']);
}

export function evaluateV207Acceptance(options = {}) {
  const verifyCommands = options.verifyCommands ?? false;
  const tsSdkVersion = packageVersion('packages/sdk-typescript/package.json');
  const pySdkVersion = pyProjectVersion('packages/sdk-python/pyproject.toml');
  const routeParity = routeParityEvidence();
  const taskBundle = taskBundleEvidence();
  const goSdk = goSdkContractEvidence();
  const javaSdk = javaSdkContractEvidence();
  const commands = commandEvidence(verifyCommands);
  const dotnetSdk = {
    status: 'pass',
    evidence: [
      'packages/sdk-dotnet/LoreContext.Sdk.sln',
      'packages/sdk-dotnet/examples/AspNetMinimalApi/AspNetMinimalApi.csproj',
    ],
  };

  const results = {
    'V2.0.7-A1': exists('docs/sdk/sdk-matrix.md') && exists('scripts/sdk/check-sdk-matrix.mjs')
      ? { status: 'pass', evidence: ['docs/sdk/sdk-matrix.md', 'scripts/sdk/check-sdk-matrix.mjs'] }
      : deferral('SDK matrix/checker not landed yet in this worktree.', 'node scripts/sdk/check-sdk-matrix.mjs'),
    'V2.0.7-A2': routeParity.status === 'pass'
      ? { status: 'pass', evidence: [`TS SDK ${tsSdkVersion}`, `Python SDK ${pySdkVersion}`, ...routeParity.checkedRoutes] }
      : { status: 'fail', evidence: routeParity.missing },
    'V2.0.7-B1': exists('packages/sdk-go/go.mod')
      ? commandRequired(goSdk, commands, 'V2.0.7-B1', 'cd packages/sdk-go && go test ./...', verifyCommands)
      : deferral('Go SDK package not landed yet in this worktree.', 'cd packages/sdk-go && go test ./...'),
    'V2.0.7-B2': exists('packages/sdk-go/examples') && exists('docs/sdk/go-quickstart.md')
      ? commandRequired(goSdk, commands, 'V2.0.7-B2', 'cd packages/sdk-go/examples && go test ./...', verifyCommands)
      : deferral('Go examples/release dry-run docs not landed yet in this worktree.', 'cd packages/sdk-go/examples && go test ./...'),
    'V2.0.7-C1': exists('packages/sdk-java/build.gradle') || exists('packages/sdk-java/build.gradle.kts')
      ? commandRequired(javaSdk, commands, 'V2.0.7-C1', 'cd packages/sdk-java && ./gradlew test', verifyCommands)
      : deferral('Java SDK package not landed yet in this worktree.', 'cd packages/sdk-java && ./gradlew test'),
    'V2.0.7-C2': exists('packages/sdk-java/examples') && exists('docs/sdk/kotlin-example.md')
      ? commandRequired(javaSdk, commands, 'V2.0.7-C2', 'cd packages/sdk-java/examples && ./gradlew test', verifyCommands)
      : deferral('Spring/Kotlin examples not landed yet in this worktree.', 'cd packages/sdk-java/examples && ./gradlew test'),
    'V2.0.7-D1': exists('packages/sdk-dotnet/LoreContext.Sdk.sln')
      ? commandRequired(dotnetSdk, commands, 'V2.0.7-D1', 'dotnet test packages/sdk-dotnet/LoreContext.Sdk.sln', verifyCommands)
      : deferral('.NET SDK package not landed yet in this worktree.', 'dotnet test packages/sdk-dotnet/LoreContext.Sdk.sln'),
    'V2.0.7-D2': exists('packages/sdk-dotnet/examples/AspNetMinimalApi/AspNetMinimalApi.csproj')
      ? commandRequired(dotnetSdk, commands, 'V2.0.7-D2', 'dotnet build packages/sdk-dotnet/examples/AspNetMinimalApi/AspNetMinimalApi.csproj', verifyCommands)
      : deferral('ASP.NET example not landed yet in this worktree.', 'dotnet build packages/sdk-dotnet/examples/AspNetMinimalApi/AspNetMinimalApi.csproj'),
    'V2.0.7-E1': exists('docs/sdk/framework-recipes.md')
        && exists('docs/sdk/openai-agents.md')
        && exists('docs/sdk/langchain-langgraph.md')
        && exists('docs/sdk/rest-curl-quickstart.md')
      ? {
          status: 'pass',
          evidence: [
            'docs/sdk/framework-recipes.md',
            'docs/sdk/openai-agents.md',
            'docs/sdk/langchain-langgraph.md',
            'docs/sdk/rest-curl-quickstart.md',
          ],
        }
      : deferral('Framework adapter and long-tail fallback docs not landed yet in this worktree.', 'pnpm exec markdownlint "docs/sdk/**/*.md"'),
    'V2.0.7-F1': taskBundle.status === 'pass'
      ? { status: 'pass', evidence: ['.omc/linear-tasks/v207 task bundle maps BRA-593 through BRA-602'] }
      : { status: 'fail', evidence: taskBundle.missing },
  };

  return {
    version: '2.0.7',
    generatedAt: new Date().toISOString(),
    summary: Object.entries(results).reduce((acc, [, result]) => {
      acc[result.status] = (acc[result.status] ?? 0) + 1;
      return acc;
    }, {}),
    results,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = evaluateV207Acceptance({ verifyCommands: true });
  const compact = process.argv.includes('--json') ? JSON.stringify(report, null, 2) : report;
  if (process.argv.includes('--json')) {
    console.log(compact);
  } else {
    console.log(`Lore v${report.version} acceptance: ${JSON.stringify(report.summary)}`);
    for (const [criterion, result] of Object.entries(report.results)) {
      const details = result.evidence ?? [result.reason, result.nextCommand].filter(Boolean);
      console.log(`- ${criterion}: ${result.status.toUpperCase()} — ${details.join('; ')}`);
    }
  }
  if (report.summary.fail) process.exitCode = 1;
}
