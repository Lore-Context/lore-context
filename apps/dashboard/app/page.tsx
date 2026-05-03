"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type MemoryStatus = "candidate" | "active" | "confirmed" | "superseded" | "expired" | "deleted";
type TraceFeedback = "useful" | "wrong" | "outdated" | "sensitive";
type MemoryActionMode = "edit" | "supersede" | "reject" | "forget";
type CloudStepStatus = "done" | "current" | "blocked" | "queued";
type AgentConnectionStatus = "connected" | "pairing" | "not_installed" | "error" | "revoked";
type SourceSyncStatus = "healthy" | "syncing" | "paused" | "error" | "delete_pending";
type ControlTone = "ok" | "warn" | "risk" | "muted" | "neutral";
type MemoryInboxStatus = "pending" | "approved" | "rejected" | "edited" | "duplicate" | "stale" | "sensitive" | "conflict" | "source-paused" | "deleted" | "accepted" | "undo_available" | "review_required";
type LedgerItemState = "retrieved" | "used" | "ignored" | "stale" | "conflicting" | "risky" | "missing" | "deleted";

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

interface EvidenceLedgerSummary {
  retrieved: number;
  composed: number;
  ignored: number;
  warnings: number;
  riskTags: string[];
  staleCount: number;
  conflictCount: number;
}

interface EvidenceLedger {
  traceId: string;
  summary: EvidenceLedgerSummary;
  rows: Array<{
    memoryId: string;
    contentPreview: string;
    disposition: "used" | "ignored" | "blocked" | "missing";
    status: string;
    riskTags: string[];
    warnings: string[];
  }>;
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
  ledgers: EvidenceLedger[];
  evalRuns: EvalRun[];
  auditLogs: AuditLog[];
}

interface UserSession {
  account: {
    id: string;
    email?: string | null;
    displayName?: string | null;
    plan: string;
  };
  vault: {
    id: string;
    name: string;
    plan: string;
  };
}

interface LiveAgentToken {
  deviceId: string;
  vaultId: string;
  accountId: string;
  deviceToken: string;
  deviceTokenExpiresAt: string;
  serviceToken: string;
  serviceTokenExpiresAt: string;
}

interface CloudOnboardingStep {
  id: string;
  label: string;
  detail: string;
  status: CloudStepStatus;
}

interface CloudAgentConnection {
  id: string;
  name: string;
  client: string;
  status: AgentConnectionStatus;
  detail: string;
  scope: string;
  lastSeen: string;
}

interface ConnectAgentFixture {
  tokenLabel: string;
  expiresIn: string;
  command: string;
  fallback: string;
  status: "ready";
}

interface FirstRunStep {
  id: string;
  label: string;
  detail: string;
  status: "done" | "current" | "queued";
}

interface SourceActionState {
  pending: boolean;
  message?: string;
}

interface CloudMemoryFeedItem {
  id: string;
  summary: string;
  source: string;
  type: string;
  scope: string;
  confidence: number;
  status: string;
  capturedAt: string;
}

interface CloudProfileItem {
  id: string;
  label: string;
  value: string;
  kind: "static" | "dynamic" | "project";
  confidence: number;
  visibility: string;
  status: "active" | "edited" | "delete_pending";
  source: string;
}

interface CloudSource {
  id: string;
  name: string;
  provider: string;
  status: SourceSyncStatus;
  detail: string;
  sessions: number;
  pendingJobs: number;
  lastSync: string;
}

interface UsageMeter {
  label: string;
  used: number;
  limit: number;
  eventType: string;
}

interface MemoryInboxItem {
  id: string;
  candidate: string;
  type: string;
  scope: string;
  source: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  status: MemoryInboxStatus;
  reason: string;
}

interface BetaLedgerItem {
  id: string;
  memory: string;
  state: LedgerItemState;
  reason: string;
  warning?: string;
}

interface BetaLedgerTrace {
  id: string;
  agent: string;
  query: string;
  tokenBudget: number;
  usedTokens: number;
  warnings: string[];
  items: BetaLedgerItem[];
}

