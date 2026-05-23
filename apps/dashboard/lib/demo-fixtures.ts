import type {
  AppsData,
  BetaLedgerTrace,
  BillingData,
  CloudAgentConnection,
  CloudMemoryFeedItem,
  CloudOnboardingStep,
  CloudProfileItem,
  CloudSource,
  ConnectAgentFixture,
  CustomerOverviewData,
  DeveloperData,
  EvidenceData,
  InboxData,
  MemoryInboxItem,
  MemoriesData,
  PricingTier,
  PrivacyData,
  RouteResult,
  SettingsData,
  SourcesData,
  UsageMeter
} from "./contracts";

export const demoProjectId = "demo-private";
export const demoQuery = "继续 Lore 项目开发";
export const demoMemorySeed = "Lore should keep governed project memory auditable.";
export const defaultProviders = ["lore-local", "agentmemory-export"];
export const evalProviders = ["lore-local", "agentmemory-export", "external-mock"];
export const hostedMcpUrl = "https://api.lorecontext.com/mcp";

export const defaultDataset = JSON.stringify(
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

export interface DashboardDemoFixture {
  vaultName: string;
  plan: string;
  installToken: ConnectAgentFixture;
  onboarding: CloudOnboardingStep[];
  agents: CloudAgentConnection[];
  inbox: MemoryInboxItem[];
  memoryFeed: CloudMemoryFeedItem[];
  profile: CloudProfileItem[];
  sources: CloudSource[];
  ledger: BetaLedgerTrace;
  usage: UsageMeter[];
  pricing: PricingTier[];
}

export interface DemoFixtureBoundary {
  state: "success" | "config-missing";
  fixtures: DashboardDemoFixture;
}

export function hostedMcpSetup(serviceToken: string): string {
  return [
    `MCP URL: ${hostedMcpUrl}`,
    `Authorization: Bearer ${serviceToken}`
  ].join("\n");
}

const emptyFixture: DashboardDemoFixture = {
  vaultName: "Private vault",
  plan: "Unavailable",
  installToken: {
    tokenLabel: "disabled",
    expiresIn: "n/a",
    command: "",
    fallback: "Preview data is disabled in this environment.",
    status: "ready"
  },
  onboarding: [],
  agents: [],
  inbox: [],
  memoryFeed: [],
  profile: [],
  sources: [],
  ledger: {
    id: "no-demo-ledger",
    agent: "Lore",
    query: "Preview data disabled",
    tokenBudget: 0,
    usedTokens: 0,
    warnings: ["Preview fixtures are disabled for this environment."],
    items: []
  },
  usage: [],
  pricing: []
};

const fixture: DashboardDemoFixture = {
  vaultName: "Your personal vault",
  plan: "Free beta",
  installToken: {
    tokenLabel: "one-time connection",
    expiresIn: "10 min",
    command: hostedMcpSetup("<connection-token>"),
    fallback: "If your AI app supports remote MCP, use https://api.lorecontext.com/mcp with the connection token. Never share a connection link in support chat.",
    status: "ready"
  },
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
  ],
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
  ],
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
  ],
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
  ],
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
  ],
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
  ],
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
  },
  usage: [
    { label: "Capture tokens", used: 284000, limit: 1000000, eventType: "capture.extract" },
    { label: "Recall requests", used: 4200, limit: 25000, eventType: "recall.query" },
    { label: "Connected agents", used: 2, limit: 3, eventType: "agent.connection" }
  ],
  pricing: [
    {
      name: "Free beta",
      price: "$0",
      limits: "3 connected AI apps, 1M capture tokens, 25K recall requests",
      note: "Hard caps. No overage. No surprise billing.",
      current: true
    },
    {
      name: "Go",
      price: "$9.99/mo",
      limits: "Unlimited connected AI apps, 50K add-memory calls, 10K recall calls",
      note: "Planned tier. Not on sale yet."
    },
    {
      name: "Plus",
      price: "$19.99/mo",
      limits: "Unlimited connected AI apps, 150K add-memory calls, 50K recall calls",
      note: "Planned tier for heavy users. Not on sale yet."
    },
    {
      name: "Pro",
      price: "$99.99/mo",
      limits: "Unlimited connected AI apps, 1M add-memory calls, 500K recall calls",
      note: "Planned high-volume tier. Not on sale yet."
    }
  ]
};

export function getDashboardDemoBoundary(env: { nodeEnv?: string; demoEnabled?: string | boolean } = {}): DemoFixtureBoundary {
  const demoEnabled = env.demoEnabled === true || env.demoEnabled === "1" || env.demoEnabled === "true";
  const implicitTestFixture = env.nodeEnv === "test" && env.demoEnabled === undefined;
  if (!demoEnabled && !implicitTestFixture) {
    return { state: "config-missing", fixtures: emptyFixture };
  }
  return { state: "success", fixtures: fixture };
}

export function routeDemoData(boundary: DemoFixtureBoundary) {
  const data = boundary.fixtures;
  return {
    "customer-overview": routeResult<CustomerOverviewData>(boundary.state, {
      session: null,
      dashboard: {
        health: "error",
        agentmemory: "unknown",
        memories: [],
        traces: [],
        ledgers: [],
        evalRuns: [],
        auditLogs: []
      },
      systemStatus: {
        captureWorker: "unknown",
        embeddingProvider: "unknown",
        graphEnabled: false,
        savedMemoryCount: 0
      }
    }),
    apps: routeResult<AppsData>(boundary.state, {
      agents: data.agents,
      installToken: data.installToken
    }),
    sources: routeResult<SourcesData>(boundary.state, {
      sources: data.sources
    }),
    inbox: routeResult<InboxData>(boundary.state, { items: data.inbox }),
    memories: routeResult<MemoriesData>(boundary.state, {
      memories: [],
      profile: data.profile,
      feed: data.memoryFeed
    }),
    evidence: routeResult<EvidenceData>(boundary.state, {
      ledgers: [],
      sampleTrace: data.ledger
    }),
    privacy: routeResult<PrivacyData>(boundary.state, {
      capturePaused: false,
      rawArchiveRequested: false,
      privateMode: false,
      exportRequested: false
    }),
    developer: routeResult<DeveloperData>(boundary.state, {
      hostedMcpUrl,
      liveAgentToken: null
    }),
    billing: routeResult<BillingData>(boundary.state, {
      usage: data.usage,
      pricing: data.pricing,
      plan: data.plan
    }),
    settings: routeResult<SettingsData>(boundary.state, {
      onboarding: data.onboarding,
      vaultName: data.vaultName
    })
  };
}

function routeResult<T>(state: "success" | "config-missing", data: T): RouteResult<T> {
  if (state === "config-missing") {
    return { state: "config-missing", error: "Dashboard preview data is disabled in production unless NEXT_PUBLIC_LORE_DASHBOARD_DEMO=1." };
  }
  return { state: "success", data };
}
