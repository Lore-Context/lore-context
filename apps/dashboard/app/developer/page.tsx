import { CustomerConsole } from "../../components/customer-console";
import { DataCard, EmptyState, PageHeader, SettingsRow, StatCard } from "../../components/dashboard-shell";
import { routeResultMessage } from "../../lib/api-client";
import type { DeveloperData, RouteResult } from "../../lib/contracts";
import { getDashboardDemoBoundary, routeDemoData } from "../../lib/demo-fixtures";

const dashboardDemoBoundary = getDashboardDemoBoundary({
  nodeEnv: process.env.NODE_ENV,
  demoEnabled: process.env.NEXT_PUBLIC_LORE_DASHBOARD_DEMO
});

export default function DeveloperPage() {
  const result = routeDemoData(dashboardDemoBoundary).developer;
  const data = result.state === "success" || result.state === "empty" ? result.data : null;

  return (
    <CustomerConsole activeRoute="developer" session={null} serviceLabel={serviceLabel(result)} serviceTone={serviceTone(result)}>
      <PageHeader
        eyebrow="Developer"
        title="Developer setup"
        description="Connect API and hosted MCP clients with diagnostics that show setup status without exposing secrets."
        meta={<span className={`statusBadge ${result.state === "config-missing" ? "warn" : "muted"}`}>{routeLabel(result.state)}</span>}
      />

      {result.state === "config-missing" ? (
        <EmptyState title="Developer tools are not configured" description={routeResultMessage(result)} tone="warn" />
      ) : null}

      {data ? <DeveloperContent data={data} /> : null}
    </CustomerConsole>
  );
}

function DeveloperContent({ data }: { data: DeveloperData }) {
  const token = data.liveAgentToken;
  return (
    <div className="overviewStack">
      <section className="overviewStats" aria-label="Developer diagnostics">
        <StatCard label="Hosted MCP" value="Ready" detail={data.hostedMcpUrl} tone="ok" trend="URL available" />
        <StatCard label="Token" value={token ? "Issued" : "Masked"} detail="Secrets are never rendered in this page" tone={token ? "ok" : "warn"} />
        <StatCard label="Project" value="Workspace vault" detail="Preview-gated project diagnostics" />
        <StatCard label="Tooling" value="API + MCP" detail="Browser setup instructions only" />
      </section>

      <section className="overviewGrid">
        <DataCard
          title="Hosted MCP"
          description="Use the hosted MCP URL in agents that support remote MCP endpoints."
          meta={<span className="statusBadge ok">No secret in URL</span>}
        >
          <div className="connectCommand">
            <div className="commandHeader">
              <div>
                <strong>Remote endpoint</strong>
                <small>Copy into a compatible MCP client after signing in.</small>
              </div>
              <span className="pill ok">hosted</span>
            </div>
            <code>{data.hostedMcpUrl}</code>
          </div>
        </DataCard>

        <DataCard
          title="API token"
          description="Token values are intentionally masked. Use the live credential flow to reveal or rotate a token."
          meta={<span className="statusBadge muted">Secret-safe</span>}
        >
          <div className="tokenBox">
            <label>
              Device token
              <textarea readOnly value={token ? maskToken(token.deviceToken) : "lore_live_********************************"} />
            </label>
            <label>
              Service token
              <textarea readOnly value={token ? maskToken(token.serviceToken) : "lore_service_*****************************"} />
            </label>
          </div>
          <div className="tokenStatus">{token ? `Expires ${token.serviceTokenExpiresAt}` : "No live token loaded in preview fixtures."}</div>
        </DataCard>
      </section>

      <DataCard title="Local setup" description="Commands are examples only and do not reveal credentials.">
        <div className="connectCommand">
          <div className="commandHeader">
            <div>
              <strong>API client</strong>
              <small>Use an environment variable or platform secret store for token material.</small>
            </div>
            <span className="pill neutral">secret-safe</span>
          </div>
          <code>export LORE_API_TOKEN="lore_live_..."</code>
          <code>curl -H "Authorization: Bearer $LORE_API_TOKEN" /api/lore/v1/me</code>
        </div>
      </DataCard>

      <DataCard title="Diagnostics" description="Current project and tooling checks without secret material.">
        <SettingsRow label="Vault binding" description="This route uses preview data until the signed-in API route is wired." control={<span className="pill warn">preview</span>} />
        <SettingsRow label="MCP URL" description={data.hostedMcpUrl} control={<span className="pill ok">configured</span>} />
        <SettingsRow label="Secret rendering" description="Page only displays masked token previews and expiry metadata." control={<span className="pill ok">safe</span>} />
      </DataCard>
    </div>
  );
}

function maskToken(value: string) {
  if (value.length <= 10) return "********";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function serviceLabel(result: RouteResult<DeveloperData>) {
  return result.state === "config-missing" ? "Preview unavailable" : "Developer ready";
}

function serviceTone(result: RouteResult<DeveloperData>) {
  return result.state === "config-missing" ? "warn" : "ok";
}

function routeLabel(state: RouteResult<DeveloperData>["state"]) {
  return state === "config-missing" ? "Config missing" : "Secret-safe";
}