interface PricingTier {
  name: string;
  price: string;
  limits: string;
  note: string;
  current?: boolean;
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
        messages: [{ role: "user", content: "Lore should capture and surface useful context from connected AI tools and work apps." }]
      }
    ],
    questions: [
      { question: "What project memory should Lore keep auditable?", goldSessionIds: ["s1"] },
      { question: "What should Lore capture from connected AI tools?", goldSessionIds: ["s2"] }
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

const cloudFixture = {
  vaultName: "Your personal vault",
  plan: "Free beta",
  installToken: {
    tokenLabel: "one-time connection",
    expiresIn: "10 min",
    command: "npx -y @lore/cli@beta connect --pair https://lorecontext.com/pair/preview --client claude-code",
    fallback: "If one-click pairing fails, use the backup setup guide. Never share a connection link in support chat.",
    status: "ready"
  } satisfies ConnectAgentFixture,
  onboarding: [
    {
      id: "account",
      label: "Sign in",
      detail: "Sign in with Google to create your private memory vault. Lore never reads other apps until you connect one.",
      status: "done"
    },
    {
      id: "agent",
      label: "Connect your first AI app",
      detail: "Pick an AI app like Claude Code or Codex. Lore will only see the sessions you authorize, summary-only by default.",
      status: "current"
    },
    {
      id: "capture",
      label: "Try a sample memory",
      detail: "If you don't have an AI app to connect yet, run a sample so you can see what Lore would suggest.",
      status: "queued"
    },
    {
      id: "inbox",
      label: "Review your first suggested memory",
      detail: "Lore puts new suggestions in your Inbox. You decide what is kept, edited, or deleted before anything is reused.",
      status: "queued"
    },
    {
      id: "ledger",
      label: "Reuse memory with evidence",
      detail: "Once a memory is approved, your AI apps can recall it with a clear evidence trail showing why it was used.",
      status: "blocked"
    }
  ] satisfies CloudOnboardingStep[],
  agents: [
    {
      id: "claude-code",
      name: "Claude Code",
      client: "AI app",
      status: "connected",
      detail: "Connected. Lore is reading session summaries you authorized.",
      scope: "project + user memory",
      lastSeen: "2 min ago"
    },
    {
      id: "codex",
      name: "Codex",
      client: "AI app",
      status: "pairing",
      detail: "Waiting for you to finish pairing in the AI app.",
      scope: "project memory",
      lastSeen: "not paired"
    },
    {
      id: "cursor",
      name: "Cursor",
      client: "AI app",
      status: "not_installed",
      detail: "Cursor isn't connected on this device yet.",
      scope: "not connected",
      lastSeen: "n/a"
    },
    {
      id: "opencode",
      name: "OpenCode",
      client: "AI app",
      status: "error",
      detail: "Connection needs to be refreshed. Reconnect from the AI app.",
      scope: "project memory",
      lastSeen: "18 min ago"
    },
    {
      id: "revoked-device",
      name: "Old MacBook",
      client: "AI app",
      status: "revoked",
      detail: "Access removed. Reconnect this device to use Lore again.",
      scope: "no access",
      lastSeen: "revoked yesterday"
    }
  ] satisfies CloudAgentConnection[],
  inbox: [
    {
      id: "inbox-1",
      candidate: "Prefers concise, evidence-backed engineering updates.",
      type: "preference",
      scope: "user",
      source: "Sample · Claude Code",
      confidence: 0.88,
      risk: "low",
      status: "pending",
      reason: "Suggested because the same instruction style appears across recent sessions."
    },
    {
      id: "inbox-2",
      candidate: "Lore beta should not claim live billing or GA availability.",
      type: "constraint",
      scope: "project",
      source: "Sample · Codex",
      confidence: 0.93,
      risk: "medium",
      status: "accepted",
      reason: "Captured from project notes about public claim boundaries."
    },
    {
      id: "inbox-3",
      candidate: "A personal contact detail might have appeared in a recent transcript.",
      type: "risk_flag",
      scope: "source",
      source: "Sample · OpenCode",
      confidence: 0.72,
      risk: "high",
      status: "review_required",
      reason: "Held back from recall until you review it. Sensitive content is never reused without approval."
    }
  ] satisfies MemoryInboxItem[],
  memoryFeed: [
    {
      id: "mem-cloud-1",
      summary: "Prefers concise, evidence-backed engineering updates.",
      source: "Sample · Claude Code",
      type: "preference",
      scope: "user",
      confidence: 0.86,
      status: "active",
      capturedAt: "summary only"
    },
    {
      id: "mem-cloud-2",
      summary: "This account is using the Lore beta. Don't claim live billing or general availability.",
      source: "Sample · Codex",
      type: "decision",
      scope: "project",
      confidence: 0.92,
      status: "confirmed",
      capturedAt: "from your notes"
    },
    {
      id: "mem-cloud-3",
      summary: "Raw transcripts stay off unless you turn them on in Privacy.",
      source: "Lore default",
      type: "constraint",
      scope: "vault",
      confidence: 0.95,
      status: "review",
      capturedAt: "default policy"
    }
  ] satisfies CloudMemoryFeedItem[],
  profile: [
    {
      id: "profile-static-1",
      label: "Communication",
      value: "Prefers direct status, exact files, and verification evidence.",
      kind: "static",
      confidence: 0.9,
      visibility: "private",
      status: "active",
      source: "Memory Inbox accepted candidate"
    },
    {
      id: "profile-dynamic-1",
      label: "Active lane",
      value: "Preparing Lore v0.9 Auto-Capture Beta dashboard workflow.",
      kind: "dynamic",
      confidence: 0.84,
      visibility: "private",
      status: "active",
      source: "Latest dashboard worker task"
    },
    {
      id: "profile-project-1",
      label: "Project boundary",
      value: "Public repo stays trust/distribution focused; cloud implementation remains private.",
      kind: "project",
      confidence: 0.93,
      visibility: "readonly",
      status: "active",
      source: "v0.9 PRD"
    }
  ] satisfies CloudProfileItem[],
  sources: [
    {
      id: "source-claude",
      name: "Claude Code",
      provider: "AI app",
      status: "syncing",
      detail: "3 sessions queued for review.",
      sessions: 12,
      pendingJobs: 3,
      lastSync: "2 min ago"
    },
    {
      id: "source-codex",
      name: "Codex",
      provider: "AI app",
      status: "healthy",
      detail: "Summary only. Raw transcripts are off.",
      sessions: 8,
      pendingJobs: 0,
      lastSync: "6 min ago"
    },
    {
      id: "source-opencode",
      name: "OpenCode",
      provider: "AI app",
      status: "error",
      detail: "Connection needs to be refreshed in the app.",
      sessions: 1,
      pendingJobs: 1,
      lastSync: "18 min ago"
    }
  ] satisfies CloudSource[],
  ledger: {
    id: "sample-trace-001",
    agent: "Codex",
    query: "What should I say about Lore beta billing?",
    tokenBudget: 1400,
    usedTokens: 612,
    warnings: ["Billing is not live in beta — sample answer only."],
    items: [
      {
        id: "mem-cloud-2",
        memory: "This account is using the Lore beta. Don't claim live billing or general availability.",
        state: "used",
        reason: "Directly answered the question about claim boundaries."
      },
      {
        id: "profile-project-1",
        memory: "Beta product, no public stable release yet.",
        state: "retrieved",
        reason: "Included as supporting context."
      },
      {
        id: "inbox-3",
        memory: "Sensitive item from a recent transcript.",
        state: "risky",
        reason: "Held back from recall until you review it.",
        warning: "needs review"
      },
      {
        id: "old-pricing",
        memory: "Outdated alpha price copy.",
        state: "ignored",
        reason: "Skipped because newer pricing is in effect."
      }
    ]
  } satisfies BetaLedgerTrace,
  usage: [
    { label: "Capture tokens", used: 284000, limit: 1000000, eventType: "capture.extract" },
    { label: "Recall requests", used: 4200, limit: 25000, eventType: "recall.query" },
    { label: "Connected agents", used: 2, limit: 3, eventType: "agent.connection" }
  ] satisfies UsageMeter[],
  pricing: [
    {
      name: "Free beta",
      price: "$0",
      limits: "3 connected AI apps, 1M capture tokens, 25K recall requests",
      note: "Hard caps. No overage. No surprise billing.",
      current: true
    },
    {
      name: "Personal",
      price: "$2.99/mo",
      limits: "5 connected AI apps, 20M capture tokens, 100K recall, 90-day evidence",
      note: "Planned tier. Not on sale yet."
    },
    {
      name: "Builder",
      price: "$7.99/mo",
      limits: "15 connected AI apps, 75M capture tokens, 500K recall, persistent evidence",
      note: "Planned tier for heavy users. Not on sale yet."
    }
  ] satisfies PricingTier[]
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    health: "error",
    agentmemory: "unknown",
    memories: [],
    traces: [],
    ledgers: [],
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
  const [capturePaused, setCapturePaused] = useState(false);
  const [rawArchiveRequested, setRawArchiveRequested] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [deleteControl, setDeleteControl] = useState<"memory" | "source" | "vault" | null>(null);
  const [inboxItems, setInboxItems] = useState<MemoryInboxItem[]>(cloudFixture.inbox);
  const [profileItems, setProfileItems] = useState<CloudProfileItem[]>(cloudFixture.profile);
  const [session, setSession] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [liveAgentToken, setLiveAgentToken] = useState<LiveAgentToken | null>(null);
  const [tokenStatus, setTokenStatus] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inboxBusyId, setInboxBusyId] = useState<string | null>(null);
  const [sourceBusyId, setSourceBusyId] = useState<string | null>(null);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const cloudSources = useMemo(
    () =>
      cloudFixture.sources.map((source) =>
        capturePaused
          ? {
              ...source,
              status: "paused" as const,
              detail: "Paused. New memory will not be captured until you resume."
            }
          : source
      ),
    [capturePaused]
  );

  const cloudSummary = useMemo(() => {
    const connectedAgents = cloudFixture.agents.filter((agent) => agent.status === "connected").length;
    const sourceErrors = cloudSources.filter((source) => source.status === "error").length;
    const pendingJobs = cloudSources.reduce((total, source) => total + source.pendingJobs, 0);
    const inboxReview = inboxItems.filter((item) => item.status === "pending" || item.status === "review_required").length;
    return { connectedAgents, sourceErrors, pendingJobs, inboxReview };
  }, [cloudSources, inboxItems]);

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

  const ledgerByTraceId = useMemo(
    () => new Map(data.ledgers.map((ledger) => [ledger.traceId, ledger])),
    [data.ledgers]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      setError(`Google sign-in failed with status ${authError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
    void refreshSession();
    void refresh();
  }, []);

  async function refreshSession() {
    setAuthLoading(true);
    try {
      const me = await requestJson("/v1/me", { allowError: true });
      if (me?.account && me?.vault) {
        setSession(me as UserSession);
      } else {
        setSession(null);
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function refresh(nextProjectId = projectId) {
    setError("");
    try {
      const [health, agentmemory, memories, traces, ledgers, evalRuns, auditLogs] = await Promise.all([
        requestJson("/health", { allowError: true }),
        requestJson("/v1/integrations/agentmemory/health", { allowError: true }),
        requestJson(`/v1/memory/list?project_id=${encodeURIComponent(nextProjectId)}&limit=100`, { allowError: true }),
        requestJson(`/v1/traces?project_id=${encodeURIComponent(nextProjectId)}&limit=12`, { allowError: true }),
        requestJson(`/v1/evidence/ledgers?project_id=${encodeURIComponent(nextProjectId)}&limit=12`, { allowError: true }),
        requestJson(`/v1/eval/runs?project_id=${encodeURIComponent(nextProjectId)}&limit=20`, { allowError: true }),
        requestJson("/v1/audit-logs?limit=20", { allowError: true })
      ]);

      setData({
        health: health.status === "ok" ? "ok" : "error",
        agentmemory: typeof agentmemory.status === "string" ? agentmemory.status : "unknown",
        memories: Array.isArray(memories.memories) ? memories.memories : [],
        traces: Array.isArray(traces.traces) ? traces.traces : [],
        ledgers: Array.isArray(ledgers.ledgers) ? ledgers.ledgers : [],
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
    const method = options.method ?? "GET";
    if (method !== "GET") {
      const csrf = readCookie("lore_csrf");
      if (csrf) {
        headers.set("x-lore-csrf", csrf);
      }
    }
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(`/api/lore${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin"
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

  async function signInWithGoogle() {
    setError("");
    const started = await requestJson("/auth/google/start");
    if (typeof started.authorizationUrl !== "string") {
      throw new Error("Google authorization URL missing");
    }
    window.location.assign(started.authorizationUrl);
  }

  async function signOut() {
    await requestJson("/auth/logout", { method: "POST", body: {} });
    setSession(null);
    setLiveAgentToken(null);
    setTokenStatus("");
  }

  async function issueLiveAgentToken() {
    setError("");
    const isAdditional = Boolean(liveAgentToken);
    setTokenStatus(
      isAdditional
        ? "Preparing an additional connection link. Earlier connections stay active until you disconnect them."
        : "Preparing your connection link..."
    );
    const install = await requestJson("/v1/cloud/install-token", {
      method: "POST",
      body: { label: isAdditional ? "Dashboard additional connection" : "Dashboard one-click connection" }
    });
    if (typeof install.installToken !== "string") {
      throw new Error("Connection link was not returned");
    }
    setTokenStatus("Finishing the connection...");
    const paired = await requestJson("/v1/cloud/devices/pair", {
      method: "POST",
      body: {
        installToken: install.installToken,
        deviceLabel: isAdditional ? "Dashboard additional connection" : "Dashboard one-click connection",
        platform: "dashboard"
      }
    });
    setLiveAgentToken(paired as LiveAgentToken);
    setTokenStatus(
      isAdditional
        ? "New connection ready. Earlier connections are still active — use Disconnect to end any you no longer need."
        : "Connected. Open developer view to copy the link if you need it for setup."
    );
  }

  async function revokeLiveAgentToken() {
    if (!liveAgentToken) return;
    await requestJson("/v1/cloud/tokens/revoke", {
      method: "POST",
      body: { token: liveAgentToken.deviceToken }
    });
    setLiveAgentToken(null);
    setTokenStatus("This connection is disconnected. Other connections you issued are not affected.");
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

  async function approveInboxCandidate(id: string) {
    setInboxBusyId(id);
    setError("");
    try {
      await requestJson(`/v1/memory-inbox/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        body: {}
      });
      updateInboxStatus(id, "approved");
    } catch (workError) {
      setError(errorMessage(workError));
    } finally {
      setInboxBusyId(null);
    }
  }

  async function rejectInboxCandidate(id: string, reason: string) {
    setInboxBusyId(id);
    setError("");
    try {
      await requestJson(`/v1/memory-inbox/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        body: { reason }
      });
      updateInboxStatus(id, "rejected");
    } catch (workError) {
      setError(errorMessage(workError));
    } finally {
      setInboxBusyId(null);
    }
  }

  async function pauseSource(id: string) {
    setSourceBusyId(id);
    setError("");
    try {
      await requestJson(`/v1/sources/${encodeURIComponent(id)}/pause`, {
        method: "POST",
        body: {}
      });
    } catch (workError) {
      setError(errorMessage(workError));
    } finally {
      setSourceBusyId(null);
    }
  }

  async function resumeSource(id: string) {
    setSourceBusyId(id);
    setError("");
    try {
      await requestJson(`/v1/sources/${encodeURIComponent(id)}/resume`, {
        method: "POST",
        body: {}
      });
    } catch (workError) {
      setError(errorMessage(workError));
    } finally {
      setSourceBusyId(null);
    }
  }

  async function loadSampleMemory() {
    setError("");
    setSampleLoaded(true);
    setInboxItems((current) =>
      current.some((item) => item.id === "sample-quickstart")
        ? current
        : [
            {
              id: "sample-quickstart",
              candidate: "Lore demo: try Approve, Edit, or Delete to feel the review loop without an AI app connected.",
              type: "demo",
              scope: "user",
              source: "Sample · Lore demo",
              confidence: 0.9,
              risk: "low",
              status: "pending",
              reason: "Loaded for the first-run guide so you can practice the review loop before connecting an AI app."
            },
            ...current
          ]
    );
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

  function updateInboxStatus(id: string, status: MemoryInboxStatus) {
    setInboxItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  function updateProfileValue(id: string, value: string) {
    setProfileItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, value, status: item.status === "delete_pending" ? "delete_pending" : "edited" }
          : item
      )
    );
  }

  function markProfileDelete(id: string) {
    setProfileItems((current) => current.map((item) => item.id === id ? { ...item, status: "delete_pending" } : item));
  }

  const memoryActionMeta = memoryActionDraft ? describeMemoryAction(memoryActionDraft.mode) : null;
  const memoryActionNeedsContent = memoryActionDraft ? memoryActionDraft.mode === "edit" || memoryActionDraft.mode === "supersede" : false;
  const memoryActionNeedsReason = memoryActionDraft ? memoryActionDraft.mode === "reject" || memoryActionDraft.mode === "forget" : false;
  const memoryActionDisabled = busy
    || !memoryActionDraft
    || (memoryActionNeedsContent && !memoryActionDraft.content.trim())
    || (memoryActionNeedsReason && !memoryActionDraft.reason.trim());

  const hasConnectedAgent = Boolean(liveAgentToken) || cloudFixture.agents.some((agent) => agent.status === "connected");
  const hasReviewedInbox = inboxItems.some((item) =>
    item.status === "approved"
      || item.status === "rejected"
      || item.status === "accepted"
      || item.status === "edited"
      || item.status === "deleted"
  );
  const hasMemoryUsed = data.memories.length > 0 || data.traces.length > 0;
  const firstRunSteps: FirstRunStep[] = [
    {
      id: "signin",
      label: "Sign in with Google",
      detail: session ? "Done. Your private vault is ready." : "Sign in to create your private vault. We never read other apps until you connect one.",
      status: session ? "done" : "current"
    },
    {
      id: "connect",
      label: "Connect your first AI app or load a sample",
      detail: hasConnectedAgent
        ? "An AI app is connected. New sessions will appear in your Inbox to review."
        : sampleLoaded
          ? "Sample loaded — practice the review loop in your Inbox before connecting a real app."
          : "Pick an AI app to connect, or load a sample to see how Lore works without installing anything.",
      status: hasConnectedAgent || sampleLoaded ? "done" : session ? "current" : "queued"
    },
    {
      id: "review",
      label: "Review your first suggested memory",
      detail: hasReviewedInbox
        ? "You've reviewed at least one suggestion. Lore only reuses memories you keep."
        : "Open the Inbox below. You decide what is kept, edited, or deleted before any memory is reused.",
      status: hasReviewedInbox ? "done" : (hasConnectedAgent || sampleLoaded) ? "current" : "queued"
    },
    {
      id: "recall",
      label: "Use memory in an AI app",
      detail: hasMemoryUsed
        ? "Your AI apps can recall this memory with a clear evidence trail."
        : "After approval, your AI apps can recall this memory with a clear evidence trail.",
      status: hasMemoryUsed ? "done" : hasReviewedInbox ? "current" : "queued"
    }
  ];

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Lore</h1>
          <p>
            {session
              ? "Your private memory across AI apps. Lore captures useful context, you decide what is kept, and your AI apps can recall it with evidence."
              : "Sign in to start a private memory vault. Lore only reads the AI apps you connect, and you decide what is kept, edited, or deleted."}
          </p>
          <div className="topbarMeta">
            <span className={data.health === "ok" ? "statusBadge ok" : "statusBadge warn"}>
              {data.health === "ok" ? "Lore service is up" : "Lore service unreachable"}
            </span>
            <button
              type="button"
              className="muted advancedToggle"
              onClick={() => setShowAdvanced((value) => !value)}
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? "Hide developer view" : "Developer view"}
            </button>
          </div>
        </div>
        <div className="connection" aria-label="Service health">
          <span className={data.health === "ok" ? "dot ok" : "dot"} />
          {data.health === "ok" ? "Service ready" : "Service unreachable"}
        </div>
      </header>

      {showAdvanced ? (
        <section className="toolbar" aria-label="Developer controls">
          <label>
            Project
            <input value={projectId} onChange={(event) => setProjectId(event.currentTarget.value)} />
          </label>
          <label>
            API key
            <input value={apiKey} onChange={(event) => setApiKey(event.currentTarget.value)} placeholder="optional local key" />
          </label>
          <div className="toolbarActions">
            <span className={`statusBadge ${demoState.tone}`}>{demoState.label}</span>
            <button type="button" className="muted" onClick={loadDemo} disabled={busy}>Load demo dataset</button>
            <button type="button" onClick={() => void refresh()} disabled={busy}>Refresh</button>
          </div>
        </section>
      ) : null}

      {error ? <pre className="error">{error}</pre> : null}

      <section className="userGate" aria-label="Account access">
        <div>
          <h2>{session ? "You're signed in" : "Step 1: Sign in"}</h2>
          <p>
            {session
              ? `${session.account.displayName ?? session.account.email ?? "Signed-in user"} · ${session.vault.name}`
              : "Sign in with Google. Lore creates a private vault for you. We never read other apps until you connect one."}
          </p>
        </div>
        <div className="userGateActions">
          {authLoading ? <span className="statusBadge muted">Checking session</span> : null}
          {session ? (
            <>
              <button type="button" className="muted" onClick={() => void refreshSession()} disabled={busy}>Refresh session</button>
              <button type="button" className="danger" onClick={() => void runBusy(signOut)} disabled={busy}>Sign out</button>
            </>
          ) : (
            <button type="button" onClick={() => void runBusy(signInWithGoogle)} disabled={busy || authLoading}>Continue with Google</button>
          )}
        </div>
      </section>

      <section className="cloudSummary" aria-label="Personal cloud beta summary">
        <Metric label="Connected agents" value={`${cloudSummary.connectedAgents}/${cloudFixture.agents.length}`} />
        <Metric label="Inbox review" value={cloudSummary.inboxReview} />
        <Metric label="Capture jobs" value={cloudSummary.pendingJobs} />
        <Metric label="Source errors" value={cloudSummary.sourceErrors} />
        <Metric label="Beta plan" value={cloudFixture.plan} />
      </section>

      <section className="cloudGrid">
        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Your first 4 steps</h2>
              <p>What to do next. The dashboard updates as you complete each step.</p>
            </div>
            <span className="statusBadge muted">{cloudFixture.vaultName}</span>
          </div>
          <FirstRunGuide
            steps={firstRunSteps}
            isSignedIn={Boolean(session)}
            sampleLoaded={sampleLoaded}
            onLoadSample={() => void loadSampleMemory()}
            busy={busy}
          />
        </section>

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Connect an AI app</h2>
              <p>Pick an AI app to connect. Lore only sees what you authorize, summary-only by default.</p>
            </div>
          </div>
          <SourceAuthorizationPanel
            consentAccepted={consentAccepted}
            onAccept={() => setConsentAccepted(true)}
            onReset={() => setConsentAccepted(false)}
          />
          <ConnectAgentPanel
            setup={cloudFixture.installToken}
            isSignedIn={Boolean(session)}
            busy={busy}
            token={liveAgentToken}
            status={tokenStatus}
            showAdvanced={showAdvanced}
            consentAccepted={consentAccepted}
            onIssue={() => void runBusy(issueLiveAgentToken)}
            onRevoke={() => void runBusy(revokeLiveAgentToken)}
          />
        </section>

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Connected AI apps</h2>
              <p>Status of the AI apps that can read or write memory in your vault.</p>
            </div>
          </div>
          <ConnectedAgents agents={cloudFixture.agents} />
        </section>
      </section>

      <section className="cloudGrid cloudGridWide">
        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Memory Inbox</h2>
              <p>Suggested memories wait here until you approve or remove them. Sensitive items are held back until you review.</p>
            </div>
            {!sampleLoaded && !hasConnectedAgent ? (
              <button type="button" className="muted" onClick={() => void loadSampleMemory()} disabled={busy}>
                Load sample
              </button>
            ) : null}
          </div>
          <MemoryInbox
            items={inboxItems}
            busyId={inboxBusyId}
            onApprove={(id) => void approveInboxCandidate(id)}
            onReject={(id) => void rejectInboxCandidate(id, "dashboard reject")}
            onLocalStatus={updateInboxStatus}
          />
        </section>

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>What Lore is keeping</h2>
              <p>Approved memories show what was kept, where it came from, and how confident Lore is.</p>
            </div>
          </div>
          <CloudMemoryFeed items={cloudFixture.memoryFeed} />
        </section>
      </section>

      <section className="cloudGrid cloudGridWide">
        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Connected sources</h2>
              <p>Each AI app connection. Pause to stop new memory from being captured. Resume when ready.</p>
            </div>
          </div>
          <SourceSyncPanel
            sources={cloudSources}
            busyId={sourceBusyId}
            onPause={(id) => void pauseSource(id)}
            onResume={(id) => void resumeSource(id)}
          />
        </section>

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>What Lore knows about you</h2>
              <p>The kinds of details Lore has noticed. You can read or remove items in the Memory Inbox above.</p>
            </div>
          </div>
          <ProfileSummary items={profileItems} />
          {showAdvanced ? (
            <details className="advancedDetails">
              <summary>Advanced: edit profile values (preview)</summary>
              <p className="inlineNote">
                Profile editing is not yet enabled in beta. Changes here are local previews and are not saved.
              </p>
              <ProfileEditor items={profileItems} onEdit={updateProfileValue} onDelete={markProfileDelete} />
            </details>
          ) : null}
        </section>
      </section>

      <section className="cloudGrid cloudGridWide">
        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Why a memory was used</h2>
              <p>When an AI app pulls memory from Lore, you can see exactly what was used, what was held back, and why.</p>
            </div>
          </div>
          <EvidenceLedgerPanel trace={cloudFixture.ledger} showAdvanced={showAdvanced} />
        </section>

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Privacy &amp; controls</h2>
              <p>Pause capture, keep transcripts off, export your memory, or delete it. You stay in control.</p>
            </div>
          </div>
          <PrivacyControls
            capturePaused={capturePaused}
            rawArchiveRequested={rawArchiveRequested}
            privateMode={privateMode}
            exportRequested={exportRequested}
            deleteControl={deleteControl}
            showAdvanced={showAdvanced}
            onToggleCapture={() => setCapturePaused((value) => !value)}
            onToggleRawArchive={() => setRawArchiveRequested((value) => !value)}
            onTogglePrivateMode={() => setPrivateMode((value) => !value)}
            onRequestExport={() => setExportRequested(true)}
            onSelectDelete={setDeleteControl}
          />
        </section>
      </section>

      <section className="cloudGrid cloudGridWide">
        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Usage</h2>
              <p>How much of your free beta you've used. Hard caps, no overage, no surprise charges.</p>
            </div>
            <span className="statusBadge warn">Billing not in beta</span>
          </div>
          <UsagePanel
            meters={cloudFixture.usage}
            tiers={cloudFixture.pricing}
            plan={cloudFixture.plan}
            showAdvanced={showAdvanced}
          />
        </section>
      </section>

      {showAdvanced ? (
      <>
      <section className="metrics" aria-label="Developer metrics">
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
                {data.memories.length === 0 ? <EmptyRow span={4} label="Connect your first agent to start a memory feed" /> : data.memories.slice(0, 30).map((memory) => (
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
                <tr><th>Query</th><th>Route</th><th>Evidence</th><th>Budget</th><th>Feedback</th></tr>
              </thead>
              <tbody>
                {data.traces.length === 0 ? <EmptyRow span={5} label="Connect your first agent to generate trace evidence" /> : data.traces.slice(0, 12).map((trace) => (
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
                      <LedgerSummary ledger={ledgerByTraceId.get(trace.id)} />
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
      </>
      ) : null}
    </main>
  );
}

function OnboardingChecklist({ steps }: { steps: CloudOnboardingStep[] }) {
  return (
    <ol className="checklist">
      {steps.map((step) => (
        <li className="checklistItem" key={step.id}>
          <span className={`stepMarker ${stepTone(step.status)}`}>{stepStatusLabel(step.status)}</span>
          <div>
            <div className="strongLine">{step.label}</div>
            <small>{step.detail}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FirstRunGuide({
  steps,
  isSignedIn,
  sampleLoaded,
  onLoadSample,
  busy
}: {
  steps: FirstRunStep[];
  isSignedIn: boolean;
  sampleLoaded: boolean;
  onLoadSample: () => void;
  busy: boolean;
}) {
  return (
    <div>
      <ol className="checklist">
        {steps.map((step) => (
          <li className="checklistItem" key={step.id}>
            <span className={`stepMarker ${firstRunTone(step.status)}`}>{firstRunLabel(step.status)}</span>
            <div>
              <div className="strongLine">{step.label}</div>
              <small>{step.detail}</small>
            </div>
          </li>
        ))}
      </ol>
      {isSignedIn && !sampleLoaded ? (
        <div className="firstRunSample">
          <div>
            <div className="strongLine">No AI app to connect right now?</div>
            <small>Load a sample memory and try the review loop in your Inbox without installing anything.</small>
          </div>
          <button type="button" className="muted" onClick={onLoadSample} disabled={busy}>
            Try with sample memory
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SourceAuthorizationPanel({
  consentAccepted,
  onAccept,
  onReset
}: {
  consentAccepted: boolean;
  onAccept: () => void;
  onReset: () => void;
}) {
  return (
    <div className={consentAccepted ? "consentPanel ok" : "consentPanel"}>
      <div className="strongLine">What Lore captures from a connected AI app</div>
      <ul className="consentList">
        <li><strong>What we capture:</strong> session summaries you authorize, useful preferences, and project facts you confirm in the Inbox.</li>
        <li><strong>What we don't:</strong> raw transcripts (off by default), other apps you didn't connect, anything from before you connected.</li>
        <li><strong>You stay in control:</strong> pause anytime, mark items private, export your memory, or delete it.</li>
        <li><strong>What's saved:</strong> only the memories you keep are reused — Inbox suggestions are never used until you approve.</li>
      </ul>
      <div className="consentActions">
        {consentAccepted ? (
          <>
            <span className="pill ok">Accepted</span>
            <button type="button" className="muted" onClick={onReset}>Change</button>
          </>
        ) : (
          <button type="button" onClick={onAccept}>I understand — continue</button>
        )}
      </div>
    </div>
  );
}

function firstRunTone(status: FirstRunStep["status"]): ControlTone {
  if (status === "done") return "ok";
  if (status === "current") return "warn";
  return "muted";
}

function firstRunLabel(status: FirstRunStep["status"]) {
  if (status === "done") return "Done";
  if (status === "current") return "Now";
  return "Next";
}

function ConnectAgentPanel({
  setup,
  isSignedIn,
  busy,
  token,
  status,
  showAdvanced,
  consentAccepted,
  onIssue,
  onRevoke
}: {
  setup: ConnectAgentFixture;
  isSignedIn: boolean;
  busy: boolean;
  token: LiveAgentToken | null;
  status: string;
  showAdvanced: boolean;
  consentAccepted: boolean;
  onIssue: () => void;
  onRevoke: () => void;
}) {
  const command = token
    ? `npx -y @lore/cli@beta connect --api https://api.lorecontext.com --token ${token.serviceToken}`
    : setup.command;
  const canIssue = isSignedIn && consentAccepted && !busy;
  const issueDisabledReason = !isSignedIn
    ? "Sign in first."
    : !consentAccepted
      ? "Accept what Lore captures before connecting."
      : busy
        ? "Working..."
        : "";
  return (
    <div className="controlStack">
      <div className="controlRow">
        <div>
          <div className="strongLine">{token ? "Connection ready" : "Connect an AI app"}</div>
          <small>
            {token
              ? `Connected. This connection expires ${formatDate(token.serviceTokenExpiresAt)}. Issuing another link adds a new connection — earlier connections stay active until you disconnect them.`
              : "Get a one-time connection link to pair the AI app of your choice. Lore only captures what you authorize, summary-only by default."}
          </small>
        </div>
        <button type="button" onClick={onIssue} disabled={!canIssue} title={issueDisabledReason}>
          {token ? "Issue additional connection" : "Get connection link"}
        </button>
      </div>
      {token ? (
        <div className="controlRow">
          <div>
            <div className="strongLine">No longer need this connection?</div>
            <small>
              Disconnect ends this specific connection now. To remove a connection from a different device, open the AI app on that device and sign out, or contact support to revoke it.
            </small>
          </div>
          <button type="button" className="danger" onClick={onRevoke} disabled={busy}>
            Disconnect this connection
          </button>
        </div>
      ) : null}
      {status ? <div className="tokenStatus">{status}</div> : null}
      {!isSignedIn ? <small className="inlineNote">Sign in above to enable this step.</small> : null}
      {isSignedIn && !consentAccepted ? (
        <small className="inlineNote">Accept the source authorization above to enable this step.</small>
      ) : null}
      {token || showAdvanced ? (
        <details className="advancedDetails" open={showAdvanced}>
          <summary>Advanced: developer setup</summary>
          <p className="inlineNote">
            For technical users only. Treat the connection link like a password — never paste it into chat or share it.
          </p>
          <div className="connectCommand">
            <div className="commandHeader">
              <div>
                <div className="strongLine">{token ? "API token" : "Pairing link"}</div>
                <small>
                  {token
                    ? `device ${token.deviceId} / expires ${formatDate(token.serviceTokenExpiresAt)}`
                    : `${setup.tokenLabel} · ${setup.expiresIn}`}
                </small>
              </div>
              <span className={`pill ${token ? "ok" : "neutral"}`}>{token ? "live" : "not issued"}</span>
            </div>
            <code>{command}</code>
          </div>
          <small className="inlineNote">{token ? "Copy the command now. The full token is only shown once." : setup.fallback}</small>
          {token ? (
            <div className="tokenBox" aria-label="Issued token details">
              <label>
                Device token
                <textarea readOnly value={token.deviceToken} />
              </label>
              <label>
                API token
                <textarea readOnly value={token.serviceToken} />
              </label>
            </div>
          ) : null}
          <div className="disabledActionRow">
            <button
              type="button"
              className="muted"
              disabled={!token}
              onClick={() => token ? navigator.clipboard?.writeText(command) : undefined}
            >
              Copy command
            </button>
            <button type="button" className="danger" disabled={!token || busy} onClick={onRevoke}>Disconnect</button>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ConnectedAgents({ agents }: { agents: CloudAgentConnection[] }) {
  if (agents.length === 0) {
    return <ConnectFirstAgentEmpty />;
  }

  return (
    <div className="cloudRows">
      {agents.map((agent) => (
        <div className="cloudRow" key={agent.id}>
          <div>
            <div className="strongLine">{agent.name}</div>
            <small>{agent.client}</small>
          </div>
          <div>
            <span className={`pill ${agentTone(agent.status)}`}>{agentStatusLabel(agent.status)}</span>
            <small>{agent.scope}</small>
          </div>
          <div>
            <small>{agent.detail}</small>
            <small>{agent.lastSeen}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

function MemoryInbox({
  items,
  busyId,
  onApprove,
  onReject,
  onLocalStatus
}: {
  items: MemoryInboxItem[];
  busyId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onLocalStatus: (id: string, status: MemoryInboxStatus) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="connectEmpty">
        <div className="strongLine">No suggestions yet</div>
        <p>Connect an AI app or load a sample to see what Lore would suggest keeping.</p>
      </div>
    );
  }
  return (
    <div className="cloudRows">
      {items.map((item) => {
        const isBusy = busyId === item.id;
        const isSample = item.id === "sample-quickstart" || item.source.startsWith("Sample");
        return (
          <div className="inboxRow" key={item.id}>
            <div>
              <div className="strongLine">{item.candidate}</div>
              <small>{item.source}</small>
              <small>{item.reason}</small>
              {isSample ? <small className="pill neutral">Sample</small> : null}
            </div>
            <div className="metaStack">
              <Status
                status={item.status}
                risks={item.risk === "high" ? ["needs review"] : item.risk === "medium" ? ["review"] : []}
              />
              <small>{item.type} · {item.scope} · {percent(item.confidence)} confident</small>
            </div>
            <div className="actions">
              {item.status === "pending" || item.status === "review_required" ? (
                <button
                  type="button"
                  onClick={() => isSample ? onLocalStatus(item.id, "approved") : onApprove(item.id)}
                  disabled={isBusy}
                >
                  {item.status === "review_required" ? "Approve" : "Keep"}
                </button>
              ) : null}
              {item.status === "approved" || item.status === "accepted" ? (
                <span className="pill ok">Kept</span>
              ) : null}
              {item.status === "rejected" || item.status === "deleted" ? (
                <span className="pill neutral">Removed</span>
              ) : null}
              {item.status !== "deleted" && item.status !== "rejected" ? (
                <button
                  type="button"
                  className="danger"
                  onClick={() => isSample ? onLocalStatus(item.id, "deleted") : onReject(item.id)}
                  disabled={isBusy}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CloudMemoryFeed({ items }: { items: CloudMemoryFeedItem[] }) {
  if (items.length === 0) {
    return <ConnectFirstAgentEmpty />;
  }

  return (
    <table>
      <thead>
        <tr><th>Memory</th><th>Source</th><th>Lifecycle</th><th>Confidence</th></tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              <div>{item.summary}</div>
              <small>{item.id}</small>
            </td>
            <td>
              <div>{item.source}</div>
              <small>{item.capturedAt}</small>
            </td>
            <td>
              <span className={item.status === "review" ? "pill warn" : "pill ok"}>{item.status}</span>
              <small>{item.type} / {item.scope}</small>
            </td>
            <td><span className="rankBadge">{percent(item.confidence)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProfileEditor({
  items,
  onEdit,
  onDelete
}: {
  items: CloudProfileItem[];
  onEdit: (id: string, value: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="cloudRows">
      {items.map((item) => (
        <label className="profileEditorRow" key={item.id}>
          <div className="profileEditorMeta">
            <div>
              <div className="strongLine">{item.label}</div>
              <small>{item.kind} / {item.visibility} / {item.source}</small>
            </div>
            <div className="statusCell">
              <span className={item.status === "delete_pending" ? "pill risk" : item.status === "edited" ? "pill warn" : "pill ok"}>
                {item.status === "active" ? "active" : item.status === "edited" ? "local edit" : "delete pending"}
              </span>
              <span className="pill neutral">{percent(item.confidence)}</span>
            </div>
          </div>
          <textarea value={item.value} onChange={(event) => onEdit(item.id, event.currentTarget.value)} />
          <div className="disabledActionRow">
            <button type="button" className="muted" disabled title="Profile editing is not yet enabled in beta">Save (preview only)</button>
            <button type="button" className="danger" onClick={() => onDelete(item.id)}>Mark for delete</button>
          </div>
        </label>
      ))}
    </div>
  );
}

function ProfileSummary({ items }: { items: CloudProfileItem[] }) {
  if (items.length === 0) {
    return <p className="inlineNote">Lore hasn't noticed any persistent details yet.</p>;
  }
  return (
    <div className="cloudRows">
      {items.map((item) => (
        <div className="profileRow" key={item.id}>
          <div>
            <div className="strongLine">{item.label}</div>
            <small>{item.kind} · {item.visibility}</small>
          </div>
          <p>{item.value}</p>
          <span className="pill neutral">{percent(item.confidence)}</span>
        </div>
      ))}
      <small className="inlineNote">
        To remove an item, find it in the Memory Inbox above and choose Delete.
      </small>
    </div>
  );
}

function EvidenceLedgerPanel({ trace, showAdvanced }: { trace: BetaLedgerTrace; showAdvanced: boolean }) {
  return (
    <div className="controlStack">
      <div className="ledgerHeader">
        <div>
          <div className="strongLine">{trace.query}</div>
          <small>Asked by {trace.agent} · {trace.usedTokens} of {trace.tokenBudget} tokens used</small>
        </div>
        <span className={trace.warnings.length ? "pill warn" : "pill ok"}>
          {trace.warnings.length ? `${trace.warnings.length} warnings` : "no warnings"}
        </span>
      </div>
      {trace.warnings.length ? (
        <div className="ledgerWarnings">
          {trace.warnings.map((warning) => <span className="pill warn" key={warning}>{warning}</span>)}
        </div>
      ) : null}
      <table>
        <thead>
          <tr><th>State</th><th>Memory</th><th>Why</th></tr>
        </thead>
        <tbody>
          {trace.items.map((item) => (
            <tr key={item.id}>
              <td><span className={`pill ${ledgerTone(item.state)}`}>{item.state}</span></td>
              <td>
                <div>{item.memory}</div>
                {item.warning ? <small>{item.warning}</small> : null}
              </td>
              <td>{item.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <small className="inlineNote">
        This is a sample. When your AI apps recall memory, you'll see the same evidence here for each real query.
      </small>
      {showAdvanced ? (
        <small className="monoLabel">trace id: {trace.id}</small>
      ) : null}
    </div>
  );
}

function SourceSyncPanel({
  sources,
  busyId,
  onPause,
  onResume
}: {
  sources: CloudSource[];
  busyId: string | null;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  if (sources.length === 0) {
    return (
      <div className="connectEmpty">
        <div className="strongLine">Nothing connected yet</div>
        <p>Connect an AI app above to see capture status here.</p>
      </div>
    );
  }
  return (
    <div className="cloudRows">
      {sources.map((source) => {
        const isBusy = busyId === source.id;
        const isPaused = source.status === "paused";
        const isError = source.status === "error";
        return (
          <div className="cloudRow" key={source.id}>
            <div>
              <div className="strongLine">{source.name}</div>
              <small>{source.provider}</small>
            </div>
            <div>
              <span className={`pill ${sourceTone(source.status)}`}>{sourceStatusLabel(source.status)}</span>
              <small>last seen {source.lastSync}</small>
            </div>
            <div className="actions">
              <small>{source.detail}</small>
              {isPaused ? (
                <button type="button" className="muted" onClick={() => onResume(source.id)} disabled={isBusy}>Resume</button>
              ) : (
                <button type="button" className="warn" onClick={() => onPause(source.id)} disabled={isBusy || isError}>Pause</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PrivacyControls({
  capturePaused,
  rawArchiveRequested,
  privateMode,
  exportRequested,
  deleteControl,
  showAdvanced,
  onToggleCapture,
  onToggleRawArchive,
  onTogglePrivateMode,
  onRequestExport,
  onSelectDelete
}: {
  capturePaused: boolean;
  rawArchiveRequested: boolean;
  privateMode: boolean;
  exportRequested: boolean;
  deleteControl: "memory" | "source" | "vault" | null;
  showAdvanced: boolean;
  onToggleCapture: () => void;
  onToggleRawArchive: () => void;
  onTogglePrivateMode: () => void;
  onRequestExport: () => void;
  onSelectDelete: (value: "memory" | "source" | "vault" | null) => void;
}) {
  return (
    <div className="controlStack">
      <div className="controlRow">
        <div>
          <div className="strongLine">Pause new capture</div>
          <small>
            {capturePaused
              ? "New capture is paused. Existing memory is unchanged."
              : "When connected, Lore captures session summaries you authorize. Pause anytime to stop new captures."}
          </small>
        </div>
        <button type="button" className={capturePaused ? "warn" : "muted"} onClick={onToggleCapture}>
          {capturePaused ? "Resume capture" : "Pause capture"}
        </button>
      </div>
      <div className="controlRow">
        <div>
          <div className="strongLine">Private mode</div>
          <small>
            {privateMode
              ? "Private mode is on. New sessions are not sent to Lore until you turn this off."
              : "Use private mode when you don't want any new memory captured for a while."}
          </small>
        </div>
        <button type="button" className={privateMode ? "warn" : "muted"} onClick={onTogglePrivateMode}>
          {privateMode ? "Private mode on" : "Enable private mode"}
        </button>
      </div>
      <div className="controlRow">
        <div>
          <div className="strongLine">Raw transcripts</div>
          <small>
            {rawArchiveRequested
              ? "Raw transcripts are on. Lore will store full conversation text, not just summaries."
              : "Off by default. Lore only stores summaries, not full transcripts."}
          </small>
        </div>
        <button type="button" className={rawArchiveRequested ? "warn" : "muted"} onClick={onToggleRawArchive}>
          {rawArchiveRequested ? "Raw transcripts on" : "Keep transcripts off"}
        </button>
      </div>
      <div className="controlRow">
        <div>
          <div className="strongLine">Export your memory</div>
          <small>
            {exportRequested
              ? "Export queued. We'll let you know when it's ready to download."
              : "You can export your memory anytime as a portable file."}
          </small>
        </div>
        <button type="button" className="muted" onClick={onRequestExport} disabled={exportRequested}>
          {exportRequested ? "Export queued" : "Request export"}
        </button>
      </div>
      {showAdvanced ? (
        <details className="advancedDetails" open>
          <summary>Advanced: delete requests</summary>
          <p className="inlineNote">
            Deletion is being rolled out gradually in beta. Use these to indicate intent — a Lore operator will
            confirm the action and complete the deletion.
          </p>
          <div className="buttonRow">
            <button type="button" className="danger" onClick={() => onSelectDelete("memory")}>Delete a memory</button>
            <button type="button" className="danger" onClick={() => onSelectDelete("source")}>Delete a source</button>
            <button type="button" className="danger" onClick={() => onSelectDelete("vault")}>Delete the whole vault</button>
          </div>
          {deleteControl ? (
            <div className="pendingDelete">
              <span className="pill risk">{deleteControl} deletion selected</span>
              <small className="inlineNote">A Lore operator will confirm before any data is removed.</small>
              <button type="button" className="muted" onClick={() => onSelectDelete(null)}>Clear</button>
            </div>
          ) : null}
        </details>
      ) : (
        <small className="inlineNote">
          Need to delete something? Open <strong>Developer view</strong> at the top right or contact support.
        </small>
      )}
    </div>
  );
}

function UsagePanel({
  meters,
  tiers,
  plan,
  showAdvanced
}: {
  meters: UsageMeter[];
  tiers: PricingTier[];
  plan: string;
  showAdvanced: boolean;
}) {
  return (
    <div className="controlStack">
      <div className="usageHeader">
        <div>
          <div className="strongLine">{plan}</div>
          <small>Hard caps. No overage. No surprise charges.</small>
        </div>
        <span className="pill neutral">No overage</span>
      </div>
      {meters.map((meter) => (
        <ProgressMeter key={meter.label} meter={meter} />
      ))}
      {showAdvanced ? (
        <details className="advancedDetails" open>
          <summary>Planned tiers (preview only)</summary>
          <p className="inlineNote">Pricing is a preview, not on sale during beta. No payment is collected.</p>
          <div className="pricingGrid">
            {tiers.map((tier) => (
              <div className={tier.current ? "pricingTier current" : "pricingTier"} key={tier.name}>
                <div className="pricingTierHeader">
                  <strong>{tier.name}</strong>
                  <span>{tier.price}</span>
                </div>
                <p>{tier.limits}</p>
                <small>{tier.note}</small>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <small className="inlineNote">
          Beta is free. Paid tiers are not available yet — see them under <strong>Developer view</strong>.
        </small>
      )}
    </div>
  );
}

function ProgressMeter({ meter }: { meter: UsageMeter }) {
  const percentage = Math.min(100, Math.round((meter.used / meter.limit) * 100));
  return (
    <div className="meterRow">
      <div className="meterLabel">
        <span>{meter.label}</span>
        <strong>{formatUsage(meter.used)} / {formatUsage(meter.limit)}</strong>
      </div>
      <small className="monoLabel">{meter.eventType}</small>
      <div className="meterTrack">
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ConnectFirstAgentEmpty() {
  return (
    <div className="connectEmpty">
      <div className="strongLine">Connect your first AI app</div>
      <p>Use the Connect panel above to pair an AI app, or load a sample to see how Lore works.</p>
    </div>
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

function LedgerSummary({ ledger }: { ledger?: EvidenceLedger }) {
  if (!ledger) {
    return <small>No ledger yet</small>;
  }

  const riskyRows = ledger.rows.filter((row) => row.riskTags.length > 0 || row.disposition === "blocked" || row.disposition === "missing").length;
  return (
    <div className="evidenceSummary">
      <span className="metricPill ok"><span>used</span><strong>{ledger.summary.composed}</strong></span>
      <span className={ledger.summary.ignored > 0 ? "metricPill warn" : "metricPill ok"}><span>ignored</span><strong>{ledger.summary.ignored}</strong></span>
      <span className={ledger.summary.warnings > 0 || riskyRows > 0 ? "metricPill risk" : "metricPill ok"}><span>risk</span><strong>{ledger.summary.warnings + riskyRows}</strong></span>
      {ledger.rows.slice(0, 2).map((row) => (
        <small key={`${row.memoryId}-${row.disposition}`}>{row.disposition}: {row.contentPreview}</small>
      ))}
    </div>
  );
}

function EmptyRow({ span, label }: { span: number; label: string }) {
  return <tr><td className="empty" colSpan={span}>{label}</td></tr>;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatUsage(value: number) {
  if (value >= 1000000) {
    return `${Number((value / 1000000).toFixed(1))}M`;
  }
  if (value >= 1000) {
    return `${Number((value / 1000).toFixed(1))}K`;
  }
  return String(value);
}

function stepTone(status: CloudStepStatus): ControlTone {
  if (status === "done") {
    return "ok";
  }
  if (status === "current") {
    return "warn";
  }
  if (status === "blocked") {
    return "risk";
  }
  return "muted";
}

function stepStatusLabel(status: CloudStepStatus) {
  if (status === "done") {
    return "Done";
  }
  if (status === "current") {
    return "Now";
  }
  if (status === "blocked") {
    return "Blocked";
  }
  return "Queued";
}

function agentTone(status: AgentConnectionStatus): ControlTone {
  if (status === "connected") {
    return "ok";
  }
  if (status === "pairing") {
    return "warn";
  }
  if (status === "error" || status === "revoked") {
    return "risk";
  }
  return "neutral";
}

function agentStatusLabel(status: AgentConnectionStatus) {
  if (status === "connected") {
    return "connected";
  }
  if (status === "pairing") {
    return "pairing";
  }
  if (status === "not_installed") {
    return "not installed";
  }
  if (status === "revoked") {
    return "revoked";
  }
  return "error";
}

function sourceTone(status: SourceSyncStatus): ControlTone {
  if (status === "healthy" || status === "syncing") {
    return "ok";
  }
  if (status === "paused" || status === "delete_pending") {
    return "warn";
  }
  return "risk";
}

function sourceStatusLabel(status: SourceSyncStatus) {
  if (status === "healthy") {
    return "healthy";
  }
  if (status === "syncing") {
    return "syncing";
  }
  if (status === "paused") {
    return "paused";
  }
  if (status === "delete_pending") {
    return "delete pending";
  }
  return "error";
}

function ledgerTone(state: LedgerItemState): "ok" | "warn" | "risk" | "neutral" {
  if (state === "used" || state === "retrieved") {
    return "ok";
  }
  if (state === "ignored" || state === "stale") {
    return "warn";
  }
  if (state === "risky" || state === "conflicting" || state === "missing") {
    return "risk";
  }
  return "neutral";
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

function readCookie(name: string): string | undefined {
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function errorMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }
  return JSON.stringify(value, null, 2);
}
