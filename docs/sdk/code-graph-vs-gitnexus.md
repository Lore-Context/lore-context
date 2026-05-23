# Code Knowledge Graph — Comparison with Alternatives

Lore v2.0.4 enters a space with several established tools. This document compares Lore's code knowledge graph honestly against the closest alternatives: GitNexus, codebase-memory-mcp, Sourcegraph Cody, and Aider's repo map.

The goal is to help you choose the right tool for your situation. If a local-only tool fits your requirements better, use it.

---

## Summary table

| | Lore Code KG | GitNexus | codebase-memory-mcp | Sourcegraph Cody | Aider repo map |
|---|---|---|---|---|---|
| **Storage** | Cloud (Lore RDS) | Local (LadybugDB) | Local (SQLite) | Cloud (Sourcegraph) | In-process (memory) |
| **Multi-tenant / team** | Yes | No | No | Yes (enterprise) | No |
| **Integrated with conversation memory** | Yes (`context_query mode="code"`) | No | No | No | No |
| **Privacy model** | Sealed-type allowlist; bodies stay local | N/A — everything local | N/A — everything local | Enterprise contract | N/A — no upload |
| **Language coverage (Tier-1)** | TS/JS/TSX/JSX/Python/Go (6) | Varies by grammar | Claims 155 langs | TS/JS/Python/Go/Java/C# (6+) | Language-agnostic (file-level ranking) |
| **Semantic search** | Yes (Qwen3 embeddings + BM25 RRF) | Yes (via LadybugDB) | Yes (SQLite + WAL) | Yes (structural graph, post-2026 migration) | No (ranking only) |
| **Works offline** | No | Yes | Yes | No | Yes |
| **Single-developer performance** | Cloud RTT adds latency | Fastest (local) | Fastest (local) | Cloud RTT | Fastest (local) |
| **Pricing** | Lore subscription | Free / OSS | Free / OSS | Free tier + Enterprise | Free / OSS |

---

## GitNexus

GitNexus (github.com/abhigyanpatwari/GitNexus) is a Tree-sitter-based local code knowledge graph that uses LadybugDB for storage and exposes MCP tools with Claude Code `PreToolUse`/`PostToolUse` hooks for automatic impact analysis.

**GitNexus's strength is single-developer, local-only performance.** Because everything runs on your machine, there is zero cloud RTT and no privacy surface at all — nothing leaves your machine by design. For a solo developer who does not need team sharing and is not comfortable with any cloud upload, GitNexus is the better choice.

**Where Lore differs:** Lore targets teams and projects where the code knowledge graph needs to persist across machines, be shared between developers, and live alongside conversation memory in the same vault. Lore's `context_query mode="code"` is the only tool in this comparison that returns both conversation memory and code context in a single API call. GitNexus has no equivalent.

Lore also has an architectural privacy contract (sealed Zod schema + CI gate) that GitNexus does not need, because GitNexus's model is local-only and the privacy question simply does not arise. Lore's privacy work is necessary precisely because Lore does upload — and the constraints are enforced structurally rather than by documentation.

**Honest assessment:** If you are a single developer who wants the fastest possible local graph, GitNexus is a better fit than Lore for that use case. Lore is not trying to win on single-machine query latency.

---

## codebase-memory-mcp

codebase-memory-mcp (github.com/DeusData/codebase-memory-mcp) is marketed with claims of "155 languages", "99% fewer tokens", "83% answer quality", "10× fewer tokens", and "2.1× fewer tool calls" relative to file-by-file reads. It uses a local SQLite database with WAL mode and ships as a single binary.

**codebase-memory-mcp's strength is breadth and simplicity.** 155 language parsers in a single binary with no cloud dependency is a genuinely impressive packaging achievement. For a developer who wants broad language coverage with no setup beyond installing a binary, this is compelling.

**Where Lore differs:** Lore's 155-vs-6 language comparison is not apples-to-apples. Lore's Tier-1 languages (TS/JS/TSX/JSX/Python/Go) have full LSP-style call resolution with ≥85% precision targets. Lore's Tier-2 languages (Rust, Java, C/C++, C#, Ruby, PHP) have symbol extraction with approximate relations. The codebase-memory-mcp benchmark methodology is not reproducible from their published documentation — Lore does not claim to match those specific numbers.

Lore's differentiators over codebase-memory-mcp are the same as over GitNexus: cloud persistence, multi-tenant team sharing, and integrated conversation memory. codebase-memory-mcp has no cloud component, no team sharing, and no memory integration.

The published performance benchmarks ("10× fewer tokens / 83% answer quality") are for the single-developer local case. Lore's target use case is different — persistent, shared, multi-vault. Lore has its own performance targets (≤150ms p95 for `code.search` on a 50k-symbol vault; ≤60s full index for a 700-file TS repo) that are measured against a different workload.

