/**
 * @lore-context/sdk-middleware — core wrapper
 *
 * Status: S2 (OpenAI hybrid-mode inject). S3/S4/S5/S6/S8/S9 to follow.
 *
 * Architecture (per plan §2 Lane S):
 *  - `withMemoryHooks(client, lore, opts)` returns a Proxy of `client`
 *  - On `client.chat.completions.create(params)` (OpenAI) or
 *    `client.messages.create(params)` (Anthropic, S3):
 *      pre_llm_call:  query Lore via `contextQuery`, inject `contextBlock` as system
 *      post_llm_call: (S6+) POST to `memoryWrite`
 */

import type { MiddlewareOptions, MiddlewareMode, SubscriptionTier } from "./types.js";
import {
  LORE_MIDDLEWARE_MARKER,
  LoreMiddlewareDoubleWrapError,
  TIER_TOKEN_MAX,
} from "./types.js";
import {
  extractLastUserMessage,
  injectIntoMessages,
  type OpenAIMessage,
} from "./openai-adapter.js";
import {
  extractLastUserMessageAnthropic,
  injectIntoAnthropicSystem,
  type AnthropicMessage,
  type AnthropicSystemParam,
} from "./anthropic-adapter.js";

const DEFAULT_PREAMBLE = "Relevant memories (prioritize when conflicting):\n";
const DEFAULT_RECALL_MAX_TOKENS = 4096;
const DEFAULT_INJECT_TIMEOUT_MS = 2000;
const DEFAULT_RETAIN_SOURCE_TAG_OPENAI = "openai-chat";
const DEFAULT_RETAIN_SOURCE_TAG_ANTHROPIC = "anthropic-messages";

/**
 * Marker substrings that, if present in a candidate retention payload, cause
 * the middleware to skip retention. These prevent the auto-retain loop where
 * Lore's own inject markup gets captured back as a "new memory" (S8).
 * Server-side dedup (cosine + idempotency_key) is the second line of defense.
 */
const RETAIN_LOOP_MARKERS = ["<memory_capture>", "<recalled>"];

function payloadContainsLoopMarker(text: string): boolean {
  for (const marker of RETAIN_LOOP_MARKERS) {
    if (text.includes(marker)) return true;
  }
  return false;
}

function extractOpenAIAssistantContent(response: unknown): string | null {
  if (typeof response !== "object" || response === null) return null;
  const choices = (response as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const content = choices[0]?.message?.content;
  if (typeof content === "string") return content;
  return null;
}

function extractAnthropicAssistantContent(response: unknown): string | null {
  if (typeof response !== "object" || response === null) return null;
  const content = (response as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p) => typeof p === "object" && p !== null && (p as { type?: string }).type === "text")
      .map((p) => (p as { text?: string }).text ?? "")
      .filter((s) => s.length > 0)
      .join("\n");
  }
  return null;
}

/**
 * v2.0.3 Lane X tier-resolver — caches tier from `contextQuery` response and
 * caps `recallMaxTokens` to the tier's hard max.
 *
 * Behavior (revised per PR #209 critic-review H4):
 *  - **Call #1 (tier unknown)**: cap to TIER_TOKEN_MAX["free"] (512). Free
 *    users get exactly the documented Lane X X1 behavior on call #1. Paid
 *    users see ONE suboptimal call; from call #2 onward, the cached tier
 *    governs.
 *  - **Call #2+ (tier cached)**: cap to TIER_TOKEN_MAX[cachedTier].
 *
 * Warning is emitted once per client instance when user-supplied
 * recallMaxTokens > cap (either #1's free-default or #2+'s cached tier).
 *
 * Server is the cap-of-record either way; the client-side cap saves
 * bandwidth + telemetry noise on the very first call.
 */
