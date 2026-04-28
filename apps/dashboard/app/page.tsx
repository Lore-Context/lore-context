"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type MemoryStatus = "candidate" | "active" | "confirmed" | "superseded" | "expired" | "deleted";
type TraceFeedback = "useful" | "wrong" | "outdated" | "sensitive";
type MemoryActionMode = "edit" | "supersede" | "reject" | "forget";

interface MemoryRecord {
  id: string;
  content: string;
  memoryType: string;
  scope: string;
  status: MemoryStatus;
  projectId?: string;
  riskTags: string[];
  useCount: number;
  confidence: number;
  supersededBy?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContextTrace {
  id: string;
  projectId?: string;
  query: string;
  route: { reason: string };
  latencyMs: number;
  tokenBudget: number;
  tokensUsed: number;
  warnings: string[];
  feedback?: TraceFeedback;
  feedbackAt?: string;
  feedbackNote?: string;
  createdAt: string;
}

interface EvalMetrics {
  recallAt5: number;
  precisionAt5: number;
  mrr: number;
  staleHitRate: number;
  p95LatencyMs: number;
}

interface EvalRun {
  id: string;
  provider: string;
  projectId?: string;
  metrics: EvalMetrics;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface DashboardData {
  health: "ok" | "error";
  agentmemory: string;
  memories: MemoryRecord[];
  traces: ContextTrace[];
  evalRuns: EvalRun[];
  auditLogs: AuditLog[];
}

interface MemoryActionDraft {
  mode: MemoryActionMode;
  memoryId: string;
  originalContent: string;
  content: string;
  reason: string;
}

const demoProjectId = "demo-private";
const demoQuery = "继续 Lore 项目开发";
const demoMemorySeed = "Lore should keep governed project memory auditable.";
const defaultProviders = ["lore-local", "agentmemory-export"];

const defaultDataset = JSON.stringify(
  {
    sessions: [
      {
        sessionId: "s1",
        messages: [{ role: "user", content: "Lore should keep governed project memory auditable." }]
      },
      {
        sessionId: "s2",
        messages: [{ role: "user", content: "The MCP server should use official SDK stdio transport." }]
      }
    ],
    questions: [
      { question: "What project memory should Lore keep auditable?", goldSessionIds: ["s1"] },
      { question: "Which transport should the MCP server use?", goldSessionIds: ["s2"] }
    ]
  },
  null,
  2
);

const evalProviders = ["lore-local", "agentmemory-export", "external-mock"];
const traceFeedbackOptions: Array<{ value: TraceFeedback; label: string; tone: "ok" | "muted" | "warn" | "risk" }> = [
  { value: "useful", label: "Useful", tone: "ok" },
  { value: "wrong", label: "Wrong", tone: "risk" },
  { value: "outdated", label: "Outdated", tone: "warn" },
  { value: "sensitive", label: "Sensitive", tone: "risk" }
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    health: "error",
    agentmemory: "unknown",
    memories: [],
    traces: [],
    evalRuns: [],
    auditLogs: []
  });
  const [projectId, setProjectId] = useState(demoProjectId);
  const [apiKey, setApiKey] = useState("");
  const [query, setQuery] = useState(demoQuery);
  const [contextResult, setContextResult] = useState("");
  const [memoryContent, setMemoryContent] = useState("");
  const [dataset, setDataset] = useState(defaultDataset);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(defaultProviders);
  const [memoryActionDraft, setMemoryActionDraft] = useState<MemoryActionDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    const active = data.memories.filter((memory) => memory.status === "active" || memory.status === "confirmed").length;
    const review = data.memories.filter((memory) => memory.status === "candidate").length;
    const risk = data.memories.filter((memory) => memory.riskTags.length > 0).length;
    const recall = data.evalRuns[0]?.metrics.recallAt5;
    return { active, review, risk, recall };
  }, [data]);

  const demoState = useMemo(() => {
    const sameProviders = selectedProviders.length === defaultProviders.length
      && defaultProviders.every((provider) => selectedProviders.includes(provider));
    if (projectId === demoProjectId && query === demoQuery && dataset === defaultDataset && sameProviders) {
      return { label: "Demo preset loaded", tone: "ok" as const };
    }
    if (projectId === demoProjectId) {
      return { label: "Demo project active", tone: "warn" as const };
    }
    return { label: "Custom workspace", tone: "muted" as const };
  }, [dataset, projectId, query, selectedProviders]);

  const evalLeaderboard = useMemo(
    () =>
      [...data.evalRuns].sort((left, right) => {
        const qualityGap = scoreEval(right) - scoreEval(left);
        if (qualityGap !== 0) {
          return qualityGap;
        }
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [data.evalRuns]
  );

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh(nextProjectId = projectId) {
    setError("");
    try {
      const [health, agentmemory, memories, traces, evalRuns, auditLogs] = await Promise.all([
        requestJson("/health", { allowError: true }),
        requestJson("/v1/integrations/agentmemory/health", { allowError: true }),
        requestJson(`/v1/memory/list?project_id=${encodeURIComponent(nextProjectId)}&limit=100`, { allowError: true }),
        requestJson("/v1/traces", { allowError: true }),
        requestJson(`/v1/eval/runs?project_id=${encodeURIComponent(nextProjectId)}&limit=20`, { allowError: true }),
        requestJson("/v1/audit-logs?limit=20", { allowError: true })
      ]);

      setData({
        health: health.status === "ok" ? "ok" : "error",
        agentmemory: typeof agentmemory.status === "string" ? agentmemory.status : "unknown",
        memories: Array.isArray(memories.memories) ? memories.memories : [],
        traces: Array.isArray(traces.traces) ? traces.traces : [],
        evalRuns: Array.isArray(evalRuns.evalRuns) ? evalRuns.evalRuns : [],
        auditLogs: Array.isArray(auditLogs.auditLogs) ? auditLogs.auditLogs : []
      });
    } catch (refreshError) {
      setError(errorMessage(refreshError));
    }
  }

  async function requestJson(path: string, options: { method?: string; body?: unknown; allowError?: boolean } = {}) {
    const headers = new Headers({ accept: "application/json" });
    if (apiKey.trim()) {
      headers.set("authorization", `Bearer ${apiKey.trim()}`);
    }
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(`/api/lore${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const text = await response.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      if (!options.allowError) {
        setError("Invalid JSON response from server");
        throw new Error("Invalid JSON response from server");
      }
      payload = {};
    }
    if (!response.ok && !options.allowError) {
      throw payload;
    }
    return payload;
  }

  async function runContext(event: FormEvent) {
    event.preventDefault();
    await runBusy(async () => {
      const payload = await requestJson("/v1/context/query", {
        method: "POST",
        body: {
          query,
          project_id: projectId,
          token_budget: 1400,
          include_sources: true
        }
      });
      setContextResult(payload.contextBlock ?? JSON.stringify(payload, null, 2));
      await refresh();
    });
  }

  async function saveMemory(event: FormEvent) {
    event.preventDefault();
    await runBusy(async () => {
      await requestJson("/v1/memory/write", {
        method: "POST",
        body: {
          content: memoryContent,
          memory_type: "project_rule",
          scope: "project",
          project_id: projectId
        }
      });
      setMemoryContent("");
      await refresh();
    });
  }

  async function runEvalComparison(event: FormEvent) {
    event.preventDefault();
    await runBusy(async () => {
      const parsedDataset = JSON.parse(dataset);
      const results = [];
      for (const provider of selectedProviders) {
        results.push(
          await requestJson("/v1/eval/run", {
            method: "POST",
            body: { provider, project_id: projectId, dataset: parsedDataset }
          })
        );
      }
      setContextResult(JSON.stringify(results, null, 2));
      await refresh();
    });
  }

  async function approveMemory(id: string) {
    await runBusy(async () => {
      await requestJson(`/v1/governance/memory/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        body: { reason: "dashboard approval", reviewer: "next-dashboard" }
      });
      await refresh();
    });
  }

  async function submitMemoryAction(event: FormEvent) {
    event.preventDefault();
    if (!memoryActionDraft) {
      return;
    }

    await runBusy(async () => {
      if (memoryActionDraft.mode === "edit") {
        await requestJson(`/v1/memory/${encodeURIComponent(memoryActionDraft.memoryId)}`, {
          method: "PATCH",
          body: { content: memoryActionDraft.content }
        });
      } else if (memoryActionDraft.mode === "supersede") {
        await requestJson(`/v1/memory/${encodeURIComponent(memoryActionDraft.memoryId)}/supersede`, {
          method: "POST",
          body: { content: memoryActionDraft.content, reason: memoryActionDraft.reason || "dashboard supersede" }
        });
      } else if (memoryActionDraft.mode === "reject") {
        await requestJson(`/v1/governance/memory/${encodeURIComponent(memoryActionDraft.memoryId)}/reject`, {
          method: "POST",
          body: { reason: memoryActionDraft.reason, reviewer: "next-dashboard" }
        });
      } else {
        await requestJson("/v1/memory/forget", {
          method: "POST",
          body: {
            memory_ids: [memoryActionDraft.memoryId],
            reason: memoryActionDraft.reason,
            hard_delete: false
          }
        });
      }
      setMemoryActionDraft(null);
      await refresh();
    });
  }

  async function sendTraceFeedback(id: string, feedback: TraceFeedback) {
    await runBusy(async () => {
      await requestJson(`/v1/traces/${encodeURIComponent(id)}/feedback`, {
        method: "POST",
        body: { feedback, note: "next-dashboard feedback" }
      });
      await refresh();
    });
  }

  async function loadDemo() {
    await runBusy(async () => {
      setProjectId(demoProjectId);
      setQuery(demoQuery);
      setMemoryContent(demoMemorySeed);
      setDataset(defaultDataset);
      setSelectedProviders(defaultProviders);
      setMemoryActionDraft(null);
      setContextResult("Demo preset loaded. Run Query, Save Memory, or Compare Providers to exercise the dashboard loop.");
      await refresh(demoProjectId);
    });
  }

  async function runBusy(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (workError) {
      setError(errorMessage(workError));
    } finally {
      setBusy(false);
    }
  }

  function openMemoryAction(mode: MemoryActionMode, memory: MemoryRecord) {
    setMemoryActionDraft({
      mode,
      memoryId: memory.id,
      originalContent: memory.content,
      content: memory.content,
      reason:
        mode === "supersede"
          ? "newer project context"
          : mode === "reject"
            ? "not durable context"
            : mode === "forget"
              ? "no longer durable context"
              : ""
    });
  }

  function toggleProvider(provider: string) {
    setSelectedProviders((current) =>
      current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]
    );
  }

  const memoryActionMeta = memoryActionDraft ? describeMemoryAction(memoryActionDraft.mode) : null;
  const memoryActionNeedsContent = memoryActionDraft ? memoryActionDraft.mode === "edit" || memoryActionDraft.mode === "supersede" : false;
  const memoryActionNeedsReason = memoryActionDraft ? memoryActionDraft.mode === "reject" || memoryActionDraft.mode === "forget" : false;
  const memoryActionDisabled = busy
    || !memoryActionDraft
    || (memoryActionNeedsContent && !memoryActionDraft.content.trim())
    || (memoryActionNeedsReason && !memoryActionDraft.reason.trim());

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Lore Context</h1>
          <p>Memory, retrieval, evaluation, and governance control plane.</p>
          <div className="topbarMeta">
            <span className={`statusBadge ${demoState.tone}`}>{demoState.label}</span>
            <span className="inlineNote">Load the demo preset to exercise query, write, review, trace, and eval actions against project <code>{demoProjectId}</code>.</span>
          </div>
        </div>
        <div className="connection">
          <span className={data.health === "ok" ? "dot ok" : "dot"} />
          API {data.health}
          <span className="divider" />
          agentmemory {data.agentmemory}
        </div>
      </header>

      <section className="toolbar">
        <label>
          Project
          <input value={projectId} onChange={(event) => setProjectId(event.currentTarget.value)} />
        </label>
        <label>
          API key
          <input value={apiKey} onChange={(event) => setApiKey(event.currentTarget.value)} placeholder="optional local key" />
        </label>
        <div className="toolbarActions">
          <button type="button" className="muted" onClick={loadDemo} disabled={busy}>Load Demo</button>
          <button type="button" onClick={() => void refresh()} disabled={busy}>Refresh</button>
        </div>
      </section>

      {error ? <pre className="error">{error}</pre> : null}

      <section className="metrics">
        <Metric label="Memories" value={data.memories.length} />
        <Metric label="Active" value={summary.active} />
        <Metric label="Review" value={summary.review} />
        <Metric label="Risk" value={summary.risk} />
        <Metric label="Traces" value={data.traces.length} />
        <Metric label="Recall@5" value={summary.recall === undefined ? "n/a" : percent(summary.recall)} />
      </section>

      <section className="grid">
        <div className="leftRail">
          <form className="panel stack" onSubmit={runContext}>
            <h2>Context Query</h2>
            <textarea value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
            <button type="submit" disabled={busy}>Run Query</button>
            <pre className="result">{contextResult || "Context output appears here."}</pre>
          </form>

          <form className="panel stack" onSubmit={saveMemory}>
            <h2>Memory Write</h2>
            <textarea value={memoryContent} onChange={(event) => setMemoryContent(event.currentTarget.value)} placeholder="Durable project fact" />
            <button type="submit" disabled={busy || !memoryContent.trim()}>Save Memory</button>
          </form>

          <form className="panel stack" onSubmit={runEvalComparison}>
            <h2>Eval Playground</h2>
            <div className="segments">
              {evalProviders.map((provider) => (
                <button
                  className={selectedProviders.includes(provider) ? "segment selected" : "segment"}
                  key={provider}
                  type="button"
                  onClick={() => toggleProvider(provider)}
                >
                  {provider}
                </button>
              ))}
            </div>
            <textarea className="dataset" value={dataset} onChange={(event) => setDataset(event.currentTarget.value)} />
            <button type="submit" disabled={busy || selectedProviders.length === 0}>Compare Providers</button>
          </form>
        </div>

        <div className="mainRail">
          <section className="panel">
            <div className="sectionHeader">
              <div>
                <h2>Memory Inventory</h2>
                <p>Patch text in place for small fixes, supersede changing facts, reject review items, or soft forget stale memory.</p>
              </div>
            </div>

            {memoryActionDraft && memoryActionMeta ? (
              <form className="memoryWorkbench" onSubmit={submitMemoryAction}>
                <div className="workbenchHeader">
                  <div>
                    <h3>{memoryActionMeta.title}</h3>
                    <p>{memoryActionMeta.hint}</p>
                  </div>
                  <button type="button" className="muted" onClick={() => setMemoryActionDraft(null)} disabled={busy}>Cancel</button>
                </div>

                <small className="monoLabel">{memoryActionDraft.memoryId}</small>

                {memoryActionNeedsContent ? (
                  <textarea
                    value={memoryActionDraft.content}
                    onChange={(event) => setMemoryActionDraft((current) => current ? { ...current, content: event.currentTarget.value } : current)}
                  />
                ) : (
                  <pre className="memoryPreview">{memoryActionDraft.originalContent}</pre>
                )}

                {memoryActionDraft.mode !== "edit" ? (
                  <label className="stackLabel">
                    Reason
                    <input
                      value={memoryActionDraft.reason}
                      onChange={(event) => setMemoryActionDraft((current) => current ? { ...current, reason: event.currentTarget.value } : current)}
                      placeholder={memoryActionMeta.reasonPlaceholder}
                    />
                  </label>
                ) : null}

                <div className="buttonRow">
                  <button type="submit" disabled={memoryActionDisabled}>{memoryActionMeta.submitLabel}</button>
                  <button type="button" className="muted" onClick={() => setMemoryActionDraft(null)} disabled={busy}>Close</button>
                </div>
              </form>
            ) : null}

            <table>
              <thead>
                <tr><th>Memory</th><th>Lifecycle</th><th>Use</th><th>Action</th></tr>
              </thead>
              <tbody>
                {data.memories.length === 0 ? <EmptyRow span={4} label="No memories for this project" /> : data.memories.slice(0, 30).map((memory) => (
                  <tr key={memory.id}>
                    <td>
                      <div>{memory.content}</div>
                      <small>{memory.id}</small>
                    </td>
                    <td>
                      <div className="metaStack">
                        <div className="strongLine">{memory.memoryType}</div>
                        <small>{memory.scope} · confidence {percent(memory.confidence)}</small>
                        <Status status={memory.status} risks={memory.riskTags} />
                        {memory.supersededBy ? <small>superseded by {memory.supersededBy}</small> : null}
                      </div>
                    </td>
                    <td>
                      <div className="strongLine">{memory.useCount}</div>
                      <small>{memory.lastUsedAt ? `last used ${formatDate(memory.lastUsedAt)}` : `updated ${formatDate(memory.updatedAt)}`}</small>
                    </td>
                    <td className="actions">
                      {memory.status === "candidate" ? (
                        <button type="button" onClick={() => approveMemory(memory.id)} disabled={busy}>Approve</button>
                      ) : null}
                      {memory.status === "candidate" ? (
                        <button type="button" className="danger" onClick={() => openMemoryAction("reject", memory)} disabled={busy}>Reject</button>
                      ) : null}
                      {memory.status !== "superseded" && memory.status !== "deleted" ? (
                        <button type="button" className="muted" onClick={() => openMemoryAction("edit", memory)} disabled={busy}>Edit</button>
                      ) : null}
                      {memory.status !== "superseded" && memory.status !== "deleted" ? (
                        <button type="button" className="muted" onClick={() => openMemoryAction("supersede", memory)} disabled={busy}>Supersede</button>
                      ) : null}
                      {memory.status !== "deleted" ? (
                        <button type="button" className="warn" onClick={() => openMemoryAction("forget", memory)} disabled={busy}>Soft Forget</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="sectionHeader">
              <div>
                <h2>Recent Traces</h2>
                <p>Mark context output useful, wrong, outdated, or sensitive to feed review and audit loops.</p>
              </div>
            </div>
            <table>
              <thead>
                <tr><th>Query</th><th>Route</th><th>Budget</th><th>Feedback</th></tr>
              </thead>
              <tbody>
                {data.traces.length === 0 ? <EmptyRow span={4} label="No traces yet" /> : data.traces.slice(-12).reverse().map((trace) => (
                  <tr key={trace.id}>
                    <td>
                      <div>{trace.query}</div>
                      <small>{trace.id}</small>
                    </td>
                    <td>
                      <div>{trace.route.reason}</div>
                      {trace.warnings.length ? <small>{trace.warnings.join(", ")}</small> : <small>No warnings</small>}
                    </td>
                    <td>
                      <div className="strongLine">{trace.latencyMs}ms</div>
                      <small>{trace.tokensUsed}/{trace.tokenBudget} tokens · {formatDate(trace.createdAt)}</small>
                    </td>
                    <td className="feedbackCell">
                      <div className="statusCell">
                        <span className={trace.feedback ? `pill ${feedbackToneClass(trace.feedback)}` : "pill neutral"}>
                          {trace.feedback ?? "unreviewed"}
                        </span>
                      </div>
                      {trace.feedbackAt ? <small>{formatDate(trace.feedbackAt)}</small> : null}
                      <div className="actions">
                        {traceFeedbackOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={trace.feedback === option.value ? `feedbackButton active ${option.tone}` : `feedbackButton ${option.tone}`}
                            onClick={() => sendTraceFeedback(trace.id, option.value)}
                            disabled={busy}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="split">
            <div className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>Eval Runs</h2>
                  <p>Runs are ranked by retrieval quality first, then stale-hit penalty and p95 latency.</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr><th>Rank</th><th>Provider</th><th>Retrieval</th><th>Stale</th><th>Latency</th><th>Run</th></tr>
                </thead>
                <tbody>
                  {evalLeaderboard.length === 0 ? <EmptyRow span={6} label="No eval runs" /> : evalLeaderboard.slice(0, 12).map((run, index) => (
                    <tr key={run.id}>
                      <td><span className="rankBadge">#{index + 1}</span></td>
                      <td>
                        <div>{run.provider}</div>
                        <small>{evalVerdict(run)}</small>
                      </td>
                      <td>
                        <div className="evalMetrics">
                          <MetricPill label="R@5" value={percent(run.metrics.recallAt5)} tone={qualityTone(run.metrics.recallAt5)} />
                          <MetricPill label="P@5" value={percent(run.metrics.precisionAt5)} tone={qualityTone(run.metrics.precisionAt5)} />
                          <MetricPill label="MRR" value={percent(run.metrics.mrr)} tone={qualityTone(run.metrics.mrr)} />
                        </div>
                      </td>
                      <td><span className={`pill ${staleTone(run.metrics.staleHitRate)}`}>{percent(run.metrics.staleHitRate)}</span></td>
                      <td><span className={`pill ${latencyTone(run.metrics.p95LatencyMs)}`}>{Math.round(run.metrics.p95LatencyMs)}ms</span></td>
                      <td>
                        <small>{formatDate(run.createdAt)}</small>
                        <small>{run.id}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel">
              <h2>Audit Log</h2>
              <table>
                <thead>
                  <tr><th>Action</th><th>Resource</th></tr>
                </thead>
                <tbody>
                  {data.auditLogs.length === 0 ? <EmptyRow span={2} label="No audit events" /> : data.auditLogs.slice(0, 12).map((audit) => (
                    <tr key={audit.id}>
                      <td>{audit.action}<small>{audit.createdAt}</small></td>
                      <td>{audit.resourceType}{audit.resourceId ? <small>{audit.resourceId}</small> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "risk" }) {
  return (
    <span className={`metricPill ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function Status({ status, risks }: { status: string; risks: string[] }) {
  return (
    <div className="statusCell">
      <span className={status === "active" || status === "confirmed" ? "pill ok" : "pill"}>{status}</span>
      {risks.map((risk) => <span className="pill risk" key={risk}>{risk}</span>)}
    </div>
  );
}

function EmptyRow({ span, label }: { span: number; label: string }) {
  return <tr><td className="empty" colSpan={span}>{label}</td></tr>;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function qualityTone(value: number): "ok" | "warn" | "risk" {
  if (value >= 0.8) {
    return "ok";
  }
  if (value >= 0.5) {
    return "warn";
  }
  return "risk";
}

function staleTone(value: number): "risk" | "warn" | "ok" {
  if (value >= 0.3) {
    return "risk";
  }
  if (value >= 0.15) {
    return "warn";
  }
  return "ok";
}

function latencyTone(value: number): "risk" | "warn" | "ok" {
  if (value > 120) {
    return "risk";
  }
  if (value > 60) {
    return "warn";
  }
  return "ok";
}

function feedbackToneClass(feedback: TraceFeedback): "ok" | "warn" | "risk" {
  if (feedback === "useful") {
    return "ok";
  }
  if (feedback === "outdated") {
    return "warn";
  }
  return "risk";
}

function evalVerdict(run: EvalRun) {
  const score = scoreEval(run);
  if (score >= 230) {
    return "strong retrieval fit";
  }
  if (score >= 170) {
    return "usable with review";
  }
  return "needs tuning";
}

function scoreEval(run: EvalRun) {
  return Math.round(
    run.metrics.recallAt5 * 100
      + run.metrics.precisionAt5 * 80
      + run.metrics.mrr * 70
      - run.metrics.staleHitRate * 90
      - run.metrics.p95LatencyMs / 6
  );
}

function describeMemoryAction(mode: MemoryActionMode) {
  if (mode === "edit") {
    return {
      title: "Edit memory text",
      hint: "Use in-place edits for small factual corrections without changing the memory lineage.",
      submitLabel: "Save Edit",
      reasonPlaceholder: ""
    };
  }
  if (mode === "supersede") {
    return {
      title: "Supersede with a new version",
      hint: "Create a new durable record when the fact changed and keep the previous memory as historical context.",
      submitLabel: "Create Successor",
      reasonPlaceholder: "why this memory changed"
    };
  }
  if (mode === "reject") {
    return {
      title: "Reject review item",
      hint: "Candidate memories are soft-deleted on rejection, so capture why they should not become durable context.",
      submitLabel: "Reject Memory",
      reasonPlaceholder: "why this should not be kept"
    };
  }
  return {
    title: "Soft forget memory",
    hint: "Soft forget marks the memory deleted without hard-removing it from the audit trail.",
    submitLabel: "Soft Forget",
    reasonPlaceholder: "why this should be retired"
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function errorMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }
  return JSON.stringify(value, null, 2);
}
