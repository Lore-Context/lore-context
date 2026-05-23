// V2.0.5-A6: Authorization prompt channel-fallback chain.
//
// Per plan §5.3 / spec §5.3, when an agent's secret.get triggers a prompt
// (no active 永久 grant), the apps/mcp-server delivers the prompt to the
// user across a 3-channel cascade. Each channel is given a bounded window
// to surface the prompt before the next falls through:
//
//   primary    in-host long-poll  (dashboard tab open)        5s window
//   secondary  OS toast           (UserNotifications / Toast)  1s grace
//   tertiary   email              (opt-in, only "high-value")  best-effort
//
// The first channel to resolve the prompt (一次 / 永久 / 拒绝) wins; the
// remaining channels are cancelled. If no channel resolves within the
// total 60s prompt budget the caller returns 403 with denied_timeout.
//
// This module is the pure scheduler — actual I/O for each channel is
// injected via the Channel interface so tests can drive deterministic
// behaviour without real timers or network.

export type ChannelResolution = "一次" | "永久" | "拒绝" | "timeout";

export interface PromptInfo {
  readonly promptId: string;
  readonly vaultId: string;
  readonly agentSelfId: string;
  readonly agentName: string;
  readonly label: string;
  readonly firstSeenAgent: boolean;
  readonly highValue: boolean;
}

export interface Channel {
  readonly name: "in_host" | "os_toast" | "email";
  /**
   * Begin delivering the prompt. Resolves with the user resolution on success,
   * or rejects with reason="channel_silent" if the bounded window expires
   * without a user action, or reason="channel_unavailable" if the channel
   * cannot deliver at all (e.g. no dashboard tab, OS notification denied,
   * email opt-out).
   */
  deliver(info: PromptInfo, abort: AbortSignal): Promise<ChannelResolution>;
}

export interface ChannelSchedule {
  /** ms after start before in_host is allowed to begin */
  inHostStartDelayMs: number;
  /** ms the in_host channel gets to surface a prompt before os_toast falls through */
  inHostSilenceWindowMs: number;
  /** ms after in_host silence before os_toast begins */
  osToastStartDelayMs: number;
  /** ms the os_toast channel gets before email falls through (if eligible) */
  osToastSilenceWindowMs: number;
  /** ms total budget for the whole prompt (default 60_000 per spec) */
  totalPromptBudgetMs: number;
}

export const DEFAULT_SCHEDULE: ChannelSchedule = Object.freeze({
  inHostStartDelayMs: 0,
  inHostSilenceWindowMs: 5_000,
  osToastStartDelayMs: 1_000,
  osToastSilenceWindowMs: 30_000,
  totalPromptBudgetMs: 60_000
});

export interface DispatchOutcome {
  readonly resolution: ChannelResolution;
  readonly winningChannel: Channel["name"] | "none";
  readonly attemptedChannels: ReadonlyArray<Channel["name"]>;
  readonly elapsedMs: number;
}

export interface DispatchInput {
  prompt: PromptInfo;
  channels: {
    inHost: Channel;
    osToast: Channel;
    email?: Channel;
  };
  schedule?: Partial<ChannelSchedule>;
  /** Injectable clock for deterministic tests. Defaults to performance.now. */
  now?: () => number;
}

/**
 * Run the channel-fallback chain. Returns the first channel resolution
 * within the total prompt budget, or "timeout" if every channel goes silent.
 *
 * Channels run sequentially with the windowed cascade; an earlier-stage
 * "channel_silent" rejection is the trigger for the next stage. Any
 * "channel_unavailable" rejection skips that stage and immediately starts
 * the next (saving budget).
 *
 * The email tertiary is only attempted when prompt.highValue=true.
 */
