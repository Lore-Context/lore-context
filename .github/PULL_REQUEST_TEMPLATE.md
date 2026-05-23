## Summary

<!-- Describe the outcome, not just the files changed. -->

## Linear

<!-- Required for agent-created PRs. Paste the Linear issue URL. Use "N/A - manual workflow change" only when there is no issue. -->
Linear:

## Scope

<!-- List the intentionally touched areas. -->
- 

## Production Safety

Production touched: no
Human gate needed: no

<!-- If either answer is "yes", explain the manual gate and add `human-gated` / `production-blocked` labels. -->

<!-- Required when release workflows, release scripts, release contract, or website version/status verification changes. Use "N/A" only when untouched. -->
Release workflow review: N/A
Production smoke review: N/A
Version consistency review: N/A

## Verification

<!-- Paste commands and result summaries. Do not write "not run" without a reason. -->
- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] `pnpm smoke:api`
- [ ] `pnpm smoke:mcp`

## Not Tested

<!-- List explicit gaps, unavailable secrets, skipped heavy gates, or "None". -->

## Agent Checklist

- [ ] I stayed inside the requested scope.
- [ ] I did not modify secrets or commit credentials.
- [ ] I did not deploy, tag, merge, or change production runtime configuration.
- [ ] I added/updated tests or explained why tests are not applicable.
- [ ] I attached required evidence before moving the Linear issue to `In Review`.

## DCO Sign-off (required for all contributors)

By submitting this pull request, I agree to the
[Developer Certificate of Origin](https://developercertificate.org/) and certify
that every commit in this branch contains a `Signed-off-by:` line.

The DCO check workflow (`.github/workflows/dco-check.yml`) verifies this
automatically — missing sign-offs block merge. If you forgot to sign off:

```
git rebase --signoff main
git push --force-with-lease
```

See [CONTRIBUTING.md](../CONTRIBUTING.md#dco-developer-certificate-of-origin)
for details.
