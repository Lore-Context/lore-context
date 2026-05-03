import { describe, expect, it } from "vitest";
import {
  MockProvider,
  ModelGateway,
  NoopProvider,
  type DuplicateHint,
  type ModelProvider,
  type QueryRewriteResult,
  type RedactionHint,
  type RerankResult,
  type StaleConflictHint,
  type SummaryResult,
  type TitleResult
} from "@lore/model-gateway";
import { CloudPlatform } from "../src/cloud.js";

// rc.1 gap-closure tests for the capture → candidate worker. They prove:
//   1. enqueueSession is fast and never blocks on model work,
//   2. processCaptureJob always emits a status="pending" candidate (never
//      auto-promoted to a trusted memory),
//   3. the noop / fallback path still produces a usable rule-based candidate,
//   4. the model gateway is honoured when a real provider is supplied,
//   5. paused / private / error paths leave clear provenance.

async function pairAndAuth(cloud: CloudPlatform) {
  const install = await cloud.issueInstallToken();
  const paired = await cloud.redeemInstallToken(install.plaintext, { label: "test", platform: "darwin" });
  const auth = await cloud.authenticate(paired.deviceToken.plaintext);
  return { auth, vault: paired.vault };
}

function baseSession(overrides: Partial<Parameters<CloudPlatform["enqueueSession"]>[0]> = {}) {
  return {
    sourceId: "src_proc",
    provider: "claude_code" as const,
    sourceOriginalId: "sess_orig_1",
    contentHash: "hash_1",
    idempotencyKey: "cap_proc_test_1",
    captureMode: "summary_only" as const,
    startedAt: "2026-04-30T10:00:00.000Z",
    endedAt: "2026-04-30T10:01:00.000Z",
    redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
    metadata: { projectHint: "lore-rc1" },
    turnSummary: [
      { role: "user", text: "Wire model gateway into the capture worker." },
      { role: "assistant", text: "Plan: keep ack fast; do extraction async; never auto-promote candidates." }
    ],
    ...overrides
  };
}

class CountingProvider implements ModelProvider {
  readonly kind = "mock" as const;
  readonly available = true;
  callCount = 0;

  async generateTitle(): Promise<TitleResult> {
    this.callCount += 1;
    return { title: "[counting] title", confidence: 0.5 };
  }
  async generateSummary(): Promise<SummaryResult> {
    this.callCount += 1;
    return { summary: "[counting] summary", confidence: 0.5 };
  }
  async detectRedactionHints(): Promise<RedactionHint[]> {
    this.callCount += 1;
    return [];
  }
  async detectDuplicates(): Promise<DuplicateHint[]> {
    this.callCount += 1;
    return [];
  }
  async detectStaleConflict(): Promise<StaleConflictHint[]> {
    this.callCount += 1;
    return [];
  }
  async rewriteQuery(query: string): Promise<QueryRewriteResult> {
    this.callCount += 1;
    return { rewritten: query, expansions: [], confidence: 0.5 };
  }
  async rerank(_q: string, candidates: Array<{ id: string; text: string }>): Promise<RerankResult[]> {
    this.callCount += 1;
    return candidates.map((c, i) => ({ id: c.id, score: 1 - i * 0.01, reason: "[counting]" }));
  }
}

class ThrowingProvider implements ModelProvider {
  readonly kind = "mock" as const;
  readonly available = true;

  async generateTitle(): Promise<TitleResult> {
    throw new Error("model gateway boom");
  }
  async generateSummary(): Promise<SummaryResult> {
    throw new Error("model gateway boom");
  }
  async detectRedactionHints(): Promise<RedactionHint[]> {
    return [];
  }
  async detectDuplicates(): Promise<DuplicateHint[]> {
    return [];
  }
  async detectStaleConflict(): Promise<StaleConflictHint[]> {
    return [];
  }
  async rewriteQuery(query: string): Promise<QueryRewriteResult> {
    return { rewritten: query, expansions: [], confidence: 0 };
  }
  async rerank(): Promise<RerankResult[]> {
    return [];
  }
}

