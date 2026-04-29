# Design Partner Intake

Status: draft process for v0.6 design partner discovery.

## Ideal Partner

Look for teams already using or evaluating agent memory in a real workflow:

- coding agents across multiple repositories;
- support or operations agents with repeated customer/project context;
- internal copilots that need shared durable memory;
- regulated or security-sensitive teams that need auditability before rollout.

## Qualification Questions

1. What agents are you using today?
2. What memory backend or retrieval layer is currently in place?
3. What bad outcome would make agent memory unacceptable for your team?
4. Do you need to explain why a specific answer used a specific memory?
5. Do you need human review before memory writeback?
6. What data cannot leave your environment?
7. What would count as first value in one hour?
8. Who approves a private deployment trial?

## Required Boundaries

- Do not request customer secrets, production traces, or private datasets for a
  first call.
- Use demo data unless the partner provides sanitized data intentionally.
- Do not promise hosted SaaS availability.
- Do not promise compliance certification.
- Confirm whether the partner is comfortable being named before any public case
  study language is drafted.

## First Session Script

1. Run quickstart with `--activation-report`.
2. Seed the demo dataset.
3. Query context and inspect Evidence Ledger.
4. Trigger a risky write and review it.
5. Export a public-safe eval report.
6. Record where the user slowed down or asked for clarification.

## Output

Each design partner session should produce:

- activation scorecard;
- public-safe session row in `session-tracker.md`;
- top three blockers;
- one quote or paraphrased job-to-be-done, if approved;
- decision on whether a second technical session is justified.
