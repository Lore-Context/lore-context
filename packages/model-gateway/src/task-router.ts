export type TaskRoute = {
  provider: string;
  model: string;
  fallbacks: Array<{ provider: string; model: string }>;
};

type TaskRouteTable = Record<string, TaskRoute>;

export class UnknownTaskIdError extends Error {
  constructor(taskId: string) {
    super(`Unknown task ID: ${taskId}`);
    this.name = "UnknownTaskIdError";
  }
}

const DEFAULT_TASK_ROUTES = {
  wiki_rewriter: {
    provider: "openrouter",
    model: "google/gemini-3.1-flash-lite",
    fallbacks: [
      { provider: "anthropic", model: "claude-haiku-latest" },
      { provider: "local-qwen", model: "" },
    ],
  },
  graph_extractor: {
    provider: "openrouter",
    model: "qwen/qwen3.6-flash",
    fallbacks: [
      { provider: "openrouter", model: "google/gemini-3.1-flash-lite" },
      { provider: "local-qwen", model: "" },
    ],
  },
  butler_consolidation: {
    provider: "openrouter",
    model: "x-ai/grok-4.3",
    fallbacks: [
      { provider: "openrouter", model: "anthropic/claude-sonnet-4.6" },
      { provider: "anthropic", model: "claude-sonnet-4.6" },
    ],
  },
  conflict_detector: {
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4.6",
    fallbacks: [
      { provider: "anthropic", model: "claude-sonnet-4.6" },
      { provider: "deterministic-only", model: "" },
    ],
  },
  eval_judge: {
    provider: "openrouter",
    model: "anthropic/claude-opus-4.7",
    fallbacks: [{ provider: "anthropic", model: "claude-opus-4.7" }],
  },
} satisfies TaskRouteTable;

function cloneRoute(route: TaskRoute): TaskRoute {
  return {
    provider: route.provider,
    model: route.model,
    fallbacks: route.fallbacks.map((fallback) => ({ ...fallback })),
  };
}

function routeOverrideEnv(): string | undefined {
  return process.env.LORE_LLM_TASK_ROUTER_OVERRIDE ?? process.env.LORE_LLM_TASK_ROUTER_CONFIG;
}

function parseOverrideTable(): Partial<TaskRouteTable> {
  const raw = routeOverrideEnv();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Partial<TaskRouteTable>;
  } catch {
    return {};
  }
}

function buildRouteTable(): TaskRouteTable {
  const table: TaskRouteTable = Object.fromEntries(
    Object.entries(DEFAULT_TASK_ROUTES).map(([taskId, route]) => [taskId, cloneRoute(route)]),
  );

  for (const [taskId, override] of Object.entries(parseOverrideTable())) {
    if (!override || typeof override !== "object") {
      continue;
    }

    table[taskId] = {
      ...table[taskId],
      ...override,
      fallbacks: override.fallbacks
        ? override.fallbacks.map((fallback) => ({ ...fallback }))
        : table[taskId]?.fallbacks ?? [],
    };
  }

  return table;
}

export function routeForTask(taskId: string): TaskRoute {
  const route = buildRouteTable()[taskId];
  if (!route) {
    throw new UnknownTaskIdError(taskId);
  }

  return cloneRoute(route);
}
