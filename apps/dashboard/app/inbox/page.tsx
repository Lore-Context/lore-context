"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerConsole } from "../../components/customer-console";
import { DataCard, EmptyState, FilterBar, PageHeader, StatCard } from "../../components/dashboard-shell";
import { createBrowserDashboardApiClient, fetchInboxData, routeResultMessage } from "../../lib/api-client";
import type { InboxData, MemoryInboxItem, MemoryInboxStatus, RouteResult } from "../../lib/contracts";
import styles from "./inbox.module.css";

type InboxRouteState = RouteResult<InboxData> | { state: "loading" };
type RiskFilter = "all" | MemoryInboxItem["risk"];
type StatusFilter = "all" | MemoryInboxStatus;
type ReviewIntent = "approve" | "edit" | "reject" | "delete";

export default function InboxPage() {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [intentById, setIntentById] = useState<Record<string, ReviewIntent>>({});
  const [inboxResult, setInboxResult] = useState<InboxRouteState>({ state: "loading" });
  const client = useMemo(() => createBrowserDashboardApiClient(), []);
  const refresh = useCallback(async () => {
    try {
      setInboxResult(await fetchInboxData(client));
    } catch (error) {
      setInboxResult({ state: "error", error: errorMessage(error) || "Memory inbox request failed" });
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const data = routeData(inboxResult);
  const items = data?.items ?? [];
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const riskMatch = riskFilter === "all" || item.risk === riskFilter;
        const statusMatch = statusFilter === "all" || item.status === statusFilter;
        return riskMatch && statusMatch;
      }),
    [items, riskFilter, statusFilter]
  );

  return (
    <CustomerConsole activeRoute="inbox" session={null} serviceLabel={serviceLabel(inboxResult)} serviceTone={serviceTone(inboxResult)}>
      <PageHeader
        eyebrow="Memory Inbox"
        title="Review suggested memory"
        description="Inspect candidate memories before they become reusable context. Actions shown here prepare review requests until a safe endpoint contract is present."
        meta={
          <>
            <span className={styles.badge}>{routeLabel(inboxResult)}</span>
            <span className={styles.badge}>{items.length} candidates</span>
          </>
        }
        actions={<button type="button" className="muted" onClick={() => void refresh()} disabled={inboxResult.state === "loading"}>Refresh</button>}
      />

      <section className={styles.statsGrid} aria-label="Inbox summary">
        <StatCard label="Needs review" value={items.filter(needsReview).length} detail="Pending, sensitive, conflicted, or explicit review-required candidates" tone={items.some(needsReview) ? "warn" : "ok"} />
        <StatCard label="High risk" value={items.filter((item) => item.risk === "high").length} detail="Held for careful review before reuse" tone={items.some((item) => item.risk === "high") ? "risk" : "neutral"} />
        <StatCard label="Average confidence" value={items.length ? percent(avg(items.map((item) => item.confidence))) : "n/a"} detail="Model confidence across visible candidates" tone="neutral" />
      </section>

      {inboxResult.state === "loading" ? (
        <EmptyState title="Loading inbox" description="Checking your session before loading memory candidates." />
      ) : null}

      {inboxResult.state === "config-missing" || inboxResult.state === "error" || inboxResult.state === "unauthorized" ? (
        <EmptyState title="Inbox is not configured" description={routeResultMessage(inboxResult)} tone={inboxResult.state === "unauthorized" ? "warn" : "risk"} />
      ) : null}

      {data && items.length === 0 ? (
        <EmptyState title="No suggested memory yet" description="Connect an app or run capture first. New candidates will appear here before they are saved." />
      ) : null}

      {items.length > 0 ? (
        <DataCard
          title="Candidate queue"
          description="Filter by review state or risk, then mark the intended decision without changing stored memory."
        >
          <FilterBar
            actions={
              <button type="button" className="muted" onClick={() => { setRiskFilter("all"); setStatusFilter("all"); }}>
                Clear filters
              </button>
            }
          >
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                <option value="all">All statuses</option>
                {unique(items.map((item) => item.status)).map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label>
              Risk
              <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}>
                <option value="all">All risks</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </FilterBar>

          {filteredItems.length ? (
            <div className={styles.candidateList}>
              {filteredItems.map((item) => (
                <article key={item.id} className={styles.candidateCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.eyebrow}>{item.type} · {item.scope}</span>
                      <h2>{item.candidate}</h2>
                    </div>
                    <span className={`${styles.riskBadge} ${styles[item.risk]}`}>{item.risk} risk</span>
                  </div>
                  <dl className={styles.metaGrid}>
                    <div>
                      <dt>Status</dt>
                      <dd>{statusLabel(item.status)}</dd>
                    </div>
                    <div>
                      <dt>Confidence</dt>
                      <dd>{percent(item.confidence)}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{item.source}</dd>
                    </div>
                  </dl>
                  <p className={styles.reason}>{item.reason}</p>
                  <div className={styles.actions} aria-label={`Review actions for ${item.id}`}>
                    <button type="button" onClick={() => setIntentById({ ...intentById, [item.id]: "approve" })}>Prepare approve</button>
                    <button type="button" className="muted" onClick={() => setIntentById({ ...intentById, [item.id]: "edit" })}>Prepare edit</button>
                    <button type="button" className="warn" onClick={() => setIntentById({ ...intentById, [item.id]: "reject" })}>Prepare reject</button>
                    <button type="button" className="danger" onClick={() => setIntentById({ ...intentById, [item.id]: "delete" })}>Prepare delete</button>
                  </div>
                  {intentById[item.id] ? (
                    <div className={styles.intentNote}>
                      {intentLabel(intentById[item.id])}. No live mutation was sent.
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No candidates match these filters" description="Clear filters to return to the full review queue." />
          )}
        </DataCard>
      ) : null}
    </CustomerConsole>
  );
}

function routeData(result: InboxRouteState): InboxData | null {
  return result.state === "success" || result.state === "empty" ? result.data : null;
}

function needsReview(item: MemoryInboxItem) {
  return ["pending", "sensitive", "conflict", "review_required", "source-paused"].includes(item.status);
}

function unique<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function avg(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function routeLabel(result: InboxRouteState) {
  if (result.state === "loading") return "Loading";
  if (result.state === "success") return "Live data";
  if (result.state === "empty") return "Empty";
  if (result.state === "config-missing") return "Config missing";
  if (result.state === "unauthorized") return "Unauthorized";
  return "Error";
}

function serviceLabel(result: InboxRouteState) {
  if (result.state === "loading") return "Checking inbox";
  return result.state === "success" || result.state === "empty" ? "Review ready" : "Review unavailable";
}

function serviceTone(result: InboxRouteState) {
  if (result.state === "loading") return "warn";
  return result.state === "success" || result.state === "empty" ? "ok" : "warn";
}

function statusLabel(status: MemoryInboxStatus) {
  return status.replace(/[-_]/g, " ");
}

function intentLabel(intent: ReviewIntent) {
  if (intent === "approve") return "Approve request prepared";
  if (intent === "edit") return "Edit request prepared";
  if (intent === "reject") return "Reject request prepared";
  return "Delete request prepared";
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
