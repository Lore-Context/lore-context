# Benchmark Distribution Checklist (Phase 1 — Week 3)

Mechanical steps for distributing `v1.3-longmemeval-s-private.md`.
No reviewer judgment embedded. Execute each item in order.

---

## Pre-distribution Verification

- [ ] **PII / customer data scan**

  ```bash
  grep -rE "lct_(device|service|admin)_[a-zA-Z0-9]{20,}" docs/benchmarks/
  grep -rE "vault_[a-zA-Z0-9]{16,}" docs/benchmarks/
  grep -rE "[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}" docs/benchmarks/
  ```

  Expected: no matches.

- [ ] **gitleaks scan**

  ```bash
  gitleaks detect --source docs/benchmarks/ --no-git
  ```

  Expected: `No leaks found.`

- [ ] **OSS public repo reference check**

  ```bash
  grep -E "github\.com.*[Ll]ore-[Cc]ontext.*lore-context" docs/benchmarks/
  ```

  Expected: no matches.

---

## CHANGELOG.md Entry

- [ ] Locate insertion point:

  ```bash
  grep -n "v1.3.0-beta" CHANGELOG.md
  ```

  Append at end of `v1.3.0-beta` section:

  ```
  - **Benchmarks (private)**: LongMemEval-S 500 q results (R@5 96.6%,
    R@10 98.8%, MRR 91.5%) published to customer portal `/benchmarks`.
    See `docs/benchmarks/v1.3-longmemeval-s-private.md`.
  ```

---

## Customer Portal Route

- [ ] Confirm `/benchmarks` route exists:

  ```bash
  grep -rE "benchmarks" apps/portal/src/ 2>/dev/null | grep -E "route|path|href"
  ```

  If no results: TODO_LANE_E_PHASE2 — route does not exist yet; create it
  or use the existing docs viewer before distribution.

---

## Slack Draft

- [ ] Post to `#design-partners`. Subject: "Lore v1.3 Benchmark Results —
  LongMemEval-S (Private)". Include headline numbers (R@5 96.6%, R@10
  98.8%, MRR 91.5%), comparison to AgentMemory hybrid (R@5 95.2%), portal
  link `https://portal.lorecontext.com/benchmarks`, retrieval-only/no-LLM-judge
  disclaimer, reproducibility link, and note that a v1.4 appendix (reranker
  on/off + P95 latency) is planned for Week 6.

---

## Email Blast

- [ ] Subject: `Lore v1.3 Benchmark: R@5 96.6% on LongMemEval-S (private results)`
- [ ] Body: headline numbers, AgentMemory comparison, portal link, retrieval-only
  disclaimer, v1.4 appendix ETA (Week 6).
- [ ] Substitute `[First Name]` and `[UNSUBSCRIBE_TOKEN]` from CRM / email
  platform before sending.

---

## Post-distribution

- [ ] Confirm at least 5 design partners ack receipt (Slack reply or email
  reply). Record names in internal tracking doc (not in this file).
