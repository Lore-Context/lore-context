#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = [
  '@openapitools/openapi-generator-cli',
  'generate',
  '-g', 'go',
  '-i', 'fern/openapi/openapi.yaml',
  '-o', 'packages/sdk-go',
  '--additional-properties=packageName=lorecontext,moduleName=github.com/lore-context/lore-context-go-sdk,withGoMod=true',
];

console.log(`DRY-RUN SAFE: npx ${args.join(' ')}`);
if (process.argv.includes('--print-only')) process.exit(0);
const result = spawnSync('npx', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
