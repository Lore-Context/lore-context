"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerConsole } from "../../components/customer-console";
import { DataCard, EmptyState, FilterBar, PageHeader, StatCard, TableWrapper } from "../../components/dashboard-shell";
import { createBrowserDashboardApiClient, fetchSourcesData, routeResultMessage } from "../../lib/api-client";
import type { CloudSource, RouteResult, SourceSyncStatus, SourcesData } from "../../lib/contracts";
import styles from "./sources.module.css";

type SourcesRouteState = RouteResult<SourcesData> | { state: "loading" };
type SourceFilter = "all" | SourceSyncStatus;
type SourceIntent = "pause" | "resume" | "delete";

export default function SourcesPage() {
  const [statusFilter, setStatusFilter] = useState<SourceFilter>("all");
  const [intentById, setIntentById] = useState<Record<string, SourceIntent>>({});
  const [sourcesResult, setSourcesResult] = useState<SourcesRouteState>({ state: "loading" });
  const client = useMemo(() => createBrowserDashboardApiClient(), []);
  const refresh = useCallback(async () => {
    try {
      setSourcesResult(await fetchSourcesData(client));
    } catch (error) {
      setSourcesResult({ state: "error", error: errorMessage(error) || "Sources request failed" });
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const data = routeData(sourcesResult);
  const sources = data?.sources ?? [];
  const visibleSources = useMemo(
    () => sources.filter((source) => statusFilter === "all" || source.status === statusFilter),
    [sources, statusFilter]
  );

  return (
    <CustomerConsole activeRoute="sources" session={null} serviceLabel={serviceLabel(sourcesResult)} serviceTone={serviceTone(sourcesResult)}>
      <PageHeader
        eyebrow="Sources"
        title="Source sync"
        description="Monitor connected source sync status, queued sessions, and review-gated pause, resume, or delete controls."
        meta={
          <>
            <span className={styles.badge}>{routeLabel(sourcesResult)}</span>
            <span className={styles.badge}>{sources.length} sources</span>
          </>
        }
        actions={<button type="button" className="muted" onClick={() => void refresh()} disabled={sourcesResult.state === "loading"}>Refresh</button>}
      />

      <section className={styles.statsGrid} aria-label="Source summary">
        <StatCard label="Healthy" value={sources.filter((source) => source.status === "healthy").length} detail="Sources with no pending sync issues" tone="ok" />
        <StatCard label="Syncing" value={sources.filter((source) => source.status === "syncing").length} detail="Sources currently processing jobs" tone={sources.some((source) => source.status === "syncing") ? "warn" : "neutral"} />
        <StatCard label="Pending jobs" value={sumKnown(sources.map((source) => source.pendingJobs))} detail="Queued sync work across visible sources" tone={sources.some((source) => (source.pendingJobs ?? 0) > 0) ? "warn" : "ok"} />
        <StatCard label="Sessions" value={sumKnown(sources.map((source) => source.sessions))} detail="Authorized sessions summarized for memory review" tone="neutral" />
      </section>

      {sourcesResult.state === "loading" ? (
        <EmptyState title="Loading sources" description="Checking your session before loading connected sources." />
      ) : null}

      {sourcesResult.state === "config-missing" || sourcesResult.state === "error" || sourcesResult.state === "unauthorized" ? (
        <EmptyState title="Sources are not configured" description={routeResultMessage(sourcesResult)} tone={sourcesResult.state === "unauthorized" ? "warn" : "risk"} />
      ) : null}

      {data && sources.length === 0 ? (
        <EmptyState
          title="No sources connected yet"
          description="Connect an AI app first. Authorized source sessions will appear here with sync state and review-safe controls."
          action={<a className="buttonLink muted" href="/apps">Connect apps</a>}
        />
      ) : null}

      {sources.length > 0 ? (
        <DataCard title="Source filters" description="Filter by sync state without mutating source configuration.">
          <FilterBar
            actions={
              <button type="button" className="muted" onClick={() => setStatusFilter("all")}>
                Clear filter
              </button>
            }
          >
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SourceFilter)}>
                <option value="all">All statuses</option>
                {unique(sources.map((source) => source.status)).map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
            </label>
          </FilterBar>
        </DataCard>
      ) : null}

      {sources.length > 0 ? (
        <TableWrapper label="Source sync table" description="Provider, status, session counts, pending work, and last sync from the dashboard contract.">
          {visibleSources.length ? (
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Sessions</th>
                  <th>Pending</th>
                  <th>Last sync</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleSources.map((source) => (
                  <tr key={source.id}>
                    <td>
                      {source.name}
                      <small>{source.detail}</small>
                    </td>
                    <td>{source.provider}</td>
                    <td><span className={`${styles.statusBadge} ${styles[statusClass(source.status)]}`}>{statusLabel(source.status)}</span></td>
                    <td>{formatCount(source.sessions)}</td>
                    <td>{formatCount(source.pendingJobs)}</td>
                    <td>{source.lastSync}</td>
                    <td>
                      <SourceActions source={source} intent={intentById[source.id]} onIntent={(intent) => setIntentById({ ...intentById, [source.id]: intent })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No sources match this filter" description="Clear the status filter to return to every source." />
          )}
        </TableWrapper>
      ) : null}
    </CustomerConsole>
  );
}

function SourceActions({
  source,
  intent,
  onIntent
}: {
  source: CloudSource;
  intent?: SourceIntent;
  onIntent: (intent: SourceIntent) => void;
}) {
  return (
    <div className={styles.actions} aria-label={`Source actions for ${source.name}`}>
      {source.status === "paused" ? (
        <button type="button" onClick={() => onIntent("resume")}>Request resume</button>
      ) : (
        <button type="button" className="muted" onClick={() => onIntent("pause")}>Request pause</button>
      )}
      <button type="button" className="danger" onClick={() => onIntent("delete")}>Request deletion</button>
      {intent ? <span className={styles.intentNote}>{intentLabel(intent)}</span> : null}
    </div>
  );
}

function routeData(result: SourcesRouteState): SourcesData | null {
  return result.state === "success" || result.state === "empty" ? result.data : null;
}

function unique<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function sumKnown(values: Array<number | null>) {
  const known = values.filter((value): value is number => typeof value === "number");
  return known.length ? known.reduce((total, value) => total + value, 0) : "Unknown";
}

function formatCount(value: number | null) {
  return typeof value === "number" ? value : "Unknown";
}

function routeLabel(result: SourcesRouteState) {
  if (result.state === "loading") return "Loading";
  if (result.state === "success") return "Live data";
  if (result.state === "empty") return "Empty";
  if (result.state === "config-missing") return "Config missing";
  if (result.state === "unauthorized") return "Unauthorized";
  return "Error";
}

function serviceLabel(result: SourcesRouteState) {
  if (result.state === "loading") return "Checking sources";
  return result.state === "success" || result.state === "empty" ? "Sources ready" : "Sources unavailable";
}

function serviceTone(result: SourcesRouteState) {
  if (result.state === "loading") return "warn";
  return result.state === "success" || result.state === "empty" ? "ok" : "warn";
}

function statusLabel(status: SourceSyncStatus) {
  return status.replace(/_/g, " ");
}

function statusClass(status: SourceSyncStatus) {
  if (status === "delete_pending") return "deletePending";
  return status;
}

function intentLabel(intent: SourceIntent) {
  if (intent === "pause") return "Pause request prepared";
  if (intent === "resume") return "Resume request prepared";
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