function createTierResolver(options: MiddlewareOptions): {
  resolveBudget: () => number;
  recordTier: (tier: string | undefined) => void;
} {
  let cachedTier: SubscriptionTier | null = null;
  let warnedExceededCap = false;
  const userSuppliedBudget = options.recallMaxTokens;
  const defaultBudget = userSuppliedBudget ?? DEFAULT_RECALL_MAX_TOKENS;

  function resolveBudget(): number {
    const effectiveTier: SubscriptionTier = cachedTier ?? "free";
    const max = TIER_TOKEN_MAX[effectiveTier] ?? TIER_TOKEN_MAX.free;
    if (userSuppliedBudget !== undefined && userSuppliedBudget > max && !warnedExceededCap) {
      warnedExceededCap = true;
      const tierLabel = cachedTier === null ? `'free' (default until tier resolved)` : `'${cachedTier}'`;
      console.warn(
        `[lore-middleware] recallMaxTokens=${userSuppliedBudget} exceeds tier ${tierLabel} max of ${max}; capping to ${max}. (one-time warning per client)`,
      );
    }
    return Math.min(defaultBudget, max);
  }

  function recordTier(tier: string | undefined): void {
    if (cachedTier !== null) return;
    if (tier === "free" || tier === "go" || tier === "plus" || tier === "pro") {
      cachedTier = tier;
    }
  }

  return { resolveBudget, recordTier };
}

async function maybeRetain(
  lore: LoreClientLike,
  userMsg: string,
  assistantMsg: string | null,
  options: MiddlewareOptions,
  middlewareCallId: string,
  defaultSourceTag: string,
): Promise<void> {
  if (!assistantMsg || assistantMsg.length === 0) return;
  if (typeof lore.memoryWrite !== "function") return;
  const mode = options.mode ?? "hybrid";
  if (mode === "tools") return;

  // S8 pre-filter: marker-containing payloads are short-circuited
  if (payloadContainsLoopMarker(userMsg) || payloadContainsLoopMarker(assistantMsg)) {
    options.onRetainAudit?.({
      skipped: true,
      reason: "filtered_marker",
      callId: middlewareCallId,
    });
    return;
  }

  const source = options.retainSourceTag ?? defaultSourceTag;
  try {
    await lore.memoryWrite({
      content: { user_msg: userMsg, assistant_msg: assistantMsg, source },
      scope: "user",
      memory_type: "conversation_turn",
      idempotency_key: middlewareCallId,
    });
    options.onRetainAudit?.({ skipped: false, callId: middlewareCallId });
  } catch {
    options.onRetainAudit?.({
      skipped: true,
      reason: "transport_error",
      callId: middlewareCallId,
    });
  }
}

/**
 * Minimal duck-typed surface of `LoreContextApiClient.contextQuery` / `.memoryWrite`.
 * Real client comes from `@lore-context/sdk` but we type structurally to keep
 * the middleware decoupled and testable with mocks.
 */
export interface LoreClientLike {
  contextQuery(request: {
    query: string;
    mode?: string;
    token_budget?: number;
    [k: string]: unknown;
  }): PromiseLike<{ contextBlock?: string; tier?: string; [k: string]: unknown }>;
  memoryWrite?(request: {
    content: unknown;
    scope?: string;
    memory_type?: string;
    idempotency_key?: string;
    [k: string]: unknown;
  }): PromiseLike<unknown>;
}

function injectEnabledFor(mode: MiddlewareMode): boolean {
  return mode === "hybrid" || mode === "context";
}

function isOpenAILikeClient(client: unknown): boolean {
  return (
    typeof client === "object" &&
    client !== null &&
    typeof (client as { chat?: { completions?: { create?: unknown } } }).chat
      ?.completions?.create === "function"
  );
}

function isAnthropicLikeClient(client: unknown): boolean {
  if (typeof client !== "object" || client === null) return false;
  const c = client as {
    messages?: { create?: unknown };
    chat?: { completions?: { create?: unknown } };
  };
  // Anthropic has `messages.create` at the top level; OpenAI has `chat.completions.create`.
  // Disambiguate by checking for messages.create AND absence of chat.completions.create.
  return (
    typeof c.messages?.create === "function" &&
    typeof c.chat?.completions?.create !== "function"
  );
}

