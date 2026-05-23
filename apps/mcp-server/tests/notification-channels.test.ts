// V2.0.5-A6: channel-fallback dispatcher tests.
//
// Verifies:
//   - in_host primary returns immediately when user resolves
//   - in_host silent → os_toast picks up within 1s of cascade trigger
//   - in_host unavailable → os_toast starts immediately, skipping the grace
//   - os_toast silent + highValue + email present → email tertiary fires
//   - os_toast silent + low-value → no email, returns timeout after budget
//   - total budget abort returns "timeout"
//   - "attemptedChannels" records the actual cascade path
import { describe, expect, it } from "vitest";
import {
  dispatchPrompt,
  type Channel,
  type ChannelResolution,
  type PromptInfo
} from "../src/notification-channels.js";

function makeChannel(
  name: Channel["name"],
  behaviour:
    | { kind: "resolve"; resolution: ChannelResolution; afterMs: number }
    | { kind: "silent" }
    | { kind: "unavailable" }
): Channel {
  return {
    name,
    async deliver(_info: PromptInfo, abort: AbortSignal): Promise<ChannelResolution> {
      if (behaviour.kind === "unavailable") {
        const err = new Error("unavailable");
        (err as any).reason = "channel_unavailable";
        throw err;
      }
      if (behaviour.kind === "silent") {
        // Resolve never; rely on stage abort to surface "channel_silent".
        return await new Promise<ChannelResolution>((_resolve, reject) => {
          abort.addEventListener("abort", () => {
            const err = new Error("silent");
            (err as any).reason = "channel_silent";
            reject(err);
          });
        });
      }
      // resolve
      return await new Promise<ChannelResolution>((resolve, reject) => {
        const timer = setTimeout(() => resolve(behaviour.resolution), behaviour.afterMs);
        abort.addEventListener("abort", () => {
          clearTimeout(timer);
          const err = new Error("silent");
          (err as any).reason = "channel_silent";
          reject(err);
        });
      });
    }
  };
}

const PROMPT: PromptInfo = Object.freeze({
  promptId: "p1",
  vaultId: "v1",
  agentSelfId: "0xa1b2",
  agentName: "Claude Code",
  label: "github_token",
  firstSeenAgent: true,
  highValue: false
});

const FAST_SCHEDULE = {
  inHostStartDelayMs: 0,
  inHostSilenceWindowMs: 30,
  osToastStartDelayMs: 5,
  osToastSilenceWindowMs: 30,
  totalPromptBudgetMs: 200
};

describe("V2.0.5-A6 dispatchPrompt fallback cascade", () => {
  it("returns in_host resolution when user picks within window", async () => {
    const outcome = await dispatchPrompt({
      prompt: PROMPT,
      channels: {
        inHost: makeChannel("in_host", { kind: "resolve", resolution: "永久", afterMs: 5 }),
        osToast: makeChannel("os_toast", { kind: "silent" })
      },
      schedule: FAST_SCHEDULE
    });
    expect(outcome.resolution).toBe("永久");
    expect(outcome.winningChannel).toBe("in_host");
    expect(outcome.attemptedChannels).toEqual(["in_host"]);
  });

  it("falls through to os_toast when in_host stays silent", async () => {
    const outcome = await dispatchPrompt({
      prompt: PROMPT,
      channels: {
        inHost: makeChannel("in_host", { kind: "silent" }),
        osToast: makeChannel("os_toast", { kind: "resolve", resolution: "一次", afterMs: 5 })
      },
      schedule: FAST_SCHEDULE
    });
    expect(outcome.resolution).toBe("一次");
    expect(outcome.winningChannel).toBe("os_toast");
    expect(outcome.attemptedChannels).toEqual(["in_host", "os_toast"]);
  });

  it("skips os_toast grace when in_host reports unavailable", async () => {
    const start = performance.now();
    const outcome = await dispatchPrompt({
      prompt: PROMPT,
      channels: {
        inHost: makeChannel("in_host", { kind: "unavailable" }),
        osToast: makeChannel("os_toast", { kind: "resolve", resolution: "拒绝", afterMs: 1 })
      },
      schedule: { ...FAST_SCHEDULE, osToastStartDelayMs: 50 }
    });
    expect(outcome.resolution).toBe("拒绝");
    expect(outcome.winningChannel).toBe("os_toast");
    expect(outcome.attemptedChannels).toEqual(["in_host", "os_toast"]);
    // unavailable → no grace delay; total elapsed should be < 30ms
    expect(performance.now() - start).toBeLessThan(40);
  });

  it("attempts email tertiary only for high-value secrets", async () => {
    const highValue: PromptInfo = { ...PROMPT, highValue: true };
    const outcome = await dispatchPrompt({
      prompt: highValue,
      channels: {
        inHost: makeChannel("in_host", { kind: "silent" }),
        osToast: makeChannel("os_toast", { kind: "silent" }),
        email: makeChannel("email", { kind: "resolve", resolution: "永久", afterMs: 5 })
      },
      schedule: FAST_SCHEDULE
    });
    expect(outcome.resolution).toBe("永久");
    expect(outcome.winningChannel).toBe("email");
    expect(outcome.attemptedChannels).toEqual(["in_host", "os_toast", "email"]);
  });

  it("does NOT attempt email for low-value secrets even when configured", async () => {
    const outcome = await dispatchPrompt({
      prompt: PROMPT, // highValue=false
      channels: {
        inHost: makeChannel("in_host", { kind: "silent" }),
        osToast: makeChannel("os_toast", { kind: "silent" }),
        email: makeChannel("email", { kind: "resolve", resolution: "永久", afterMs: 5 })
      },
      schedule: FAST_SCHEDULE
    });
    expect(outcome.resolution).toBe("timeout");
    expect(outcome.winningChannel).toBe("none");
    expect(outcome.attemptedChannels).toEqual(["in_host", "os_toast"]);
  });

  it("returns timeout when every channel goes silent", async () => {
    const outcome = await dispatchPrompt({
      prompt: PROMPT,
      channels: {
        inHost: makeChannel("in_host", { kind: "silent" }),
        osToast: makeChannel("os_toast", { kind: "silent" })
      },
      schedule: FAST_SCHEDULE
    });
    expect(outcome.resolution).toBe("timeout");
    expect(outcome.winningChannel).toBe("none");
  });

  it("returns timeout when overall budget expires mid-stage", async () => {
    const outcome = await dispatchPrompt({
      prompt: PROMPT,
      channels: {
        inHost: makeChannel("in_host", { kind: "resolve", resolution: "永久", afterMs: 5_000 }),
        osToast: makeChannel("os_toast", { kind: "resolve", resolution: "永久", afterMs: 5_000 })
      },
      schedule: { ...FAST_SCHEDULE, totalPromptBudgetMs: 50 }
    });
    expect(outcome.resolution).toBe("timeout");
  });
});