export async function dispatchPrompt({
  prompt,
  channels,
  schedule,
  now = () => performance.now()
}: DispatchInput): Promise<DispatchOutcome> {
  const sched: ChannelSchedule = { ...DEFAULT_SCHEDULE, ...(schedule ?? {}) };
  const start = now();
  const attempted: Channel["name"][] = [];
  const overallController = new AbortController();
  const overallTimeout = setTimeout(() => overallController.abort(), sched.totalPromptBudgetMs);

  type StageOutput = { resolution: ChannelResolution; winningChannel: Channel["name"] | "none" };

  async function runStage(
    channel: Channel,
    startDelayMs: number,
    silenceWindowMs: number
  ): Promise<StageOutput | "silent" | "unavailable"> {
    if (overallController.signal.aborted) {
      return { resolution: "timeout", winningChannel: "none" };
    }
    if (startDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, startDelayMs));
    }
    if (overallController.signal.aborted) {
      return { resolution: "timeout", winningChannel: "none" };
    }
    attempted.push(channel.name);
    const stageController = new AbortController();
    const onOverallAbort = () => stageController.abort();
    overallController.signal.addEventListener("abort", onOverallAbort);
    const stageTimer = setTimeout(() => stageController.abort(), silenceWindowMs);
    try {
      // Race deliver() against the stage abort signal so a wedged channel
      // (silent long-poll, hung OS toast bridge) cannot block past the total
      // prompt budget. Without this race, an `await channel.deliver(...)`
      // would only resolve when deliver returns — even if overallController
      // fired its 60s abort 30s ago.
      const abortPromise = new Promise<never>((_resolve, reject) => {
        if (stageController.signal.aborted) {
          reject(Object.assign(new Error("aborted"), { reason: "channel_silent" }));
          return;
        }
        stageController.signal.addEventListener(
          "abort",
          () => reject(Object.assign(new Error("aborted"), { reason: "channel_silent" })),
          { once: true }
        );
      });
      const resolution = await Promise.race([
        channel.deliver(prompt, stageController.signal),
        abortPromise
      ]);
      return { resolution, winningChannel: channel.name };
    } catch (err: any) {
      const reason = typeof err === "object" && err !== null && "reason" in err ? err.reason : "channel_silent";
      if (reason === "channel_unavailable") return "unavailable";
      return "silent";
    } finally {
      clearTimeout(stageTimer);
      overallController.signal.removeEventListener("abort", onOverallAbort);
    }
  }

  try {
    const inHostResult = await runStage(channels.inHost, sched.inHostStartDelayMs, sched.inHostSilenceWindowMs);
    if (inHostResult !== "silent" && inHostResult !== "unavailable") {
      return {
        resolution: inHostResult.resolution,
        winningChannel: inHostResult.winningChannel,
        attemptedChannels: attempted,
        elapsedMs: now() - start
      };
    }

    const osDelay = inHostResult === "unavailable" ? 0 : sched.osToastStartDelayMs;
    const osResult = await runStage(channels.osToast, osDelay, sched.osToastSilenceWindowMs);
    if (osResult !== "silent" && osResult !== "unavailable") {
      return {
        resolution: osResult.resolution,
        winningChannel: osResult.winningChannel,
        attemptedChannels: attempted,
        elapsedMs: now() - start
      };
    }

    if (channels.email && prompt.highValue) {
      // Budget arithmetic uses ACTUAL elapsed time, not the sum of scheduled
      // windows — earlier channels may have returned fast (user dismissed
      // in 200ms) or unavailable (skip grace), so the email stage gets the
      // real remaining budget, not the worst-case allocation.
      const elapsed = now() - start;
      const remaining = Math.max(0, sched.totalPromptBudgetMs - elapsed);
      if (remaining > 0) {
        const emailResult = await runStage(channels.email, 0, remaining);
        if (emailResult !== "silent" && emailResult !== "unavailable") {
          return {
            resolution: emailResult.resolution,
            winningChannel: emailResult.winningChannel,
            attemptedChannels: attempted,
            elapsedMs: now() - start
          };
        }
      }
    }

    return {
      resolution: "timeout",
      winningChannel: "none",
      attemptedChannels: attempted,
      elapsedMs: now() - start
    };
  } finally {
    clearTimeout(overallTimeout);
  }
}

export const NOTIFICATION_CHANNELS_INTERNALS = {
  DEFAULT_SCHEDULE
};