**Honest assessment:** For single-developer, local, broad-language coverage, codebase-memory-mcp is a reasonable choice. Lore does not compete on language breadth or single-binary simplicity. Lore competes on cloud persistence, team sharing, and memory integration.

---

## Sourcegraph Cody

Sourcegraph Cody (sourcegraph.com) is the closest cloud-multi-tenant competitor. Cody has migrated from pure embedding search to a structural code graph (announced 2026) and serves enterprise customers with large codebases. It integrates with VS Code, JetBrains, and has an MCP-compatible surface.

**Cody's strength is enterprise scale.** Sourcegraph has years of production experience indexing extremely large codebases (100k+ file monorepos), deep IDE integrations, and an established enterprise sales motion. For a large engineering organization with existing Sourcegraph infrastructure, Cody is the natural choice.

**Where Lore differs from Cody:**

Lore's core differentiation is the integration with conversation memory. Cody's code graph and Sourcegraph's memory layer are separate products. Lore's `context_query mode="code"` merges what an agent has remembered about a project (meeting notes, architecture decisions, previous bug investigations) with the structural code context in a single vault-scoped call. Cody has no equivalent today.

Lore's privacy model is architecturally enforced at the payload level — the sealed Zod schema makes "no function body leaves the client" a compile-time guarantee, not a privacy policy. Cody's privacy model is a contractual enterprise data-handling agreement. The mechanisms are different; neither is universally superior — the right choice depends on whether your threat model is "a buggy client accidentally uploads a body" (Lore's focus) or "the SaaS provider's data handling" (Sourcegraph's contractual focus).

Lore's pricing model is per-vault (developer or small team). Cody's enterprise pricing requires negotiated contracts. For individual developers and small teams, Lore's access model is simpler.

**Honest assessment:** For a large enterprise already using Sourcegraph, Cody is the right choice — Lore is not built for 100k-file monorepos in v2.0.4. For individual developers and small teams who want cloud persistence with memory integration and an explicit privacy contract, Lore is a compelling alternative to Cody. The structural graph approach is convergent — both Lore and Cody have moved away from embedding-only retrieval toward combined structural + semantic search. The differentiation is on memory integration, privacy model, and pricing tier.

---

## Aider repo map

Aider's repo map (aider.chat/docs/repomap.html) is not a knowledge graph — it is a file-ranking algorithm that uses ctags and PageRank to select the most relevant files to include in an LLM context window. It operates entirely in-process with no persistent storage.

**Aider's repo map's strength is zero setup.** There is nothing to install beyond Aider itself, no indexer to run, and no MCP server to configure. For one-off coding tasks where you want a ranking of relevant files with no infrastructure, this is the right baseline.

**Where Lore differs:** Lore stores a persistent graph with relation-level edges. Aider's repo map produces a one-shot ranking for a single prompt; it does not persist, cannot answer "what calls this function", and has no team-sharing capability. The repo map also operates at file granularity (with some symbol-level detail from ctags), while Lore operates at symbol granularity with typed edges between symbols.

Aider's repo map is also limited by the `--map-tokens` budget (default 1000 tokens), which means large repos must be sampled. Lore's MCP tools return targeted results (top-K symbols, specific call chains) rather than a sampled file list, which typically uses fewer tokens for precise structural questions.

**Honest assessment:** Aider's repo map is a ranking baseline, not a knowledge graph. The comparison is not directly meaningful — they solve different problems. If you are using Aider and want to add persistent structural queries, Lore and Aider are complementary rather than competing.

---

## When to choose Lore

Lore's code knowledge graph is the right choice when:

- You need the code graph to persist across machines and sessions (not re-derived each time).
- You want a team to share a code graph under the same vault.
- You want `context_query mode="code"` to merge conversation memory and code context in one call.
- You need a verifiable privacy contract enforced architecturally, not by policy.
- You work primarily in TypeScript, JavaScript, Python, or Go (Tier-1 full-precision).

Lore's code knowledge graph is not the right choice when:

- You need a fully local deployment with no cloud upload. Use GitNexus or codebase-memory-mcp.
- You are indexing a 100k+ file enterprise monorepo. Use Sourcegraph Cody.
- You need 155-language coverage without any setup. Use codebase-memory-mcp.
- You need Tier-2 fully opaque storage (all structural metadata encrypted). This is not available in v2.0.4.

---

## Honest statement on Tier-2 encryption

The plan document's language ("Tier-2 E2E encrypted symbols") requires clarification. Tier-2 encrypts symbol names, signatures, and doc comments. File paths, line ranges, relation kinds, and graph topology remain visible to Lore Cloud. This is **symbol-name obfuscation with graph topology visible**, not end-to-end encryption of the codebase. The distinction matters: an adversary with database read access can still see which encrypted node calls which other encrypted node, and can see exact file paths like `apps/api/src/billing/stripe-client.ts`.

This is documented accurately in the [privacy model](../privacy/code-graph-privacy-model.md#tier-2-residual-leakage). If you need fully opaque storage, the right tool is a local-only option.
