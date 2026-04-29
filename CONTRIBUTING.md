# Contributing To Lore Context

Thanks for improving Lore Context. This project is an alpha-stage AI-agent context
control plane, so changes should preserve local-first operation, auditability, and
deployment safety.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating
you agree to uphold it.

## Development Setup

Requirements:

- Node.js 22 or newer
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (Optional) Docker for the Postgres path
- (Optional) `psql` if you prefer to apply schema yourself

Common commands:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # requires docker compose up -d postgres
pnpm run doctor
```

For per-package work:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore-context/server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Pull Request Expectations

- **Keep changes focused and reversible.** One concern per PR; one PR per concern.
- **Add tests** for behavior changes. Prefer real assertions over snapshots.
- **Run `pnpm build` and `pnpm test`** before requesting review. CI runs them too,
  but locally is faster.
- **Run the relevant smoke test** when changing API, dashboard, MCP, Postgres,
  import/export, eval, or deployment behavior.
- **Do not commit** generated build output, local stores, `.env` files,
  credentials, or private customer data. The `.gitignore` covers most paths;
  if you create new artifacts, make sure they are excluded.
- **Stay within the scope of your PR.** Don't refactor unrelated code drive-by.

## Architectural Guardrails

These are non-negotiable for v0.4.x. If a PR violates one, expect a request to
split or rework:

- **Local-first remains primary.** A new feature must work without a hosted
  service or third-party SaaS dependency.
- **No new auth surface bypasses.** Every route stays gated by API key + role.
  Loopback is not a special case in production.
- **No raw `agentmemory` exposure.** External callers reach memory through Lore
  endpoints only.
- **Audit log integrity.** Every mutation that affects memory state writes an
  audit entry.
- **Fail closed on missing config.** Production-mode startup refuses to begin if
  required env vars are placeholders or missing.

## Commit Messages

Lore Context uses a small, opinionated commit format inspired by Linux kernel
guidelines.

### Format

```text
<type>: <short summary in imperative mood>

<optional body explaining why this change is needed and what tradeoffs apply>

<optional trailers>
```

### Types

- `feat` — new user-visible capability or API endpoint
- `fix` — bug fix
- `refactor` — code restructure with no behavior change
- `chore` — repository hygiene (deps, tooling, file moves)
- `docs` — documentation only
- `test` — test-only changes
- `perf` — performance improvement with measurable impact
- `revert` — reverting a previous commit

### Style

- **Lowercase** the type and the summary's first word.
- **No trailing period** in the summary line.
- **≤72 characters** in the summary line; wrap body at 80.
- **Imperative mood**: "fix loopback bypass", not "fixed" or "fixes".
- **Why over what**: the diff shows what changed; the body should explain why.
- **Do not include** `Co-Authored-By` trailers, AI attribution, or
  signed-off-by lines unless explicitly required by the user.

### Useful Trailers

When relevant, add trailers to capture constraints and reviewer context:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Example

```text
fix: loopback bypass — remove host-header trust, fail closed in production

Previous versions trusted the Host header for loopback detection, allowing a
remote attacker to spoof "Host: 127.0.0.1" and obtain admin role with no API
key when LORE_API_KEYS was unset. Loopback detection now uses
req.socket.remoteAddress only, and production with empty keys returns 401.

Constraint: Local development without keys still works on loopback
Confidence: high
Scope-risk: narrow (auth path only)
Tested: pnpm test (added loopback-bypass test case), pnpm smoke:api
```

## Commit Granularity

- One logical change per commit. Reviewers can revert atomically without
  collateral damage.
- Squash trivial fixups (`typo`, `lint`, `prettier`) into the parent commit
  before opening or updating a PR.
- Multi-file refactors are fine in a single commit if they share a single
  reason.

## Review Process

- A maintainer will review your PR within 7 days during typical activity.
- Address all blocking comments before re-requesting review.
- For non-blocking comments, replying inline with rationale or a follow-up
  issue is acceptable.
- Maintainers may add a `merge-queue` label once the PR is approved; do not
  rebase or force-push after that label is applied.

## Documentation Translations

If you'd like to improve a translated README or documentation file, see the
[i18n contributor guide](docs/i18n/README.md).

## Reporting Bugs

- File a public issue at https://github.com/Lore-Context/lore-context/issues
  unless the bug is a security vulnerability.
- For security issues, follow [SECURITY.md](SECURITY.md).
- Include: version or commit, environment, reproduction, expected vs actual,
  logs (with sensitive content redacted).

## Thanks

Lore Context is a small project trying to do something useful for AI-agent
infrastructure. Every well-scoped PR moves it forward.