async function callContextQueryWithTimeout(
  lore: LoreClientLike,
  query: string,
  tokenBudget: number,
  timeoutMs: number,
): Promise<{ contextBlock?: string; tier?: string }> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("inject_timeout")), timeoutMs);
  });
  try {
    const response = await Promise.race([
      Promise.resolve(lore.contextQuery({ query, mode: "memory", token_budget: tokenBudget })),
      timeoutPromise,
    ]);
    return response as { contextBlock?: string; tier?: string };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function makeMiddlewareCallId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `mw-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface OpenAIChatCompletionsCreateParams {
  messages: OpenAIMessage[];
  model: string;
  stream?: boolean;
  [k: string]: unknown;
}

interface AnthropicMessagesCreateParams {
  messages: AnthropicMessage[];
  model: string;
  max_tokens: number;
  system?: AnthropicSystemParam;
  stream?: boolean;
  [k: string]: unknown;
}

function wrapAnthropicCreate(
  originalCreate: (params: AnthropicMessagesCreateParams, requestOptions?: unknown) => Promise<unknown>,
  originalThis: unknown,
  lore: LoreClientLike,
  options: MiddlewareOptions,
  tierResolver: ReturnType<typeof createTierResolver>,
): typeof originalCreate {
  const mode = options.mode ?? "hybrid";
  const preamble = options.recallPreamble ?? DEFAULT_PREAMBLE;
  const injectTimeoutMs = options.injectTimeoutMs ?? DEFAULT_INJECT_TIMEOUT_MS;
  const injectEnabled = injectEnabledFor(mode);

  return async function wrappedAnthropicCreate(
    params: AnthropicMessagesCreateParams,
    requestOptions?: unknown,
  ): Promise<unknown> {
    const callId = makeMiddlewareCallId();
    let modifiedParams = params;
    let userMsgForRetain: string | null = null;

    if (params && Array.isArray(params.messages)) {
      userMsgForRetain = extractLastUserMessageAnthropic(params.messages);
    }

    if (injectEnabled && userMsgForRetain) {
      const startedAt = Date.now();
      const effectiveTokens = tierResolver.resolveBudget();
      try {
        const ctx = await callContextQueryWithTimeout(
          lore,
          userMsgForRetain,
          effectiveTokens,
          injectTimeoutMs,
        );
        tierResolver.recordTier(ctx?.tier);
        const block = ctx?.contextBlock;
        if (block && block.length > 0) {
          const newSystem = injectIntoAnthropicSystem(params.system, block, preamble);
          modifiedParams = { ...params, system: newSystem };
          options.onInjectAudit?.({
            skipped: false,
            latencyMs: Date.now() - startedAt,
            callId,
          });
        } else {
          options.onInjectAudit?.({
            skipped: true,
            reason: "empty_result",
            latencyMs: Date.now() - startedAt,
            callId,
          });
        }
      } catch (err) {
        const reason =
          err instanceof Error && err.message === "inject_timeout"
            ? "timeout"
            : "lore_unreachable";
        options.onInjectAudit?.({
          skipped: true,
          reason,
          latencyMs: Date.now() - startedAt,
          callId,
        });
      }
    }

    const result = await originalCreate.call(originalThis, modifiedParams, requestOptions);

    // Streaming path: wrap async iterator so chunks pass through verbatim and
    // retain fires exactly once on stream-complete with accumulated text.
    if (userMsgForRetain && modifiedParams.stream && isAsyncIterable(result)) {
      return wrapAnthropicStreamForRetain(
        result as AsyncIterable<unknown>,
        userMsgForRetain,
        lore,
        options,
        callId,
        DEFAULT_RETAIN_SOURCE_TAG_ANTHROPIC,
      );
    }

    // Non-streaming retain path
    if (userMsgForRetain && !modifiedParams.stream) {
      const assistantMsg = extractAnthropicAssistantContent(result);
      void maybeRetain(
        lore,
        userMsgForRetain,
        assistantMsg,
        options,
        callId,
        DEFAULT_RETAIN_SOURCE_TAG_ANTHROPIC,
      );
    }

    return result;
  };
}

/**
 * Mirror of wrapOpenAIStreamForRetain for Anthropic's MessageStreamEvent shape.
 *
 * Anthropic streaming chunks include events:
 *   { type: "content_block_delta", delta: { type: "text_delta", text: "..." } }
 *   { type: "message_start" | "message_delta" | "message_stop" | ... }
 *
 * We accumulate `delta.text` from `content_block_delta` events with
 * `delta.type === "text_delta"`, then fire retain once on iterator completion.
 */
function wrapAnthropicStreamForRetain(
  upstream: AsyncIterable<unknown>,
  userMsg: string,
  lore: LoreClientLike,
  options: MiddlewareOptions,
  callId: string,
  sourceTag: string,
): AsyncIterable<unknown> {
  async function* generator(): AsyncGenerator<unknown> {
    const parts: string[] = [];
    let didFire = false;
    const fireOnce = () => {
      if (didFire) return;
      didFire = true;
      const accumulated = parts.join("");
      if (accumulated.length === 0) {
        options.onRetainAudit?.({ skipped: true, reason: "stream_error", callId });
        return;
      }
      void maybeRetain(lore, userMsg, accumulated, options, callId, sourceTag);
    };
    try {
      for await (const evt of upstream) {
        const e = evt as { type?: string; delta?: { type?: string; text?: string } };
        if (e?.type === "content_block_delta" && e.delta?.type === "text_delta" && typeof e.delta.text === "string") {
          parts.push(e.delta.text);
        }
        yield evt;
      }
      fireOnce();
    } catch (err) {
      didFire = true;
      options.onRetainAudit?.({ skipped: true, reason: "stream_error", callId });
      throw err;
    }
  }
  return generator();
}

function wrapOpenAICreate(
  originalCreate: (params: OpenAIChatCompletionsCreateParams, requestOptions?: unknown) => Promise<unknown>,
  originalThis: unknown,
  lore: LoreClientLike,
  options: MiddlewareOptions,
  tierResolver: ReturnType<typeof createTierResolver>,
): typeof originalCreate {
  const mode = options.mode ?? "hybrid";
  const preamble = options.recallPreamble ?? DEFAULT_PREAMBLE;
  const injectTimeoutMs = options.injectTimeoutMs ?? DEFAULT_INJECT_TIMEOUT_MS;
  const injectEnabled = injectEnabledFor(mode);

  return async function wrappedCreate(
    params: OpenAIChatCompletionsCreateParams,
    requestOptions?: unknown,
  ): Promise<unknown> {
    const callId = makeMiddlewareCallId();
    let modifiedParams = params;
    let userMsgForRetain: string | null = null;

    if (params && Array.isArray(params.messages)) {
      userMsgForRetain = extractLastUserMessage(params.messages);
    }

    if (injectEnabled && userMsgForRetain) {
      const startedAt = Date.now();
      const effectiveTokens = tierResolver.resolveBudget();
      try {
        const ctx = await callContextQueryWithTimeout(
          lore,
          userMsgForRetain,
          effectiveTokens,
          injectTimeoutMs,
        );
        tierResolver.recordTier(ctx?.tier);
        const block = ctx?.contextBlock;
        if (block && block.length > 0) {
          const newMessages = injectIntoMessages(params.messages, block, preamble);
          modifiedParams = { ...params, messages: newMessages };
          options.onInjectAudit?.({
            skipped: false,
            latencyMs: Date.now() - startedAt,
            callId,
          });
        } else {
          options.onInjectAudit?.({
            skipped: true,
            reason: "empty_result",
            latencyMs: Date.now() - startedAt,
            callId,
          });
        }
      } catch (err) {
        const reason =
          err instanceof Error && err.message === "inject_timeout"
            ? "timeout"
            : "lore_unreachable";
        options.onInjectAudit?.({
          skipped: true,
          reason,
          latencyMs: Date.now() - startedAt,
          callId,
        });
      }
    }

    const result = await originalCreate.call(originalThis, modifiedParams, requestOptions);

    // S4: streaming path — wrap the async iterator so chunks pass through and
    // retain fires exactly once on stream-complete with accumulated content.
    if (userMsgForRetain && modifiedParams.stream && isAsyncIterable(result)) {
      return wrapOpenAIStreamForRetain(
        result as AsyncIterable<unknown>,
        userMsgForRetain,
        lore,
        options,
        callId,
        DEFAULT_RETAIN_SOURCE_TAG_OPENAI,
      );
    }

    // post_llm_call retain (S6 / S8) — non-streaming path
    if (userMsgForRetain && !modifiedParams.stream) {
      const assistantMsg = extractOpenAIAssistantContent(result);
      void maybeRetain(
        lore,
        userMsgForRetain,
        assistantMsg,
        options,
        callId,
        DEFAULT_RETAIN_SOURCE_TAG_OPENAI,
      );
    }

    return result;
  };
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function"
  );
}

/**
 * S4: wrap an OpenAI streaming chat-completion async iterable. Yields every
 * chunk verbatim to the caller; accumulates `delta.content` and fires retain
 * exactly once when the stream finishes (normally or via error).
 */
function wrapOpenAIStreamForRetain(
  upstream: AsyncIterable<unknown>,
  userMsg: string,
  lore: LoreClientLike,
  options: MiddlewareOptions,
  callId: string,
  sourceTag: string,
): AsyncIterable<unknown> {
  async function* generator(): AsyncGenerator<unknown> {
    const parts: string[] = [];
    let didFire = false;
    const fireOnce = () => {
      if (didFire) return;
      didFire = true;
      const accumulated = parts.join("");
      if (accumulated.length === 0) {
        options.onRetainAudit?.({ skipped: true, reason: "stream_error", callId });
        return;
      }
      void maybeRetain(lore, userMsg, accumulated, options, callId, sourceTag);
    };
    try {
      for await (const chunk of upstream) {
        const c = chunk as { choices?: Array<{ delta?: { content?: unknown } }> };
        const delta = c?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") parts.push(delta);
        yield chunk;
      }
      fireOnce();
    } catch (err) {
      // Stream errored mid-flight — skip retain per plan §4 risks
      didFire = true;
      options.onRetainAudit?.({ skipped: true, reason: "stream_error", callId });
      throw err;
    }
  }
  return generator();
}

export function withMemoryHooks<TClient extends object>(
  client: TClient,
  lore: LoreClientLike,
  options: MiddlewareOptions = {},
): TClient {
  // S9: Double-wrap detection via Symbol.for marker
  if ((client as Record<symbol, unknown>)[LORE_MIDDLEWARE_MARKER] === true) {
    throw new LoreMiddlewareDoubleWrapError();
  }

  // Lane X: shared tier resolver — cached state survives across all
  // wrapped calls for this client.
  const tierResolver = createTierResolver(options);

  const proxy = new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === LORE_MIDDLEWARE_MARKER) {
        return true;
      }
      if (isOpenAILikeClient(target) && prop === "chat") {
        const chat = Reflect.get(target, prop, receiver) as object;
        return new Proxy(chat, {
          get(chatTarget, chatProp, chatReceiver) {
            if (chatProp === "completions") {
              const completions = Reflect.get(chatTarget, chatProp, chatReceiver) as object;
              return new Proxy(completions, {
                get(complTarget, complProp, complReceiver) {
                  if (complProp === "create") {
                    const originalCreate = Reflect.get(
                      complTarget,
                      complProp,
                      complReceiver,
                    ) as (params: OpenAIChatCompletionsCreateParams, requestOptions?: unknown) => Promise<unknown>;
                    return wrapOpenAICreate(originalCreate, complTarget, lore, options, tierResolver);
                  }
                  return Reflect.get(complTarget, complProp, complReceiver);
                },
              });
            }
            return Reflect.get(chatTarget, chatProp, chatReceiver);
          },
        });
      }
      if (isAnthropicLikeClient(target) && prop === "messages") {
        const messages = Reflect.get(target, prop, receiver) as object;
        return new Proxy(messages, {
          get(msgTarget, msgProp, msgReceiver) {
            if (msgProp === "create") {
              const originalCreate = Reflect.get(
                msgTarget,
                msgProp,
                msgReceiver,
              ) as (params: AnthropicMessagesCreateParams, requestOptions?: unknown) => Promise<unknown>;
              return wrapAnthropicCreate(originalCreate, msgTarget, lore, options, tierResolver);
            }
            return Reflect.get(msgTarget, msgProp, msgReceiver);
          },
        });
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  return proxy as TClient;
}
