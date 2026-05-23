"use client";

import { useState } from "react";
import { CustomerConsole } from "../../components/customer-console";
import { DataCard, EmptyState, PageHeader, StatCard } from "../../components/dashboard-shell";
import { routeResultMessage } from "../../lib/api-client";
import type { AgentConnectionStatus, AppsData, CloudAgentConnection, RouteResult } from "../../lib/contracts";
import { getDashboardDemoBoundary, routeDemoData } from "../../lib/demo-fixtures";
import styles from "./apps.module.css";

type AppsRouteState = RouteResult<AppsData>;
type AppIntent = "pair" | "install" | "reconnect" | "revoke";

const dashboardDemoBoundary = getDashboardDemoBoundary({
  nodeEnv: process.env.NODE_ENV,
  demoEnabled: process.env.NEXT_PUBLIC_LORE_DASHBOARD_DEMO
});

const appsResult = routeDemoData(dashboardDemoBoundary).apps;

export default function AppsPage() {
  const [intentById, setIntentById] = useState<Record<string, AppIntent>>({});
  const data = routeData(appsResult);
  const agents = visibleAgents(data?.agents ?? []);
  const installToken = data?.installToken ?? null;

  return (
    <CustomerConsole activeRoute="apps" session={null} serviceLabel={serviceLabel(appsResult)} serviceTone={serviceTone(appsResult)}>
      <PageHeader
        eyebrow="Connect Apps"
        title="AI app connections"
        description="Pair Claude Code, Codex, Cursor, and OpenCode with Lore. Connection controls are review-only until live pairing endpoints are connected."
        meta={
          <>
            <span className={styles.badge}>{routeLabel(appsResult)}</span>
            <span className={styles.badge}>{agents.length} supported apps</span>
          </>
        }
      />

      <section className={styles.statsGrid} aria-label="Connection summary">
        <StatCard label="Connected" value={agents.filter((agent) => agent.status === "connected").length} detail="Apps currently allowed to read approved memory" tone="ok" />
        <StatCard label="Pairing" value={agents.filter((agent) => agent.status === "pairing").length} detail="Waiting for app-side setup" tone={agents.some((agent) => agent.status === "pairing") ? "warn" : "neutral"} />
        <StatCard label="Needs action" value={agents.filter(needsAction).length} detail="Install, reconnect, or revoked states" tone={agents.some(needsAction) ? "warn" : "ok"} />
        <StatCard label="Token" value={installToken ? installToken.expiresIn : "n/a"} detail={installToken ? installToken.tokenLabel : "Connection token unavailable"} tone={installToken ? "neutral" : "warn"} />
      </section>

      {appsResult.state === "config-missing" || appsResult.state === "error" || appsResult.state === "unauthorized" ? (
        <EmptyState title="App connections are not configured" description={routeResultMessage(appsResult)} tone={appsResult.state === "unauthorized" ? "warn" : "risk"} />
      ) : null}

      {data && agents.length === 0 ? (
        <EmptyState
          title="No supported app connections yet"
          description="When connection data is available, Claude Code, Codex, Cursor, and OpenCode will appear here with pairing and reconnect states."
          action={<a className="buttonLink muted" href="/developer">Open Developer setup</a>}
        />
      ) : null}

      {installToken ? (
        <DataCard
          title="Connection setup"
          description="Use the hosted setup details in a compatible AI app. This page never renders live secrets in the browser."
          meta={<span className={styles.statusBadge}>expires {installToken.expiresIn}</span>}
        >
          <div className={styles.installPanel}>
            <div className={styles.commandBox}>
              <code>{installToken.command || "Connection command unavailable"}</code>
              <p>{installToken.fallback}</p>
            </div>
          </div>
        </DataCard>
      ) : null}

      {agents.length > 0 ? (
        <section className={styles.connectionGrid} aria-label="Supported app connections">
          {agents.map((agent) => (
            <article key={agent.id} className={styles.connectionCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.eyebrow}>{agent.client}</span>
                  <h2>{agent.name}</h2>
                </div>
                <span className={`${styles.statusBadge} ${styles[statusClass(agent.status)]}`}>{statusLabel(agent.status)}</span>
              </div>
              <p className={styles.detail}>{agent.detail}</p>
              <dl className={styles.metaGrid}>
                <div>
                  <dt>Scope</dt>
                  <dd>{agent.scope}</dd>
                </div>
                <div>
                  <dt>Last seen</dt>
                  <dd>{agent.lastSeen}</dd>
                </div>
              </dl>
              <div className={styles.actions} aria-label={`Connection actions for ${agent.name}`}>
                {actionsFor(agent).map((action) => (
                  <button
                    key={action.intent}
                    type="button"
                    className={action.className}
                    onClick={() => setIntentById({ ...intentById, [agent.id]: action.intent })}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              {intentById[agent.id] ? (
                <div className={styles.intentNote}>{intentLabel(intentById[agent.id])}. Changes require confirmation before they are applied.</div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
    </CustomerConsole>
  );
}

function routeData(result: AppsRouteState): AppsData | null {
  return result.state === "success" || result.state === "empty" ? result.data : null;
}

function visibleAgents(agents: CloudAgentConnection[]) {
  const supported = new Set(["claude-code", "codex", "cursor", "opencode"]);
  return agents.filter((agent) => supported.has(agent.id));
}

function actionsFor(agent: CloudAgentConnection): Array<{ intent: AppIntent; label: string; className?: string }> {
  if (agent.status === "connected") {
    return [
      { intent: "pair", label: "Pair another device", className: "muted" },
      { intent: "revoke", label: "Request revoke", className: "danger" }
    ];
  }
  if (agent.status === "pairing") {
    return [
      { intent: "pair", label: "Resume pairing" },
      { intent: "revoke", label: "Cancel pairing", className: "warn" }
    ];
  }
  if (agent.status === "not_installed") {
    return [
      { intent: "install", label: "Show install steps" },
      { intent: "pair", label: "Pair manually", className: "muted" }
    ];
  }
  if (agent.status === "revoked") {
    return [{ intent: "reconnect", label: "Request reconnect" }];
  }
  return [
    { intent: "reconnect", label: "Request reconnect" },
    { intent: "revoke", label: "Request revoke", className: "danger" }
  ];
}

function needsAction(agent: CloudAgentConnection) {
  return agent.status === "not_installed" || agent.status === "error" || agent.status === "revoked";
}

function routeLabel(result: AppsRouteState) {
  if (result.state === "success") return "Preview data";
  if (result.state === "empty") return "Empty";
  if (result.state === "config-missing") return "Config missing";
  if (result.state === "unauthorized") return "Unauthorized";
  return "Error";
}

function serviceLabel(result: AppsRouteState) {
  return result.state === "success" || result.state === "empty" ? "Connections ready" : "Connections unavailable";
}

function serviceTone(result: AppsRouteState) {
  return result.state === "success" || result.state === "empty" ? "ok" : "warn";
}

function statusLabel(status: AgentConnectionStatus) {
  return status.replace(/_/g, " ");
}

function statusClass(status: AgentConnectionStatus) {
  if (status === "not_installed") return "notInstalled";
  return status;
}

function intentLabel(intent: AppIntent) {
  if (intent === "pair") return "Pairing request prepared";
  if (intent === "install") return "Install instructions prepared";
  if (intent === "reconnect") return "Reconnect request prepared";
  return "Revoke request prepared";
}
