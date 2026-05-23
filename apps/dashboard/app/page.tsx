"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerConsole } from "../components/customer-console";
import { DataCard, EmptyState, PageHeader, StatCard } from "../components/dashboard-shell";
import { createBrowserDashboardApiClient, fetchCustomerOverview, routeResultMessage } from "../lib/api-client";
import type { CustomerOverviewData, DashboardData, RouteResult, UserSession } from "../lib/contracts";
import { demoProjectId } from "../lib/demo-fixtures";
import { errorMessage } from "../lib/route-error";

type OverviewState = RouteResult<CustomerOverviewData> | { state: "loading" };
type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  meta: string;
  tone: "neutral" | "ok" | "warn" | "risk";
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewState>({ state: "loading" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const client = useMemo(
    () =>
      createBrowserDashboardApiClient({
        getCsrfToken: () => readCookie("lore_csrf")
      }),
    []
  );

  const refresh = useCallback(async () => {
    setActionError("");
    try {
      setOverview(await fetchCustomerOverview(client, demoProjectId));
    } catch (error) {
      setOverview({
        state: "error",
        error: errorMessage(error, "Customer overview request failed")
      });
    }
  }, [client]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      setActionError(`Google sign-in failed with status ${authError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
    void refresh();
  }, [refresh]);

  async function runAction(work: () => Promise<void>) {
    setBusy(true);
    setActionError("");
    try {
      await work();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    const started = await client.requestJson<{ authorizationUrl?: string }>("/auth/google/start");
    if (typeof started.authorizationUrl !== "string") {
      throw new Error("Google authorization URL missing");
    }
    window.location.assign(started.authorizationUrl);
  }

  async function signOut() {
    await client.requestJson("/auth/logout", { method: "POST", body: {} });
    await refresh();
  }

  const data = overview.state === "success" || overview.state === "empty" ? overview.data : null;
  const session = data?.session ?? null;
  const dashboard = data?.dashboard ?? emptyDashboard;
  const serviceTone = dashboard.health === "ok" ? "ok" : "warn";
  const serviceLabel = dashboard.health === "ok" ? "Service ready" : "Service degraded";
  const routeMessage = overview.state === "unauthorized" || overview.state === "config-missing" || overview.state === "error"
    ? routeResultMessage(overview)
    : "";

  return (
    <CustomerConsole
      activeRoute="overview"
      session={session}
      serviceLabel={serviceLabel}
      serviceTone={serviceTone}
      actions={
        <button type="button" className="muted" onClick={() => void refresh()} disabled={busy || overview.state === "loading"}>
          Refresh
        </button>
      }
    >
      <PageHeader
        eyebrow="Overview"
        title={session ? "Your Lore workspace" : "Start your Lore workspace"}
        description={
          session
            ? "Account state, service posture, and the next customer action in one place."
            : "Sign in to create a private vault before connecting AI apps or reviewing memory."
        }
        meta={
          <>
            <span className={`statusBadge ${session ? "ok" : "muted"}`}>{session ? "Signed in" : "Sign-in required"}</span>
            <span className={`statusBadge ${overview.state === "config-missing" ? "warn" : "muted"}`}>{overviewLabel(overview.state)}</span>
          </>
        }
        actions={<SessionActions session={session} busy={busy} onSignIn={() => void runAction(signInWithGoogle)} onSignOut={() => void runAction(signOut)} />}
      />

      {actionError ? <pre className="error">{actionError}</pre> : null}

      {overview.state === "loading" ? (
        <EmptyState title="Loading dashboard state" description="Checking your session and Lore service health through the dashboard proxy." />
      ) : null}

      {routeMessage ? (
        <DataCard className="overviewAlert" title={overview.state === "unauthorized" ? "Sign in required" : "Dashboard not ready"}>
          <p>{routeMessage}</p>
        </DataCard>
      ) : null}

      {data ? (
        <OverviewContent data={data} signedIn={Boolean(session)} />
      ) : (
        <SignedOutHome />
      )}
    </CustomerConsole>
  );
}

function SessionActions({
  session,
  busy,
  onSignIn,
  onSignOut
}: {
  session: UserSession | null;
  busy: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  if (session) {
    return (
      <button type="button" className="danger" onClick={onSignOut} disabled={busy}>
        Sign out
      </button>
    );
  }
  return (
    <button type="button" onClick={onSignIn} disabled={busy}>
      Continue with Google
    </button>
  );
}

function OverviewContent({ data, signedIn }: { data: CustomerOverviewData; signedIn: boolean }) {
  const metrics = overviewMetrics(data.dashboard);
  const steps = onboardingSteps(data, signedIn);
  const nextStep = steps.find((step) => step.state !== "done") ?? steps[steps.length - 1];
  const activity = recentActivity(data.dashboard);

  return (
    <div className="overviewStack">
      <section className="overviewStats" aria-label="Workspace metrics">
        {metrics.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            trend={metric.trend}
            tone={metric.tone}
          />
        ))}
      </section>

      <section className="overviewGrid">
        <DataCard
          title="Account and service"
          description="Current session, vault, and backend posture."
          meta={<span className={`statusBadge ${data.dashboard.health === "ok" ? "ok" : "warn"}`}>{data.dashboard.health === "ok" ? "Healthy" : "Degraded"}</span>}
        >
          <div className="overviewRows">
            <OverviewRow label="Account" value={accountLabel(data.session)} meta={data.session?.account.id ?? "No signed-in account"} />
            <OverviewRow label="Vault" value={data.session?.vault.name ?? "Not created"} meta={data.session?.vault.id ?? "Created after sign-in"} />
            <OverviewRow label="Agent memory" value={data.dashboard.agentmemory} meta="Integration health" />
            <OverviewRow label="Capture worker" value={data.systemStatus.captureWorker} meta="New-memory intake" />
          </div>
        </DataCard>

        <DataCard
          title="Next action"
          description="The shortest path to a useful customer setup."
          actions={nextStep?.href ? <a className="buttonLink" href={nextStep.href}>{nextStep.action}</a> : null}
        >
          {nextStep ? (
            <div className={`nextAction tone-${nextStep.tone}`}>
              <span>{stepLabel(nextStep.state)}</span>
              <strong>{nextStep.title}</strong>
              <p>{nextStep.detail}</p>
            </div>
          ) : null}
        </DataCard>
      </section>

      <section className="overviewGrid">
        <DataCard title="First steps" description="Customer onboarding status without developer controls.">
          <ol className="overviewChecklist">
            {steps.map((step) => (
              <li key={step.id}>
                <span className={`stepMarker ${step.tone}`}>{stepLabel(step.state)}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </div>
                {step.href ? <a href={step.href}>{step.action}</a> : null}
              </li>
            ))}
          </ol>
        </DataCard>

        <DataCard title="Recent activity" description="Latest customer memory and recall signals.">
          {activity.length ? (
            <div className="overviewActivity">
              {activity.map((item) => (
                <article key={item.id} className={`activityItem tone-${item.tone}`}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <small>{item.meta}</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No customer activity yet"
              description="Connect an AI app, approve memory, or run recall to populate this feed."
              action={<a className="buttonLink muted" href="/apps">Go to Apps</a>}
            />
          )}
        </DataCard>
      </section>

      <DataCard title="Workspace shortcuts" description="Open the main customer workflows from one place.">
        <div className="handoffGrid">
          <HandoffLink href="/apps" title="Apps" detail="Connection token, connected AI apps, and install flow." />
          <HandoffLink href="/sources" title="Sources" detail="Source pause/resume, sync state, and capture controls." />
          <HandoffLink href="/inbox" title="Inbox" detail="Suggested memory review and approve/reject loop." />
          <HandoffLink href="/memories" title="Memories" detail="Saved memory feed, profile summary, and correction entry points." />
          <HandoffLink href="/evidence" title="Evidence" detail="Recall tester, traces, and evidence ledger." />
          <HandoffLink href="/privacy" title="Privacy" detail="Export, private mode, and deletion request controls." />
          <HandoffLink href="/developer" title="Developer" detail="Project selector, API-key test path, and eval comparison controls." />
          <HandoffLink href="/billing" title="Billing" detail="Usage meters, beta plan state, and no-surprise-billing copy." />
          <HandoffLink href="/settings" title="Settings" detail="Session controls, vault settings, and preferences shell." />
        </div>
      </DataCard>
    </div>
  );
}

function SignedOutHome() {
  return (
    <div className="overviewGrid">
      <DataCard title="Before setup" description="Lore needs a signed-in account and private vault before customer workflows are available.">
        <div className="overviewRows">
          <OverviewRow label="Session" value="Not signed in" meta="Use Google sign-in to create or load your vault." />
          <OverviewRow label="Data boundary" value="Preview data gated" meta="Production hides preview data unless explicitly enabled." />
          <OverviewRow label="Proxy" value="/api/lore/*" meta="Session cookies and CSRF continue through the dashboard proxy." />
        </div>
      </DataCard>
      <EmptyState
        title="Connect after sign-in"
        description="Apps, sources, inbox, memories, evidence, privacy, billing, and settings remain separate customer routes."
      />
    </div>
  );
}

function OverviewRow({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="overviewRow">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </div>
  );
}

function HandoffLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <a className="handoffLink" href={href}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </a>
  );
}

function overviewMetrics(dashboard: DashboardData) {
  const activeMemories = dashboard.memories.filter((memory) => memory.status === "active" || memory.status === "confirmed").length;
  const reviewMemories = dashboard.memories.filter((memory) => memory.status === "candidate").length;
  const warningCount = dashboard.traces.reduce((total, trace) => total + trace.warnings.length, 0);
  const recall = dashboard.evalRuns[0]?.metrics.recallAt5;

  return [
    {
      label: "Saved memories",
      value: activeMemories,
      detail: `${dashboard.memories.length} total in this project`,
      trend: activeMemories > 0 ? "Ready" : "Empty",
      tone: activeMemories > 0 ? "ok" as const : "neutral" as const
    },
    {
      label: "Needs review",
      value: reviewMemories,
      detail: "Candidate memories awaiting a decision",
      trend: reviewMemories > 0 ? "Action" : "Clear",
      tone: reviewMemories > 0 ? "warn" as const : "ok" as const
    },
    {
      label: "Recent traces",
      value: dashboard.traces.length,
      detail: `${warningCount} warning${warningCount === 1 ? "" : "s"} across recent recalls`,
      trend: warningCount > 0 ? "Review" : "Stable",
      tone: warningCount > 0 ? "warn" as const : "neutral" as const
    },
    {
      label: "Recall@5",
      value: recall === undefined ? "n/a" : percent(recall),
      detail: "Latest retrieval eval signal",
      trend: recall === undefined ? "No runs" : "Measured",
      tone: recall === undefined ? "neutral" as const : recall >= 0.8 ? "ok" as const : "warn" as const
    }
  ];
}

function onboardingSteps(data: CustomerOverviewData, signedIn: boolean) {
  const hasMemories = data.dashboard.memories.length > 0;
  const hasReview = data.dashboard.memories.some((memory) => memory.status === "candidate");
  const hasTrace = data.dashboard.traces.length > 0;
  const serviceReady = data.dashboard.health === "ok";

  return [
    {
      id: "signin",
      title: "Sign in and create a private vault",
      detail: signedIn ? `${accountLabel(data.session)} is connected to ${data.session?.vault.name}.` : "Google sign-in is required before Lore can create a private vault.",
      state: signedIn ? "done" as const : "current" as const,
      tone: signedIn ? "ok" as const : "warn" as const,
      action: "Sign in"
    },
    {
      id: "connect",
      title: "Connect an AI app",
      detail: hasMemories || hasTrace ? "At least one app has produced memory or recall activity." : "Use the Apps route to pair an AI app without exposing admin credentials.",
      state: hasMemories || hasTrace ? "done" as const : signedIn ? "current" as const : "queued" as const,
      tone: hasMemories || hasTrace ? "ok" as const : "warn" as const,
      href: "/apps",
      action: "Open Apps"
    },
    {
      id: "review",
      title: "Review suggested memory",
      detail: hasReview ? "Candidate memory is waiting in the review workflow." : hasMemories ? "Memory exists. Use Inbox or Memories for detailed review." : "Approve, edit, or reject suggested memory before relying on it.",
      state: hasMemories ? "done" as const : signedIn ? "queued" as const : "queued" as const,
      tone: hasReview ? "warn" as const : hasMemories ? "ok" as const : "neutral" as const,
      href: hasReview ? "/inbox" : "/memories",
      action: hasReview ? "Open Inbox" : "Open Memories"
    },
    {
      id: "recall",
      title: "Verify recall with evidence",
      detail: hasTrace ? "Recent recall traces are available for evidence review." : "Use Evidence to inspect why memory was or was not used.",
      state: hasTrace ? "done" as const : hasMemories ? "current" as const : "queued" as const,
      tone: hasTrace ? "ok" as const : serviceReady ? "neutral" as const : "warn" as const,
      href: "/evidence",
      action: "Open Evidence"
    }
  ];
}

function recentActivity(dashboard: DashboardData): ActivityItem[] {
  const memoryItems = dashboard.memories.slice(0, 2).map((memory) => ({
    id: `memory-${memory.id}`,
    label: "Memory updated",
    detail: memory.content,
    meta: `${memory.status} · ${formatDate(memory.updatedAt)}`,
    tone: memory.riskTags.length > 0 ? "warn" as const : "ok" as const
  }));
  const traceItems = dashboard.traces.slice(0, 2).map((trace) => ({
    id: `trace-${trace.id}`,
    label: "Recall trace",
    detail: trace.query,
    meta: `${trace.tokensUsed}/${trace.tokenBudget} tokens · ${formatDate(trace.createdAt)}`,
    tone: trace.warnings.length > 0 ? "warn" as const : "neutral" as const
  }));
  return [...memoryItems, ...traceItems].slice(0, 5);
}

const emptyDashboard: DashboardData = {
  health: "error",
  agentmemory: "unknown",
  memories: [],
  traces: [],
  ledgers: [],
  evalRuns: [],
  auditLogs: []
};

function accountLabel(session: UserSession | null) {
  return session?.account.displayName ?? session?.account.email ?? "No account";
}

function overviewLabel(state: OverviewState["state"]) {
  if (state === "loading") return "Loading";
  if (state === "success") return "Live data";
  if (state === "empty") return "No activity";
  if (state === "unauthorized") return "Unauthorized";
  if (state === "config-missing") return "Config missing";
  return "Error";
}

function stepLabel(state: "done" | "current" | "queued") {
  if (state === "done") return "Done";
  if (state === "current") return "Now";
  return "Queued";
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  return document.cookie.split("; ").find((item) => item.startsWith(prefix))?.slice(prefix.length);
}
