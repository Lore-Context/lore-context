import type { AuditLog, ContextTrace, EvalMetrics, MemoryRecord } from "@lore/shared";

export interface WebShellInfo {
  name: "lore-dashboard";
  routes: string[];
  panels: string[];
}

export interface DashboardSnapshot {
  memories: MemoryRecord[];
  traces: ContextTrace[];
  audits?: AuditLog[];
  evalRuns?: EvalRunSnapshot[];
  integrationStatus: "ok" | "degraded" | "unknown";
  evalScore?: number;
}

export interface EvalRunSnapshot {
  id: string;
  provider: string;
  metrics: EvalMetrics;
  status: "completed";
  createdAt: string;
}

export function getWebShellInfo(): WebShellInfo {
  return {
    name: "lore-dashboard",
    routes: ["/dashboard", "/memories", "/traces", "/eval", "/settings/integrations"],
    panels: ["memory-health", "recent-traces", "eval-score", "integration-status"]
  };
}

export function summarizeDashboard(snapshot: DashboardSnapshot) {
  const active = snapshot.memories.filter((memory) => memory.status === "active" || memory.status === "confirmed");
  const stale = snapshot.memories.filter((memory) => memory.status === "expired" || memory.validUntil);
  const riskAlerts = snapshot.memories.filter((memory) => memory.riskTags.length > 0);
  const reviewQueue = snapshot.memories.filter((memory) => memory.status === "candidate");
  const traceFeedback = snapshot.traces.filter((trace) => trace.feedback);

  return {
    totalMemories: snapshot.memories.length,
    activeMemories: active.length,
    staleCandidates: stale.length,
    reviewQueue: reviewQueue.length,
    riskAlerts: riskAlerts.length,
    recentContextQueries: snapshot.traces.length,
    traceFeedback: traceFeedback.length,
    recentAudits: snapshot.audits?.length ?? 0,
    integrationStatus: snapshot.integrationStatus,
    evalScore: snapshot.evalScore ?? snapshot.evalRuns?.[0]?.metrics.recallAt5 ?? null
  };
}

