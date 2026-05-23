"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerConsole } from "../../components/customer-console";
import { DataCard, EmptyState, FilterBar, PageHeader, StatCard, TableWrapper } from "../../components/dashboard-shell";
import { createBrowserDashboardApiClient, fetchMemoriesData, routeResultMessage } from "../../lib/api-client";
import type { CloudMemoryFeedItem, CloudProfileItem, MemoriesData, MemoryRecord, RouteResult } from "../../lib/contracts";
import styles from "./memories.module.css";

type MemoriesRouteState = RouteResult<MemoriesData> | { state: "loading" };
type MemoryView = "all" | "feed" | "profile";
type MemoryIntent = "correct" | "delete";

export default function MemoriesPage() {
  const [view, setView] = useState<MemoryView>("all");
  const [intentById, setIntentById] = useState<Record<string, MemoryIntent>>({});
  const [memoriesResult, setMemoriesResult] = useState<MemoriesRouteState>({ state: "loading" });
  const client = useMemo(() => createBrowserDashboardApiClient(), []);
  const refresh = useCallback(async () => {
    try {
      setMemoriesResult(await fetchMemoriesData(client));
    } catch (error) {
      setMemoriesResult({ state: "error", error: errorMessage(error) || "Saved memory request failed" });
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const data = routeData(memoriesResult);
  const records = data?.memories ?? [];
  const feed = data?.feed ?? [];
  const profile = data?.profile ?? [];
  const visibleFeed = useMemo(() => (view === "all" || view === "feed" ? feed : []), [feed, view]);
  const visibleProfile = useMemo(() => (view === "all" || view === "profile" ? profile : []), [profile, view]);
  const total = records.length + feed.length + profile.length;

  return (
    <CustomerConsole activeRoute="memories" session={null} serviceLabel={serviceLabel(memoriesResult)} serviceTone={serviceTone(memoriesResult)}>
      <PageHeader
        eyebrow="Saved Memories"
        title="Memory inventory"
        description="Review saved context, profile facts, source provenance, confidence, and non-destructive correction or deletion requests."
        meta={
          <>
            <span className={styles.badge}>{routeLabel(memoriesResult)}</span>
            <span className={styles.badge}>{total} visible items</span>
          </>
        }
        actions={<button type="button" className="muted" onClick={() => void refresh()} disabled={memoriesResult.state === "loading"}>Refresh</button>}
      />

      <section className={styles.statsGrid} aria-label="Memory summary">
        <StatCard label="Memory feed" value={feed.length} detail="Saved context items available for recall" tone={feed.length ? "ok" : "neutral"} />
        <StatCard label="Profile facts" value={profile.length} detail="Stable, dynamic, and project-scoped profile entries" tone={profile.length ? "ok" : "neutral"} />
        <StatCard label="Average confidence" value={total ? percent(avg([...feed.map((item) => item.confidence), ...profile.map((item) => item.confidence)])) : "n/a"} detail="Across feed and profile context" tone="neutral" />
      </section>

      {memoriesResult.state === "loading" ? (
        <EmptyState title="Loading memories" description="Checking your session before loading saved memory inventory." />
      ) : null}

      {memoriesResult.state === "config-missing" || memoriesResult.state === "error" || memoriesResult.state === "unauthorized" ? (
        <EmptyState title="Memories are not configured" description={routeResultMessage(memoriesResult)} tone={memoriesResult.state === "unauthorized" ? "warn" : "risk"} />
      ) : null}

      {data && total === 0 ? (
        <EmptyState title="No saved memory yet" description="Approve a candidate in the Inbox or connect a source to populate the inventory." action={<a className="buttonLink muted" href="/inbox">Open Inbox</a>} />
      ) : null}

      {total > 0 ? (
        <DataCard title="Inventory controls" description="Switch between feed and profile context without mutating live memory.">
          <FilterBar>
            <label>
              View
              <select value={view} onChange={(event) => setView(event.target.value as MemoryView)}>
                <option value="all">All memory</option>
                <option value="feed">Feed context</option>
                <option value="profile">Profile context</option>
              </select>
            </label>
          </FilterBar>
        </DataCard>
      ) : null}

      {records.length > 0 ? <RecordTable records={records} /> : null}

      {visibleFeed.length > 0 ? (
        <section className={styles.memoryGrid} aria-label="Saved memory feed">
          {visibleFeed.map((item) => (
            <article key={item.id} className={styles.memoryCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.eyebrow}>{item.type} · {item.scope}</span>
                  <h2>{item.summary}</h2>
                </div>
                <span className={styles.statusBadge}>{item.status}</span>
              </div>
              <dl className={styles.metaGrid}>
                <div>
                  <dt>Confidence</dt>
                  <dd>{percent(item.confidence)}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{item.source}</dd>
                </div>
                <div>
                  <dt>Captured</dt>
                  <dd>{item.capturedAt}</dd>
                </div>
              </dl>
              <MemoryIntentActions id={item.id} intent={intentById[item.id]} onIntent={(intent) => setIntentById({ ...intentById, [item.id]: intent })} />
            </article>
          ))}
        </section>
      ) : null}

      {visibleProfile.length > 0 ? (
        <DataCard title="Profile context" description="Private profile facts used to personalize recall when allowed.">
          <div className={styles.profileList}>
            {visibleProfile.map((item) => (
              <article key={item.id} className={styles.profileRow}>
                <div>
                  <span className={styles.eyebrow}>{item.kind} · {item.visibility}</span>
                  <strong>{item.label}</strong>
                  <p>{item.value}</p>
                  <small>{item.source}</small>
                </div>
                <div className={styles.profileMeta}>
                  <span className={styles.statusBadge}>{item.status}</span>
                  <span>{percent(item.confidence)}</span>
                  <MemoryIntentActions id={item.id} intent={intentById[item.id]} onIntent={(intent) => setIntentById({ ...intentById, [item.id]: intent })} compact />
                </div>
              </article>
            ))}
          </div>
        </DataCard>
      ) : null}

      {total > 0 && visibleFeed.length === 0 && visibleProfile.length === 0 ? (
        <EmptyState title="No memory in this view" description="Change the inventory filter to see another memory group." />
      ) : null}
    </CustomerConsole>
  );
}

function RecordTable({ records }: { records: MemoryRecord[] }) {
  return (
    <TableWrapper label="Live memory records" description="Contract-backed records when a live memory list is available.">
      <table>
        <thead>
          <tr>
            <th>Memory</th>
            <th>Status</th>
            <th>Confidence</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>
                {record.content}
                <small>{record.memoryType} · {record.scope}</small>
              </td>
              <td>{record.status}</td>
              <td>{percent(record.confidence)}</td>
              <td>{record.projectId ?? "vault"}<small>{record.riskTags.join(", ") || "no risk tags"}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function MemoryIntentActions({
  id,
  intent,
  onIntent,
  compact = false
}: {
  id: string;
  intent?: MemoryIntent;
  onIntent: (intent: MemoryIntent) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? styles.compactActions : styles.actions} aria-label={`Memory actions for ${id}`}>
      <button type="button" className="muted" onClick={() => onIntent("correct")}>Request correction</button>
      <button type="button" className="danger" onClick={() => onIntent("delete")}>Request deletion</button>
      {intent ? <span className={styles.intentNote}>{intent === "correct" ? "Correction" : "Deletion"} request prepared</span> : null}
    </div>
  );
}

function routeData(result: MemoriesRouteState): MemoriesData | null {
  return result.state === "success" || result.state === "empty" ? result.data : null;
}

function avg(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function routeLabel(result: MemoriesRouteState) {
  if (result.state === "loading") return "Loading";
  if (result.state === "success") return "Live data";
  if (result.state === "empty") return "Empty";
  if (result.state === "config-missing") return "Config missing";
  if (result.state === "unauthorized") return "Unauthorized";
  return "Error";
}

function serviceLabel(result: MemoriesRouteState) {
  if (result.state === "loading") return "Checking inventory";
  return result.state === "success" || result.state === "empty" ? "Inventory ready" : "Inventory unavailable";
}

function serviceTone(result: MemoriesRouteState) {
  if (result.state === "loading") return "warn";
  return result.state === "success" || result.state === "empty" ? "ok" : "warn";
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
