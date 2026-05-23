"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerConsole } from "../../components/customer-console";
import { DataCard, EmptyState, PageHeader, StatCard, TableWrapper } from "../../components/dashboard-shell";
import { createBrowserDashboardApiClient, fetchEvidenceData, routeResultMessage } from "../../lib/api-client";
import type { BetaLedgerItem, BetaLedgerTrace, EvidenceData, EvidenceLedger, RouteResult } from "../../lib/contracts";

type EvidenceRouteState = RouteResult<EvidenceData> | { state: "loading" };

export default function EvidencePage() {
  const [result, setResult] = useState<EvidenceRouteState>({ state: "loading" });
  const client = useMemo(() => createBrowserDashboardApiClient(), []);
  const refresh = useCallback(async () => {
    try {
      setResult(await fetchEvidenceData(client));
    } catch (error) {
      setResult({ state: "error", error: errorMessage(error) || "Evidence ledger request failed" });
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const data = result.state === "success" || result.state === "empty" ? result.data : null;

  return (
    <CustomerConsole activeRoute="evidence" session={null} serviceLabel={serviceLabel(result)} serviceTone={serviceTone(result)}>
      <PageHeader
        eyebrow="Evidence"
        title="Recall evidence ledger"
        description="Inspect what Lore retrieved, used, ignored, blocked, marked stale, or held back as risky before customer-visible recall."
        meta={<span className={`statusBadge ${result.state === "config-missing" ? "warn" : "muted"}`}>{routeLabel(result.state)}</span>}
        actions={<button type="button" className="muted" onClick={() => void refresh()} disabled={result.state === "loading"}>Refresh</button>}
      />

      {result.state === "loading" ? (
        <EmptyState title="Loading evidence" description="Checking your session before loading recall traces." />
      ) : null}

      {result.state === "config-missing" || result.state === "error" || result.state === "unauthorized" ? (
        <EmptyState title="Evidence is not configured" description={routeResultMessage(result)} tone={result.state === "unauthorized" ? "warn" : "risk"} />
      ) : null}

      {data ? <EvidenceContent data={data} /> : null}
    </CustomerConsole>
  );
}

function EvidenceContent({ data }: { data: EvidenceData }) {
  const sample = data.sampleTrace;
  const ledgerCount = data.ledgers.length;
  const items = sample?.items ?? [];
  const used = items.filter((item) => item.state === "used" || item.state === "retrieved").length;
  const heldBack = items.filter((item) => item.state === "risky" || item.state === "ignored" || item.state === "stale" || item.state === "conflicting").length;

  if (!sample && ledgerCount === 0) {
    return (
      <EmptyState
        title="No evidence yet"
        description="Run a recall test or connect an app before Lore can show retrieved memories and ledger decisions."
      />
    );
  }

  return (
    <div className="overviewStack">
      <section className="overviewStats" aria-label="Evidence summary">
        <StatCard label="Trace" value={sample?.agent ?? "None"} detail={sample?.query ?? "No recall query available"} />
        <StatCard label="Used context" value={used} detail="Retrieved or used in the candidate answer" tone="ok" trend="Allowed" />
        <StatCard label="Held back" value={heldBack} detail="Ignored, stale, conflicting, or risky records" tone={heldBack > 0 ? "warn" : "ok"} trend="Guarded" />
        <StatCard label="Tokens" value={sample ? `${sample.usedTokens}/${sample.tokenBudget}` : "0"} detail="Recall context budget" />
      </section>

      <section className="overviewGrid">
        <DataCard
          title="Recall tester"
          description="Live ledger state for checking what a customer answer would cite before using it."
          meta={<span className="statusBadge muted">Read-only beta</span>}
        >
          {sample ? <SampleTrace trace={sample} /> : <EmptyState title="No sample trace" description="No live recall ledger is available yet." />}
        </DataCard>

        <DataCard
          title="Decision states"
          description="How Lore classifies retrieved memories before composing or withholding context."
        >
          <div className="controlStack">
            <StateGuide label="Used" tone="ok" detail="Allowed into the answer because it directly supports the request." />
            <StateGuide label="Ignored" tone="neutral" detail="Retrieved but skipped because fresher or stronger evidence exists." />
            <StateGuide label="Blocked" tone="risk" detail="Unavailable, deleted, or withheld by policy and never sent to the agent." />
            <StateGuide label="Stale" tone="warn" detail="Retrieved record appears outdated and needs newer confirmation." />
            <StateGuide label="Risky" tone="risk" detail="Sensitive or review-required content held back until explicit approval." />
          </div>
        </DataCard>
      </section>

      {items.length > 0 ? (
        <TableWrapper label="Evidence ledger" description="Per-memory recall disposition for the current sample query.">
          <table>
            <thead>
              <tr>
                <th>Memory</th>
                <th>Disposition</th>
                <th>Reason</th>
                <th>Guardrail</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <LedgerItemRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </TableWrapper>
      ) : null}

      {data.ledgers.length > 0 ? (
        <TableWrapper label="API ledgers" description="Live ledger rows when the backend endpoint supplies evidence records.">
          <table>
            <thead>
              <tr>
                <th>Trace</th>
                <th>Summary</th>
                <th>Rows</th>
              </tr>
            </thead>
            <tbody>
              {data.ledgers.map((ledger) => (
                <ApiLedgerRow key={ledger.traceId} ledger={ledger} />
              ))}
            </tbody>
          </table>
        </TableWrapper>
      ) : null}
    </div>
  );
}

function SampleTrace({ trace }: { trace: BetaLedgerTrace }) {
  return (
    <div className="connectCommand">
      <div className="commandHeader">
        <div>
          <strong>{trace.query}</strong>
          <small>{trace.agent} sample trace</small>
        </div>
        <span className="pill neutral">{trace.usedTokens} tokens</span>
      </div>
      {trace.warnings.length > 0 ? (
        <div className="ledgerWarnings">
          {trace.warnings.map((warning) => (
            <span className="pill warn" key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}
      <code>Recall tester is read-only in beta. It shows live ledger decisions without mutating production memory.</code>
    </div>
  );
}

function LedgerItemRow({ item }: { item: BetaLedgerItem }) {
  const tone = itemTone(item.state);
  return (
    <tr>
      <td>
        <strong>{item.memory}</strong>
        <small>{item.id}</small>
      </td>
      <td><span className={`pill ${tone}`}>{itemLabel(item.state)}</span></td>
      <td>{item.reason}</td>
      <td>{item.warning ? <span className="pill risk">{item.warning}</span> : <span className="pill ok">clear</span>}</td>
    </tr>
  );
}

function ApiLedgerRow({ ledger }: { ledger: EvidenceLedger }) {
  return (
    <tr>
      <td>{ledger.traceId}</td>
      <td>
        <div className="evidenceSummary">
          <span className="metricPill ok"><span>used</span><strong>{ledger.summary.composed}</strong></span>
          <span className="metricPill warn"><span>ignored</span><strong>{ledger.summary.ignored}</strong></span>
          <span className="metricPill risk"><span>warnings</span><strong>{ledger.summary.warnings}</strong></span>
          <small>{ledger.summary.riskTags.join(", ") || "No risk tags"}</small>
        </div>
      </td>
      <td>{ledger.rows.length}</td>
    </tr>
  );
}

function StateGuide({ label, tone, detail }: { label: string; tone: "ok" | "warn" | "risk" | "neutral"; detail: string }) {
  return (
    <div className="controlRow">
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
      <span className={`pill ${tone}`}>{label}</span>
    </div>
  );
}

function itemLabel(state: BetaLedgerItem["state"]) {
  if (state === "retrieved") return "used";
  if (state === "missing" || state === "deleted") return "blocked";
  return state;
}

function itemTone(state: BetaLedgerItem["state"]) {
  if (state === "used" || state === "retrieved") return "ok";
  if (state === "ignored" || state === "stale") return "warn";
  if (state === "risky" || state === "conflicting" || state === "missing" || state === "deleted") return "risk";
  return "neutral";
}

function serviceLabel(result: EvidenceRouteState) {
  if (result.state === "loading") return "Checking evidence";
  return result.state === "config-missing" ? "Preview unavailable" : "Evidence ready";
}

function serviceTone(result: EvidenceRouteState) {
  if (result.state === "loading") return "warn";
  return result.state === "config-missing" ? "warn" : "ok";
}

function routeLabel(state: EvidenceRouteState["state"]) {
  if (state === "loading") return "Loading";
  if (state === "success") return "Live data";
  if (state === "empty") return "Empty";
  if (state === "unauthorized") return "Unauthorized";
  if (state === "error") return "Error";
  return "Config missing";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; error?: unknown };
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  return "";
}
