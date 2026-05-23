#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const required = [
  'packages/sdk-dotnet/LoreContext.Sdk.sln',
  'packages/sdk-dotnet/src/LoreContext.Sdk/LoreContext.Sdk.csproj',
  'packages/sdk-dotnet/tests/LoreContext.Sdk.Tests/LoreContext.Sdk.Tests.csproj',
  'packages/sdk-dotnet/examples/AspNetMinimalApi/AspNetMinimalApi.csproj',
  'docs/sdk/dotnet-quickstart.md',
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length) {
  console.error(`Missing .NET SDK files:
${missing.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}

const dotnetHome = path.join(process.env.HOME ?? '', '.dotnet');
const pathEntries = [dotnetHome, process.env.PATH].filter(Boolean);
const env = { ...process.env, PATH: pathEntries.join(path.delimiter) };
const dotnet = spawnSync('dotnet', ['--version'], { encoding: 'utf8', env });
if (dotnet.status !== 0) {
  console.log('PASS structure check: .NET SDK files and docs are present.');
  console.log('SKIP dotnet pack dry-run: dotnet CLI is not installed on this machine.');
  process.exit(0);
}

console.log(`dotnet ${dotnet.stdout.trim()}`);
const pack = spawnSync('dotnet', ['pack', 'packages/sdk-dotnet/src/LoreContext.Sdk/LoreContext.Sdk.csproj', '--configuration', 'Release', '--output', 'packages/sdk-dotnet/artifacts'], { stdio: 'inherit', env });
process.exit(pack.status ?? 1);