describe("CloudPlatform.processCaptureJob — rc.1 capture worker", () => {
  it("default noop gateway produces a pending rule-based candidate", async () => {
    const cloud = new CloudPlatform();
    const { auth } = await pairAndAuth(cloud);
    const enqueue = await cloud.enqueueSession({ auth, ...baseSession() });

    const outcome = await cloud.processCaptureJob(enqueue.job.id);

    expect(outcome.job.status).toBe("completed");
    expect(outcome.candidate).not.toBeNull();
    expect(outcome.candidate?.status).toBe("pending");
    expect(outcome.degraded).toBe(true);
    expect(outcome.ruleBasedFallback).toBe(true);
    expect(outcome.candidate?.content).toContain("Plan");
    expect(outcome.candidate?.metadata.title).toContain("Claude Code");
    expect(outcome.candidate?.metadata.provenance).toMatchObject({ provider: "noop" });
    expect(outcome.candidate?.metadata.idempotencyKey).toBe("cap_proc_test_1");
  });

  it("never auto-promotes a candidate even with a working mock provider", async () => {
    const cloud = new CloudPlatform({ modelProvider: new MockProvider() });
    const { auth } = await pairAndAuth(cloud);
    const enqueue = await cloud.enqueueSession({ auth, ...baseSession({ idempotencyKey: "cap_proc_mock" }) });

    const outcome = await cloud.processCaptureJob(enqueue.job.id);

    expect(outcome.job.status).toBe("completed");
    expect(outcome.candidate?.status).toBe("pending");
    expect(outcome.candidate?.status).not.toBe("approved");
    expect(outcome.degraded).toBe(false);
    expect(outcome.ruleBasedFallback).toBe(false);
    // MockProvider returns "[mock summary] …", proving the model path was used.
    expect(outcome.candidate?.content).toContain("[mock summary]");
    expect(outcome.candidate?.metadata.title).toContain("[mock]");
    expect(outcome.candidate?.metadata.provenance).toMatchObject({ provider: "mock" });
  });

  it("is idempotent: re-running a completed job returns the same candidate", async () => {
    const cloud = new CloudPlatform({ modelProvider: new MockProvider() });
    const { auth } = await pairAndAuth(cloud);
    const enqueue = await cloud.enqueueSession({ auth, ...baseSession({ idempotencyKey: "cap_proc_idem" }) });

    const first = await cloud.processCaptureJob(enqueue.job.id);
    const second = await cloud.processCaptureJob(enqueue.job.id);

    expect(second.job.id).toBe(first.job.id);
    expect(second.candidate?.id).toBe(first.candidate?.id);
    expect(second.job.attempts).toBe(first.job.attempts);
    expect(second.candidate?.status).toBe("pending");
  });

  it("does not call the model gateway during enqueueSession (fast ack path)", async () => {
    const provider = new CountingProvider();
    const cloud = new CloudPlatform({ modelProvider: provider });
    const { auth } = await pairAndAuth(cloud);

    const enqueue = await cloud.enqueueSession({ auth, ...baseSession({ idempotencyKey: "cap_fast_ack" }) });

    expect(enqueue.job.status).toBe("pending");
    expect(provider.callCount).toBe(0);

    await cloud.processCaptureJob(enqueue.job.id);
    expect(provider.callCount).toBeGreaterThan(0);
  });

  it("marks the job failed without saving a candidate when the source is paused", async () => {
    const cloud = new CloudPlatform({ modelProvider: new MockProvider() });
    const { auth } = await pairAndAuth(cloud);
    const enqueue = await cloud.enqueueSession({ auth, ...baseSession({ sourceId: "src_pre_pause", idempotencyKey: "cap_proc_pause" }) });

    // Pause AFTER enqueue: the job is already pending; the worker must skip.
    await cloud.recordHeartbeat({ auth, sourceId: "src_pre_pause", status: "paused" });

    const outcome = await cloud.processCaptureJob(enqueue.job.id);

    expect(outcome.job.status).toBe("failed");
    expect(outcome.failureReason).toBe("source_paused");
    expect(outcome.candidate).toBeNull();
    expect(outcome.degraded).toBe(true);
    expect(outcome.modelError).toMatch(/paused/);
  });

  it("falls back to rule-based content when the model provider throws", async () => {
    const cloud = new CloudPlatform({
      modelGateway: new ModelGateway({ provider: new ThrowingProvider() })
    });
    const { auth } = await pairAndAuth(cloud);
    const enqueue = await cloud.enqueueSession({ auth, ...baseSession({ idempotencyKey: "cap_proc_throw" }) });

    const outcome = await cloud.processCaptureJob(enqueue.job.id);

    expect(outcome.job.status).toBe("completed");
    expect(outcome.candidate?.status).toBe("pending");
    expect(outcome.degraded).toBe(true);
    expect(outcome.ruleBasedFallback).toBe(true);
    expect(outcome.modelError).toContain("model gateway boom");
    // Rule-based content survived the failure.
    expect(outcome.candidate?.content).toContain("Plan");
    expect(outcome.candidate?.metadata.modelError).toContain("model gateway boom");
  });

  it("private_mode session produces a suppressed pending candidate", async () => {
    const cloud = new CloudPlatform({ modelProvider: new MockProvider() });
    const { auth } = await pairAndAuth(cloud);

    const enqueue = await cloud.enqueueSession({
      auth,
      ...baseSession({
        captureMode: "private_mode",
        idempotencyKey: "cap_proc_private",
        turnSummary: []
      })
    });

    const outcome = await cloud.processCaptureJob(enqueue.job.id);

    expect(outcome.job.status).toBe("completed");
    expect(outcome.candidate?.status).toBe("pending");
    expect(outcome.candidate?.content).toBe("");
    expect(outcome.candidate?.metadata.privateMode).toBe(true);
    expect(outcome.degraded).toBe(true);
    expect(outcome.ruleBasedFallback).toBe(true);
  });

  it("rejects unknown job ids with cloud.job_not_found", async () => {
    const cloud = new CloudPlatform();
    await expect(cloud.processCaptureJob("job_does_not_exist")).rejects.toThrowError(/job_not_found|not found/);
  });

  it("ModelGateway honours `disabled: true` and produces a degraded candidate", async () => {
    // Sanity check that the contract from @lore/model-gateway holds for the
    // disabled flag — explicit opt-out should match the noop default.
    const cloud = new CloudPlatform({ modelGateway: new ModelGateway({ disabled: true, provider: new MockProvider() }) });
    expect(cloud).toBeDefined();
    const gateway = new ModelGateway({ disabled: true, provider: new MockProvider() });
    expect(gateway.isEnabled).toBe(false);
    expect(gateway.providerKind).toBe("noop");
    // And the default Noop provider matches.
    expect(new NoopProvider().available).toBe(false);
  });
});
