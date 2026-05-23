import { CustomerConsole } from "../../components/customer-console";
import { DataCard, DestructivePanel, EmptyState, PageHeader, SettingsRow } from "../../components/dashboard-shell";
import { routeResultMessage } from "../../lib/api-client";
import type { PrivacyData, RouteResult } from "../../lib/contracts";
import { getDashboardDemoBoundary, routeDemoData } from "../../lib/demo-fixtures";

const dashboardDemoBoundary = getDashboardDemoBoundary({
  nodeEnv: process.env.NODE_ENV,
  demoEnabled: process.env.NEXT_PUBLIC_LORE_DASHBOARD_DEMO
});

export default function PrivacyPage() {
  const result = routeDemoData(dashboardDemoBoundary).privacy;
  const data = result.state === "success" || result.state === "empty" ? result.data : null;

  return (
    <CustomerConsole activeRoute="privacy" session={null} serviceLabel={serviceLabel(result)} serviceTone={serviceTone(result)}>
      <PageHeader
        eyebrow="Privacy"
        title="Privacy controls"
        description="Review beta privacy posture for capture, raw transcript handling, export, and deletion requests without performing destructive actions."
        meta={<span className={`statusBadge ${result.state === "config-missing" ? "warn" : "muted"}`}>{routeLabel(result.state)}</span>}
      />

      {result.state === "config-missing" ? (
        <EmptyState title="Privacy controls are not configured" description={routeResultMessage(result)} tone="warn" />
      ) : null}

      {data ? <PrivacyContent data={data} /> : null}
    </CustomerConsole>
  );
}

function PrivacyContent({ data }: { data: PrivacyData }) {
  return (
    <div className="overviewStack">
      <section className="overviewGrid">
        <DataCard
          title="Capture controls"
          description="These controls are prepared for customer review. Buttons are intentionally non-destructive until the live settings API is connected."
          meta={<span className="statusBadge warn">Beta controls</span>}
        >
          <SettingsRow
            label="Private mode"
            description="Pause automatic memory capture from connected apps while still allowing manual recall review."
            meta="Changes are preview-only in this beta page."
            control={<button type="button" className={data.privateMode ? "muted" : undefined} disabled>{data.privateMode ? "On" : "Off"}</button>}
          />
          <SettingsRow
            label="Capture worker"
            description="Stop new summaries from being saved while preserving existing memories and evidence ledgers."
            meta={data.capturePaused ? "Capture is currently marked paused." : "Capture is currently marked active."}
            control={<button type="button" className="warn" disabled>{data.capturePaused ? "Resume preview" : "Pause preview"}</button>}
          />
          <SettingsRow
            label="Raw transcripts"
            description="Lore beta is designed around summaries and evidence, not long-term raw transcript storage."
            meta="Raw archive actions require explicit live API confirmation."
            control={<span className="pill neutral">{data.rawArchiveRequested ? "archive requested" : "not archived"}</span>}
          />
        </DataCard>

        <DataCard
          title="Data requests"
          description="Safe request states for export and deletion workflows before a production queue is attached."
        >
          <SettingsRow
            label="Export request"
            description="Prepare a portable archive of vault settings, profile rows, memories, and evidence metadata."
            meta={data.exportRequested ? "Request has been prepared." : "No export request is pending."}
            control={<button type="button" disabled>{data.exportRequested ? "Requested" : "Request export"}</button>}
          />
          <SettingsRow
            label="Delete request"
            description="Deletion is irreversible when connected to production, so this beta page only previews the control."
            meta="No destructive request is sent from this route."
            control={<button type="button" className="danger" disabled>Request deletion</button>}
          />
        </DataCard>
      </section>

      <DestructivePanel
        title="Delete vault"
        description="Production deletion will require signed-in ownership, a fresh confirmation challenge, and a queued audit entry. This page does not delete data."
        confirmation={<span className="pill risk">Disabled in beta UI</span>}
        actionLabel="Delete disabled"
        actionProps={{ disabled: true }}
      />

      <DataCard title="Beta privacy copy" description="Customer-facing safety language for the current private beta.">
        <ul className="consentList">
          <li>Private mode pauses new capture but does not erase existing approved memories.</li>
          <li>Export and delete requests are explicit customer actions and are not triggered by page load.</li>
          <li>Raw transcripts are treated as sensitive and require a separate request state before archive access.</li>
        </ul>
      </DataCard>
    </div>
  );
}

function serviceLabel(result: RouteResult<PrivacyData>) {
  return result.state === "config-missing" ? "Preview unavailable" : "Privacy beta";
}

function serviceTone(result: RouteResult<PrivacyData>) {
  return result.state === "config-missing" ? "warn" : "ok";
}

function routeLabel(state: RouteResult<PrivacyData>["state"]) {
  return state === "config-missing" ? "Config missing" : "Safe preview";
}