export function renderDashboardHtml(snapshot: DashboardSnapshot): string {
  const summary = summarizeDashboard(snapshot);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lore Context Dashboard</title>
    <style>
      :root { color-scheme: light; --line: #d8dee8; --muted: #667085; --text: #111827; --panel: #ffffff; --bg: #f5f7fb; --blue: #2563eb; --green: #047857; --amber: #b45309; --red: #b42318; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
      main { max-width: 1240px; margin: 0 auto; padding: 28px 24px 40px; }
      header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 20px; }
      h1 { font-size: 28px; margin: 0; letter-spacing: 0; }
      h2 { font-size: 15px; margin: 0 0 12px; letter-spacing: 0; }
      label { display: block; color: #344054; font-size: 12px; font-weight: 650; margin-bottom: 6px; }
      input, select, textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 9px 10px; font: inherit; background: white; color: var(--text); }
      textarea { min-height: 84px; resize: vertical; }
      button, .link-button { border: 0; border-radius: 6px; background: var(--blue); color: white; cursor: pointer; font: inherit; font-weight: 700; padding: 9px 12px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; }
      button.secondary, .link-button.secondary { background: #334155; }
      button.subtle { background: #eef2ff; color: #1d4ed8; }
      button.danger { background: #fef3f2; color: var(--red); }
      button.small { min-height: 30px; padding: 5px 8px; font-size: 12px; }
      .topline { color: var(--muted); font-size: 13px; margin-top: 4px; }
      .status { font-weight: 800; color: ${summary.integrationStatus === "ok" ? "var(--green)" : "var(--amber)"}; white-space: nowrap; }
      .metrics { display: grid; grid-template-columns: repeat(6, minmax(135px, 1fr)); gap: 10px; margin-bottom: 16px; }
      .metric { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; min-height: 82px; }
      .label { color: var(--muted); font-size: 12px; margin-bottom: 7px; }
      .value { font-size: 26px; font-weight: 800; line-height: 1; }
      .workspace { display: grid; grid-template-columns: minmax(320px, 0.85fr) minmax(520px, 1.4fr); gap: 14px; align-items: start; }
      .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
      .stack { display: grid; gap: 12px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .result { margin: 12px 0 0; padding: 12px; min-height: 84px; max-height: 260px; overflow: auto; border: 1px solid #c7d2fe; border-radius: 6px; background: #eef2ff; color: #1e293b; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
      .tables { display: grid; gap: 14px; }
      .inline-actions { display: flex; gap: 6px; flex-wrap: wrap; }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
      th, td { padding: 10px 12px; border-bottom: 1px solid #e8edf5; text-align: left; vertical-align: top; font-size: 13px; }
      th { background: #edf2f7; color: #344054; font-size: 12px; }
      tr:last-child td { border-bottom: 0; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
      .pill { display: inline-block; border-radius: 999px; padding: 3px 7px; background: #ecfdf3; color: var(--green); font-size: 12px; font-weight: 750; }
      .pill.warn { background: #fffbeb; color: var(--amber); }
      .pill.risk { background: #fef3f2; color: var(--red); }
      .empty { color: var(--muted); text-align: center; padding: 18px; }
      @media (max-width: 900px) {
        main { padding: 20px 14px 32px; }
        header { flex-direction: column; }
        .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .workspace { grid-template-columns: 1fr; }
        .row { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Lore Context</h1>
          <div class="topline">Local context control plane</div>
        </div>
        <div class="status">agentmemory: ${escapeHtml(summary.integrationStatus)}</div>
      </header>
      <section class="metrics">
        ${metricCard("Total memories", summary.totalMemories)}
        ${metricCard("Active memories", summary.activeMemories)}
        ${metricCard("Review queue", summary.reviewQueue)}
        ${metricCard("Risk alerts", summary.riskAlerts)}
        ${metricCard("Recent context queries", summary.recentContextQueries)}
        ${metricCard("Recall@5", summary.evalScore === null ? "n/a" : `${Math.round(summary.evalScore * 100)}%`)}
      </section>
      <section class="workspace">
        <div class="stack">
          <section class="panel">
            <h2>Context Query</h2>
            <form id="context-form" class="stack">
              <div class="row">
                <div><label for="context-project">Project</label><input id="context-project" name="project_id" value="demo" /></div>
                <div><label for="context-budget">Token budget</label><input id="context-budget" name="token_budget" type="number" min="100" step="100" value="1200" /></div>
              </div>
              <div><label for="context-query">Query</label><textarea id="context-query" name="query">继续 Lore agent workflow</textarea></div>
              <div class="actions"><button type="submit">Query</button><button class="subtle" type="button" id="sync-button">Sync agentmemory</button><a class="link-button secondary" href="/v1/memory/export?format=json">Export JSON</a></div>
            </form>
            <pre id="context-result" class="result"></pre>
          </section>
          <section class="panel">
            <h2>Memory Write</h2>
            <form id="memory-form" class="stack">
              <div><label for="memory-content">Memory</label><textarea id="memory-content" name="content"></textarea></div>
              <div class="row">
                <div><label for="memory-type">Type</label><select id="memory-type" name="memory_type"><option value="project_rule">project_rule</option><option value="preference">preference</option><option value="task_state">task_state</option><option value="procedure">procedure</option><option value="episode">episode</option></select></div>
                <div><label for="memory-scope">Scope</label><select id="memory-scope" name="scope"><option value="project">project</option><option value="repo">repo</option><option value="user">user</option><option value="team">team</option><option value="org">org</option></select></div>
              </div>
              <div><label for="memory-project">Project</label><input id="memory-project" name="project_id" value="demo" /></div>
              <div class="actions"><button type="submit">Save Memory</button></div>
            </form>
          </section>
          <section class="panel">
            <h2>Eval Playground</h2>
            <form id="eval-form" class="stack">
              <div><label for="eval-provider">Provider</label><input id="eval-provider" name="provider" value="lore-local" /></div>
              <div><label for="eval-dataset">Dataset JSON</label><textarea id="eval-dataset" name="dataset">${escapeHtml(defaultEvalDataset())}</textarea></div>
              <div class="actions"><button type="submit">Run Eval</button></div>
            </form>
          </section>
        </div>
        <div class="tables">
          <section>
            <h2>Memory Inventory</h2>
            <table>
              <thead><tr><th>Memory</th><th>Type</th><th>Scope</th><th>Status</th><th>Used</th><th>Risks</th><th>Action</th></tr></thead>
              <tbody>${renderMemoryRows(snapshot.memories)}</tbody>
            </table>
          </section>
          <section>
            <h2>Review Queue</h2>
            <table>
              <thead><tr><th>Memory</th><th>Risk</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>${renderReviewRows(snapshot.memories)}</tbody>
            </table>
          </section>
          <section>
            <h2>Recent Traces</h2>
            <table>
              <thead><tr><th>Trace</th><th>Query</th><th>Route</th><th>Latency</th><th>Feedback</th><th>Action</th></tr></thead>
              <tbody>${renderTraceRows(snapshot.traces)}</tbody>
            </table>
          </section>
          <section>
            <h2>Recent Eval Runs</h2>
            <table>
              <thead><tr><th>Run</th><th>Provider</th><th>Recall@5</th><th>MRR</th><th>Stale</th><th>Latency</th></tr></thead>
              <tbody>${renderEvalRows(snapshot.evalRuns ?? [])}</tbody>
            </table>
          </section>
          <section>
            <h2>Recent Audits</h2>
            <table>
              <thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>Metadata</th></tr></thead>
              <tbody>${renderAuditRows(snapshot.audits ?? [])}</tbody>
            </table>
          </section>
        </div>
      </section>
    </main>
    <script>
      const result = document.getElementById("context-result");
      const render = (value) => { result.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2); };
      const request = async (path, options = {}) => {
        const headers = new Headers(options.headers || {});
        const apiKey = localStorage.getItem("lore_api_key");
        if (apiKey) headers.set("authorization", "Bearer " + apiKey);
        const response = await fetch(path, { ...options, headers });
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};
        if (!response.ok) throw payload;
        return payload;
      };
      document.getElementById("context-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        data.token_budget = Number(data.token_budget || 1200);
        try {
          const payload = await request("/v1/context/query", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
          render(payload.contextBlock || payload);
        } catch (error) { render(error); }
      });
      document.getElementById("memory-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
          await request("/v1/memory/write", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
          location.reload();
        } catch (error) { render(error); }
      });
      document.getElementById("eval-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
          const dataset = JSON.parse(String(data.dataset || "{}"));
          render(await request("/v1/eval/run", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ provider: data.provider || "lore-local", dataset })
          }));
          setTimeout(() => location.reload(), 250);
        } catch (error) { render(error); }
      });
      document.getElementById("sync-button").addEventListener("click", async () => {
        try { render(await request("/v1/integrations/agentmemory/sync", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })); }
        catch (error) { render(error); }
      });
      document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement) || !target.dataset.memoryId) return;
        if (target.dataset.memoryAction === "edit") {
          const content = window.prompt("Edit memory", target.dataset.memoryContent || "");
          if (!content) return;
          try {
            await request("/v1/memory/" + encodeURIComponent(target.dataset.memoryId), {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ content })
            });
            location.reload();
          } catch (error) { render(error); }
          return;
        }
        if (target.dataset.memoryAction === "supersede") {
          const content = window.prompt("New memory version", target.dataset.memoryContent || "");
          if (!content) return;
          const reason = window.prompt("Reason", "newer project context") || "dashboard supersede";
          try {
            await request("/v1/memory/" + encodeURIComponent(target.dataset.memoryId) + "/supersede", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ content, reason })
            });
            location.reload();
          } catch (error) { render(error); }
          return;
        }
        if (!target.dataset.reviewAction) return;
        const action = target.dataset.reviewAction;
        const reason = action === "reject" ? window.prompt("Reject reason", "not durable context") : "operator approved";
        if (action === "reject" && !reason) return;
        try {
          await request("/v1/governance/memory/" + encodeURIComponent(target.dataset.memoryId) + "/" + action, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason, reviewer: "dashboard" })
          });
          location.reload();
        } catch (error) { render(error); }
      });
      document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement) || !target.dataset.traceId || !target.dataset.traceFeedback) return;
        try {
          await request("/v1/traces/" + encodeURIComponent(target.dataset.traceId) + "/feedback", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ feedback: target.dataset.traceFeedback, note: "dashboard feedback" })
          });
          location.reload();
        } catch (error) { render(error); }
      });
    </script>
  </body>
