# Good first issues for Lore Context

This document lists candidate "good first issue" titles for the Lore Context
public repository. Maintainers translate these into actual GitHub issues with
the `good first issue` label as community capacity allows.

Each candidate has been chosen to be self-contained, well-scoped, and
completable by someone unfamiliar with the codebase in 30 minutes to half a
day.

## Documentation

1. **Add troubleshooting section to `docs/getting-started.md` for common
   pnpm install errors on macOS Apple Silicon**
   - File: `docs/getting-started.md`
   - Why: Frequent friction point reported on Discussions
   - Estimated: 1 hour

2. **Translate the Quick Start section of `README.md` to Korean**
   - File: `docs/i18n/ko/README.md`
   - Why: README has 17 i18n stubs; some sections lag
   - Estimated: 1 hour (assumes Korean fluency)

3. **Document the `LORE_LLM_PROVIDER_CHAIN` env var precedence rules**
   - File: `docs/configuration.md` (new section)
   - Why: Behavior is correct in code but undocumented; surfaced in Discussions
   - Estimated: 30 minutes

## Tests

4. **Add a unit test for the `qdrant_dense` stream timeout edge case**
   - File: `packages/search/tests/orchestrator-v12.test.ts`
   - Why: Timeout-then-recover branch in `HybridSearchOrchestrator` lacks coverage
   - Estimated: 2 hours

5. **Extend the embedding-cache LRU eviction test to verify TTL boundary
   condition (request at exactly TTL milliseconds)**
   - File: `apps/api/src/embedding-cache.test.ts`
   - Why: Fence-post error candidate; current test asserts only mid-TTL hit
   - Estimated: 1 hour

## Code

6. **Add a `--quiet` flag to `lore doctor v13` to suppress info-level output**
   - File: `apps/cli/src/doctor-v13.ts`
   - Why: Useful in CI scripts; current command always logs verbose
   - Estimated: 1 hour

7. **Replace the hand-rolled UUID v4 in `apps/api/src/billing/stripe-client.ts`
   with `crypto.randomUUID()`**
   - File: `apps/api/src/billing/stripe-client.ts` (after Lane F-A3 ships)
   - Why: Built-in is faster and standards-compliant
   - Estimated: 30 minutes

## Performance

8. **Replace the linear scan in `wiki-compiler-v13.ts:findMergeCandidates` with
   a Set-based lookup for O(n) instead of O(n²) on large vault**
   - File: `apps/api/src/workers/wiki-compiler-v13.ts`
   - Why: Profile showed it as a hot path on vaults > 5k records
   - Estimated: half a day

## How to claim

1. Comment on the issue saying you'd like to work on it.
2. A maintainer will assign it to you within 48 hours.
3. Open a PR with `Signed-off-by:` on every commit (DCO required).
4. Tag a maintainer for review.

If a candidate listed here is not yet a real GitHub issue, you may file the
issue yourself using the «Good first issue» template. Reference this document
in the issue body.
