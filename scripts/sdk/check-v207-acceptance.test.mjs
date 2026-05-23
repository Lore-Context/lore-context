import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluateV207Acceptance } from './check-v207-acceptance.mjs';

test('v2.0.7 acceptance report covers every planned criterion exactly once', () => {
  const report = evaluateV207Acceptance();
  assert.deepEqual(Object.keys(report.results), [
    'V2.0.7-A1',
    'V2.0.7-A2',
    'V2.0.7-B1',
    'V2.0.7-B2',
    'V2.0.7-C1',
    'V2.0.7-C2',
    'V2.0.7-D1',
    'V2.0.7-D2',
    'V2.0.7-E1',
    'V2.0.7-F1',
  ]);
});

test('existing TypeScript and Python SDKs expose the shared adoption baseline routes', () => {
  const report = evaluateV207Acceptance();
  assert.equal(report.results['V2.0.7-A2'].status, 'pass');
  assert.match(report.results['V2.0.7-A2'].evidence.join('\n'), /POST v1\/context\/query/);
  assert.match(report.results['V2.0.7-A2'].evidence.join('\n'), /POST v1\/memory\/write/);
});

test('Linear bundle maps all BRA-593 through BRA-602 tasks to v2.0.7 criteria', () => {
  const report = evaluateV207Acceptance();
  assert.equal(report.results['V2.0.7-F1'].status, 'pass');
});

test('landed implementation lanes reflect package identity and artifact evidence', () => {
  const staticReport = evaluateV207Acceptance();
  for (const criterion of ['V2.0.7-B1', 'V2.0.7-B2', 'V2.0.7-C1', 'V2.0.7-C2', 'V2.0.7-D1', 'V2.0.7-D2']) {
    assert.equal(staticReport.results[criterion].status, 'deferred');
    assert.match(staticReport.results[criterion].reason, /requires command verification/);
  }

  const report = evaluateV207Acceptance({ verifyCommands: true });

  for (const criterion of ['V2.0.7-B1', 'V2.0.7-B2', 'V2.0.7-C1', 'V2.0.7-C2', 'V2.0.7-D1', 'V2.0.7-D2', 'V2.0.7-E1']) {
    assert.equal(report.results[criterion].status, 'pass');
    assert.ok(report.results[criterion].evidence.length > 0);
  }

  assert.match(report.results['V2.0.7-B1'].evidence.join('\n'), /github\.com\/lore-context\/lore-context-go-sdk/);
  assert.match(report.results['V2.0.7-C1'].evidence.join('\n'), /dev\.lorecontext:lore-context-sdk/);
  assert.match(report.results['V2.0.7-D1'].evidence.join('\n'), /dotnet test/);
});