</html>`;
}

function metricCard(label: string, value: number | string): string {
  return `<div class="metric"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(String(value))}</div></div>`;
}

function renderMemoryRows(memories: MemoryRecord[]): string {
  if (memories.length === 0) {
    return `<tr><td class="empty" colspan="7">No memories</td></tr>`;
  }

  return memories
    .slice(0, 20)
    .map(
      (memory) =>
        `<tr><td>${escapeHtml(memory.content)}</td><td>${memory.memoryType}</td><td>${memory.scope}</td><td>${statusPill(memory.status)}</td><td><span class="mono">${memory.useCount}</span>${memory.lastUsedAt ? `<div class="label">${escapeHtml(memory.lastUsedAt)}</div>` : ""}</td><td>${riskPills(memory.riskTags)}</td><td><div class="inline-actions"><button class="small subtle" data-memory-action="edit" data-memory-id="${escapeHtml(memory.id)}" data-memory-content="${escapeHtml(memory.content)}">Edit</button><button class="small secondary" data-memory-action="supersede" data-memory-id="${escapeHtml(memory.id)}" data-memory-content="${escapeHtml(memory.content)}">Supersede</button></div></td></tr>`
    )
    .join("");
}

function renderTraceRows(traces: ContextTrace[]): string {
  if (traces.length === 0) {
    return `<tr><td class="empty" colspan="6">No traces</td></tr>`;
  }

  return traces
    .slice(-10)
    .reverse()
    .map(
      (trace) =>
        `<tr><td class="mono" title="${escapeHtml(trace.id)}">${escapeHtml(shortId(trace.id))}</td><td>${escapeHtml(trace.query)}</td><td>${escapeHtml(trace.route.reason)}</td><td>${trace.latencyMs}ms</td><td>${trace.feedback ? statusPill(trace.feedback) : ""}${trace.warnings.length ? `<div>${riskPills(trace.warnings)}</div>` : ""}</td><td><div class="inline-actions"><button class="small subtle" data-trace-id="${escapeHtml(trace.id)}" data-trace-feedback="useful">Useful</button><button class="small danger" data-trace-id="${escapeHtml(trace.id)}" data-trace-feedback="wrong">Wrong</button><button class="small secondary" data-trace-id="${escapeHtml(trace.id)}" data-trace-feedback="outdated">Outdated</button></div></td></tr>`
    )
    .join("");
}

function renderReviewRows(memories: MemoryRecord[]): string {
  const reviewItems = memories.filter((memory) => memory.status === "candidate");
  if (reviewItems.length === 0) {
    return `<tr><td class="empty" colspan="4">No review items</td></tr>`;
  }

  return reviewItems
    .slice(0, 20)
    .map(
      (memory) =>
        `<tr><td>${escapeHtml(memory.content)}</td><td>${riskPills(memory.riskTags)}</td><td>${statusPill(memory.status)}</td><td><div class="inline-actions"><button class="small" data-review-action="approve" data-memory-id="${escapeHtml(memory.id)}">Approve</button><button class="small danger" data-review-action="reject" data-memory-id="${escapeHtml(memory.id)}">Reject</button></div></td></tr>`
    )
    .join("");
}

function renderAuditRows(audits: AuditLog[]): string {
  if (audits.length === 0) {
    return `<tr><td class="empty" colspan="4">No audit events</td></tr>`;
  }

  return audits
    .slice(-10)
    .reverse()
    .map(
      (audit) =>
        `<tr><td class="mono">${escapeHtml(audit.createdAt)}</td><td>${escapeHtml(audit.action)}</td><td>${escapeHtml(audit.resourceType)}${audit.resourceId ? ` <span class="mono">${escapeHtml(shortId(audit.resourceId))}</span>` : ""}</td><td class="mono">${escapeHtml(JSON.stringify(audit.metadata))}</td></tr>`
    )
    .join("");
}

function renderEvalRows(evalRuns: EvalRunSnapshot[]): string {
  if (evalRuns.length === 0) {
    return `<tr><td class="empty" colspan="6">No eval runs</td></tr>`;
  }

  return evalRuns
    .slice(0, 10)
    .map(
      (run) =>
        `<tr><td class="mono" title="${escapeHtml(run.id)}">${escapeHtml(shortId(run.id))}</td><td>${escapeHtml(run.provider)}</td><td>${formatPercent(run.metrics.recallAt5)}</td><td>${formatPercent(run.metrics.mrr)}</td><td>${formatPercent(run.metrics.staleHitRate)}</td><td>${Math.round(run.metrics.p95LatencyMs)}ms</td></tr>`
    )
    .join("");
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function defaultEvalDataset(): string {
  return JSON.stringify(
    {
      sessions: [
        {
          sessionId: "s1",
          messages: [{ role: "user", content: "Lore should keep project memory auditable." }]
        }
      ],
      questions: [{ question: "What should Lore keep auditable?", goldSessionIds: ["s1"] }]
    },
    null,
    2
  );
}

function shortId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 15)}...` : value;
}

function statusPill(status: string): string {
  const className = status === "active" || status === "confirmed" ? "pill" : "pill warn";
  return `<span class="${className}">${escapeHtml(status)}</span>`;
}

function riskPills(values: string[]): string {
  if (values.length === 0) {
    return "";
  }
  return values.map((value) => `<span class="pill risk">${escapeHtml(value)}</span>`).join(" ");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
