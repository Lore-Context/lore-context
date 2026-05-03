/**
 * smoke-rc1-guardrails.mjs
 *
 * Fixture-driven smoke test for rc.1 verification gates (Lane F).
 * Runs without a live server.  Every gate reports PASS / FAIL / SCAFFOLD.
 *
 * Exit code 0 when all non-scaffold gates pass.
 * Exit code 1 when any non-scaffold gate fails.
 *
 * Usage:
 *   node scripts/smoke-rc1-guardrails.mjs
 *
 * Env overrides:
 *   LORE_RC1_STRICT=1   treat SCAFFOLD gates as failures
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const evalDist = join(repoRoot, "packages/eval/dist/index.js");

if (!existsSync(evalDist)) {
  console.error(
    `[smoke-rc1-guardrails] packages/eval/dist/index.js is missing.\n` +
    `Run: pnpm --filter @lore/eval build`
  );
  process.exit(1);
}

const {
  redactSensitiveContent,
  isRedactionClean,
  checkNoLocalModelTerms,
  checkNoMcpTerminology,
  runCloudModelFallbackHarness,
  PERF_TARGETS,
  buildCaptureAckReport,
  buildCandidateGenerationReport,
  buildRecallApiReport,
  buildRc1PerformanceGate,
  buildBetaFunnelReport,
  BETA_FUNNEL_STAGES,
} = await import(evalDist);

const strict = process.env.LORE_RC1_STRICT === "1";
const results = [];

async function gate(name, fn) {
  try {
    const outcome = await fn();
    results.push({ name, status: outcome.pass ? "PASS" : "FAIL", detail: outcome.detail ?? "" });
  } catch (err) {
    results.push({ name, status: "FAIL", detail: String(err?.message ?? err) });
  }
}

function scaffoldGate(name, note) {
  results.push({ name, status: "SCAFFOLD", detail: note });
}

// ---------------------------------------------------------------------------
// Gate 1: Redaction before model processing
// ---------------------------------------------------------------------------
await gate("redaction:api_key", () => {
  const input = "My key is sk-abcdefghijklmnopqrstuvwx and password=s3cr3tp@ss";
  const { redacted, matchCount } = redactSensitiveContent(input);
  const clean = isRedactionClean(redacted);
  if (!clean) return { pass: false, detail: `Still contains secrets after redaction: ${redacted}` };
  if (matchCount < 1) return { pass: false, detail: "No secrets were redacted" };
  return { pass: true, detail: `Redacted ${matchCount} secret(s)` };
});

await gate("redaction:bearer_token", () => {
  const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.abc123";
  const { redacted } = redactSensitiveContent(input);
  const clean = isRedactionClean(redacted);
  return { pass: clean, detail: clean ? "Bearer token redacted" : `Unclean: ${redacted}` };
});

await gate("redaction:safe_content_unchanged", () => {
  const safe = "We reviewed the sprint backlog and deployment schedule.";
  const { redacted, matchCount } = redactSensitiveContent(safe);
  const unchanged = redacted === safe && matchCount === 0;
  return { pass: unchanged, detail: unchanged ? "Safe content unmodified" : "Safe content was altered" };
});

// ---------------------------------------------------------------------------
// Gate 2: No local model in default onboarding copy
// ---------------------------------------------------------------------------

const DEFAULT_ONBOARDING_COPY = [
  "Connect your AI tools and work apps.",
  "Capture useful context automatically.",
  "See what was remembered and where it came from.",
  "Approve, correct, pause, export, or delete your memories.",
  "Your AI assistants can now reuse your memories safely.",
];

await gate("no_local_model:default_onboarding_copy", () => {
  const violations = [];
  for (const line of DEFAULT_ONBOARDING_COPY) {
    const result = checkNoLocalModelTerms(line);
    if (!result.clean) violations.push(...result.violations);
  }
  return {
    pass: violations.length === 0,
    detail: violations.length === 0
      ? "No local-model terms in default onboarding copy"
      : `Violations: ${violations.join(", ")}`,
  };
});

await gate("no_local_model:bad_copy_detected", () => {
  // Verify the check correctly catches bad copy (detector regression guard)
  const bad = "Install Ollama locally to run your model.";
  const result = checkNoLocalModelTerms(bad);
  return {
    pass: !result.clean,
    detail: !result.clean
      ? `Detector correctly flagged: ${result.violations.join(", ")}`
      : "Detector MISSED a local-model term — check FAILED",
  };
});

// ---------------------------------------------------------------------------
// Gate 3: No MCP terminology in default UI copy
// ---------------------------------------------------------------------------

const DEFAULT_UI_COPY = [
  "Connect AI apps",
  "Sources",
  "Memory Inbox",
  "Why this was used",
  "Pause capture",
  "Do not remember from this source",
  "Delete everything from this source",
  "Export my memories",
  "Claude is connected",
  "Codex needs reconnect",
  "Capture is paused",
  "Token expired",
];

await gate("no_mcp_terminology:default_ui_copy", () => {
  const violations = [];
  for (const line of DEFAULT_UI_COPY) {
    const result = checkNoMcpTerminology(line);
    if (!result.clean) violations.push(`"${line}" → ${result.violations.join(", ")}`);
  }
  return {
    pass: violations.length === 0,
    detail: violations.length === 0
      ? "No MCP/hook/adapter terms in default UI copy"
      : `Violations:\n${violations.join("\n")}`,
  };
});

await gate("no_mcp_terminology:advanced_view_exempt", () => {
  const advanced = "Configure MCP transport and hook chain here.";
  const result = checkNoMcpTerminology(advanced, { isAdvancedView: true });
  return {
    pass: result.clean,
    detail: result.clean
      ? "Advanced view correctly exempt from MCP terminology check"
      : "Advanced view flag not working",
  };
});

await gate("no_mcp_terminology:bad_copy_detected", () => {
  const bad = "Edit your MCP config JSON file.";
  const result = checkNoMcpTerminology(bad);
  return {
    pass: !result.clean,
    detail: !result.clean
      ? `Detector correctly flagged: ${result.violations.join(", ")}`
      : "Detector MISSED an MCP term — check FAILED",
  };
});

// ---------------------------------------------------------------------------
// Gate 4: Cloud model disabled fallback
// ---------------------------------------------------------------------------

await gate("cloud_model_fallback:rule_based_candidates", async () => {
  const harness = await runCloudModelFallbackHarness(async (_event, opts) => {
    if (!opts.modelEnabled) {
      return { candidates: ["rule-based: discussed testing strategy"], degraded: true };
    }
    return { candidates: ["model candidate"], degraded: false };
  });
  const pass =
    harness.functionalWithoutModel &&
    harness.ruleBasedCandidateProduced &&
    harness.degradedBannerSurfaced;
  return {
    pass,
    detail: pass
      ? "Fallback: rule-based candidate produced, degraded banner surfaced"
      : JSON.stringify(harness),
  };
});

// ---------------------------------------------------------------------------
// Gate 5: Capture ack latency smoke (fixture data)
// ---------------------------------------------------------------------------

await gate("perf:capture_ack_p95_fixture", () => {
  // Fixture: 20 samples all well within 250ms target
  const samples = Array.from({ length: 20 }, (_, i) => ({
    sourceId: `src_${i}`,
    requestedAt: new Date().toISOString(),
    latencyMs: 50 + i * 5, // 50–145ms
  }));
  const report = buildCaptureAckReport(samples);
  return {
    pass: report.passed,
    detail: `p95=${report.p95Ms}ms target=${report.targetP95Ms}ms`,
  };
});

await gate("perf:capture_ack_p95_regression_detection", () => {
  // 9 fast + 1 slow = 10 samples; p95 of n=10 picks index 9 (the outlier at 400ms)
  const samples = [
    ...Array.from({ length: 9 }, (_, i) => ({
      sourceId: `src_${i}`,
      requestedAt: new Date().toISOString(),
      latencyMs: 100,
    })),
    { sourceId: "src_slow", requestedAt: new Date().toISOString(), latencyMs: 400 },
  ];
  const report = buildCaptureAckReport(samples);
  return {
    pass: !report.passed,
    detail: !report.passed
      ? `Correctly detected regression: p95=${report.p95Ms}ms`
      : "Regression was not detected",
  };
});

// ---------------------------------------------------------------------------
// Gate 6: Candidate generation p95 report (fixture)
// ---------------------------------------------------------------------------

await gate("perf:candidate_gen_p95_fixture", () => {
  const samples = Array.from({ length: 10 }, (_, i) => ({
    captureEventId: `evt_${i}`,
    capturedAt: new Date().toISOString(),
    candidateReadyAt: new Date(Date.now() + 10_000).toISOString(),
    latencyMs: 8_000 + i * 500, // 8–12.5s
    ruleBasedFallback: false,
  }));
  const report = buildCandidateGenerationReport(samples);
  return {
    pass: report.passed,
    detail: `p95=${report.p95Ms}ms target=${report.targetP95Ms}ms queueLag=${report.queueLagExceeded}`,
  };
});

await gate("perf:queue_lag_detection", () => {
  // 9 fast + 1 very slow = 10 samples; p95 picks index 9 (90_000ms > 60s threshold)
  const samples = [
    ...Array.from({ length: 9 }, (_, i) => ({
      captureEventId: `evt_${i}`,
      capturedAt: new Date().toISOString(),
      candidateReadyAt: new Date().toISOString(),
      latencyMs: 10_000,
      ruleBasedFallback: false,
    })),
    {
      captureEventId: "evt_slow",
      capturedAt: new Date().toISOString(),
      candidateReadyAt: new Date().toISOString(),
      latencyMs: 90_000,
      ruleBasedFallback: true,
    },
  ];
  const report = buildCandidateGenerationReport(samples);
  return {
    pass: report.queueLagExceeded,
    detail: report.queueLagExceeded
      ? `Queue lag correctly detected: p95=${report.p95Ms}ms`
      : "Queue lag was not detected",
  };
});

// ---------------------------------------------------------------------------
// Gate 7: Recall API p95 report (fixture)
// ---------------------------------------------------------------------------

await gate("perf:recall_api_p95_fixture", () => {
  const samples = Array.from({ length: 20 }, (_, i) => ({
    queryId: `q_${i}`,
    queriedAt: new Date().toISOString(),
    latencyMs: 100 + i * 20, // 100–480ms
    resultCount: 5,
    cacheHit: i % 3 === 0,
  }));
  const report = buildRecallApiReport(samples);
  return {
    pass: report.passed,
    detail: `p95=${report.p95Ms}ms target=${report.targetP95Ms}ms cacheHitRate=${report.cacheHitRate.toFixed(2)}`,
  };
});

// ---------------------------------------------------------------------------
// Gate 8: Beta funnel report structure
// ---------------------------------------------------------------------------

await gate("beta_funnel:report_structure", () => {
  const userIds = ["u1", "u2", "u3"];
  const base = new Date("2026-05-01T09:00:00Z").getTime();
  const events = [
    { userId: "u1", stage: "invite_accepted", occurredAt: new Date(base).toISOString() },
    { userId: "u1", stage: "sign_in",         occurredAt: new Date(base + 2 * 60_000).toISOString() },
    { userId: "u1", stage: "source_connected", occurredAt: new Date(base + 5 * 60_000).toISOString() },
    { userId: "u1", stage: "first_automatic_capture", occurredAt: new Date(base + 8 * 60_000).toISOString() },
    { userId: "u2", stage: "invite_accepted", occurredAt: new Date(base).toISOString() },
    { userId: "u2", stage: "sign_in",         occurredAt: new Date(base + 3 * 60_000).toISOString() },
    { userId: "u3", stage: "invite_accepted", occurredAt: new Date(base).toISOString() },
  ];
  const report = buildBetaFunnelReport(userIds, events);
  const hasAllStages = BETA_FUNNEL_STAGES.every((s) => s in report.stageCompletions);
  return {
    pass: report.kind === "beta_funnel" && hasAllStages && report.cohortSize === 3,
    detail: `cohortSize=${report.cohortSize} fullyConverted=${report.fullyConvertedCount} activation=${report.activationTargetMet}`,
  };
});

// ---------------------------------------------------------------------------
// Scaffold gates — implementation not in Lane F's scope
// ---------------------------------------------------------------------------

scaffoldGate(
  "perf:capture_ack_p95_live",
  "Awaiting Lane B (capture API) real endpoint. Wire to /v1/capture/sources/:id/heartbeat latency samples."
);

scaffoldGate(
  "perf:candidate_gen_p95_live",
  "Awaiting Lane C (model gateway) async queue. Wire to candidate_ready event timestamps."
);

scaffoldGate(
  "perf:recall_api_p95_live",
  "Awaiting Lane E (search/recall). Wire to /v1/context/query response latency samples."
);

// rc.2 Lane M: drive the no_local_model:onboarding_html_scan and
// no_mcp_terminology:dashboard_html_scan gates from the dashboard's own SSR
// build output. Next.js renders apps/dashboard/.next/server/app/index.html
// with `showAdvanced=false` (the useState default), so all developer/advanced
// sections — gated by `{showAdvanced ? (...) : null}` and `<details className=
// "advancedDetails">` — are absent from this artifact by construction. That
// makes the file a faithful representation of the default user-facing surface.
//
// The extraction strips <script>/<style> blocks, HTML comments, all tags, and
// decodes the small set of entities Next.js emits, leaving only visible text.
// We then run the existing checkNoLocalModelTerms / checkNoMcpTerminology
// helpers without isAdvancedView — any default-user violation must fail.
//
// If the build artifact is missing we degrade to SCAFFOLD with a precise note
// pointing at the dashboard build, rather than silently passing.
const dashboardSsrHtmlPath = join(repoRoot, "apps/dashboard/.next/server/app/index.html");

function extractDefaultUserText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

if (existsSync(dashboardSsrHtmlPath)) {
  const dashboardHtml = readFileSync(dashboardSsrHtmlPath, "utf8");
  const dashboardText = extractDefaultUserText(dashboardHtml);

  await gate("no_local_model:onboarding_html_scan", () => {
    const result = checkNoLocalModelTerms(dashboardText);
    return {
      pass: result.clean,
      detail: result.clean
        ? `Default SSR dashboard HTML (${dashboardText.length} chars of visible text) clean of local-model install terms`
        : `Local-model term(s) leaked into default user copy: ${result.violations.join(", ")}`,
    };
  });

  await gate("no_mcp_terminology:dashboard_html_scan", () => {
    // No isAdvancedView flag: the SSR artifact already excludes advanced
    // sections (showAdvanced defaults to false at hydration entry), so any
    // remaining MCP/hook/adapter copy here is a real default-user regression.
    const result = checkNoMcpTerminology(dashboardText);
    return {
      pass: result.clean,
      detail: result.clean
        ? `Default SSR dashboard HTML (${dashboardText.length} chars of visible text) clean of MCP/hook/adapter terms`
        : `MCP/hook/adapter term(s) leaked into default user copy: ${result.violations.join(", ")}`,
    };
  });
} else {
  scaffoldGate(
    "no_local_model:onboarding_html_scan",
    "apps/dashboard/.next/server/app/index.html missing. Run `pnpm --filter @lore/dashboard build` (or `pnpm build`) to materialize the SSR artifact."
  );
  scaffoldGate(
    "no_mcp_terminology:dashboard_html_scan",
    "apps/dashboard/.next/server/app/index.html missing. Run `pnpm --filter @lore/dashboard build` (or `pnpm build`) to materialize the SSR artifact."
  );
}

// rc.1 gap-closure: drive the live capture-worker through the in-memory cloud
// platform with the default (noop) model gateway. This proves the fallback
// path is wired end-to-end without needing a real cloud key, queue daemon, or
// staging API. If apps/api has not been built we degrade to scaffold so the
// guardrail still surfaces clearly.
const apiCloudDist = join(repoRoot, "apps/api/dist/cloud.js");
if (existsSync(apiCloudDist)) {
  await gate("cloud_model_fallback:live_pipeline", async () => {
    const { CloudPlatform } = await import(apiCloudDist);
    const cloud = new CloudPlatform();
    const install = await cloud.issueInstallToken();
    const paired = await cloud.redeemInstallToken(install.plaintext, { label: "rc1-guardrail", platform: "smoke" });
    const auth = await cloud.authenticate(paired.deviceToken.plaintext);
    const enqueue = await cloud.enqueueSession({
      auth,
      sourceId: "src_rc1_live_fallback",
      provider: "claude_code",
      sourceOriginalId: "sess_rc1_live_fallback",
      contentHash: "h_rc1_live_fallback",
      idempotencyKey: "cap_rc1_live_fallback",
      captureMode: "summary_only",
      redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
      metadata: { projectHint: "rc1-guardrail" },
      turnSummary: [
        { role: "user", text: "Verify the cloud_model_fallback path live." },
        { role: "assistant", text: "Default Noop gateway must produce a pending candidate marked degraded." }
      ]
    });
    if (enqueue.job.status !== "pending") {
      return { pass: false, detail: `enqueueSession did not produce a pending job: ${enqueue.job.status}` };
    }
    const outcome = await cloud.processCaptureJob(enqueue.job.id);
    const candidateStatus = outcome.candidate ? outcome.candidate.status : null;
    const ok =
      outcome.job.status === "completed" &&
      candidateStatus === "pending" &&
      outcome.degraded === true &&
      outcome.ruleBasedFallback === true &&
      Boolean(outcome.candidate);
    return {
      pass: ok,
      detail: ok
        ? `pending candidate ${outcome.candidate.id} via rule-based fallback (degraded=true)`
        : `unexpected: jobStatus=${outcome.job.status} candidateStatus=${candidateStatus} degraded=${outcome.degraded} ruleBased=${outcome.ruleBasedFallback}`
    };
  });
} else {
  scaffoldGate(
    "cloud_model_fallback:live_pipeline",
    "apps/api/dist/cloud.js missing. Run `pnpm --filter @lore/api build` to enable the live gate."
  );
}

// rc.2 Lane K: flip beta_funnel:live_events from scaffold to a live gate that
// drives a real CloudPlatform through `processCaptureJob` and asserts the
// in-memory ActivationTelemetrySink receives the funnel event with all
// content keys redacted by the sink whitelist.
const apiActivationDist = join(repoRoot, "apps/api/dist/activation-telemetry.js");
if (existsSync(apiCloudDist) && existsSync(apiActivationDist)) {
  await gate("beta_funnel:live_events", async () => {
    const [{ CloudPlatform }, { ActivationTelemetrySink }] = await Promise.all([
      import(apiCloudDist),
      import(apiActivationDist),
    ]);
    const sink = new ActivationTelemetrySink();
    const cloud = new CloudPlatform({ activationTelemetry: sink });
    const install = await cloud.issueInstallToken();
    const paired = await cloud.redeemInstallToken(install.plaintext, { label: "rc1-funnel-live" });
    const auth = await cloud.authenticate(paired.deviceToken.plaintext);
    const enqueue = await cloud.enqueueSession({
      auth,
      sourceId: "src_rc1_funnel_live",
      provider: "claude_code",
      sourceOriginalId: "sess_rc1_funnel_live",
      contentHash: "h_rc1_funnel_live",
      idempotencyKey: "cap_rc1_funnel_live",
      captureMode: "summary_only",
      redaction: { version: "v08.1", secretCount: 0, privateBlockCount: 0 },
      metadata: { projectHint: "rc1-funnel-live" },
      turnSummary: [
        { role: "user", text: "AKIA-secret-do-not-store / hunter2 — these MUST NOT leak into telemetry." },
        { role: "assistant", text: "Funnel telemetry only carries whitelisted scalar metadata, never content." }
      ]
    });
    const outcome = await cloud.processCaptureJob(enqueue.job.id);
    if (outcome.job.status !== "completed" || !outcome.candidate) {
      return { pass: false, detail: `processCaptureJob failed: jobStatus=${outcome.job.status}` };
    }
    const events = sink.list();
    const eventNames = events.map((entry) => entry.event);
    const candidateSeen = events.find((entry) => entry.event === "first_candidate_seen");
    if (!candidateSeen) {
      return {
        pass: false,
        detail: `first_candidate_seen NOT emitted; recorded events: [${eventNames.join(", ") || "none"}]`,
      };
    }
    if (candidateSeen.vaultId !== auth.vaultId) {
      return { pass: false, detail: `vaultId mismatch on first_candidate_seen: ${candidateSeen.vaultId}` };
    }
    const serialized = JSON.stringify(events);
    if (serialized.includes("AKIA-secret-do-not-store") || serialized.includes("hunter2")) {
      return { pass: false, detail: "raw transcript leaked into activation telemetry — sink whitelist regression" };
    }
    return {
      pass: true,
      detail: `first_candidate_seen recorded for vault ${auth.vaultId} (${events.length} event(s) total, no raw content leak)`,
    };
  });
} else {
  scaffoldGate(
    "beta_funnel:live_events",
    "apps/api/dist/{cloud,activation-telemetry}.js missing. Run `pnpm --filter @lore/api build` to enable the live gate."
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const PASS = results.filter((r) => r.status === "PASS");
const FAIL = results.filter((r) => r.status === "FAIL");
const SCAFFOLD = results.filter((r) => r.status === "SCAFFOLD");

const maxNameLen = Math.max(...results.map((r) => r.name.length));

console.log("\n=== Lore rc.1 Guardrail Smoke ===\n");
for (const r of results) {
  const icon = r.status === "PASS" ? "✓" : r.status === "SCAFFOLD" ? "○" : "✗";
  console.log(`  ${icon} [${r.status.padEnd(8)}] ${r.name.padEnd(maxNameLen)}  ${r.detail}`);
}

console.log(
  `\nSummary: ${PASS.length} passed, ${FAIL.length} failed, ${SCAFFOLD.length} scaffold (awaiting other lanes)\n`
);

if (FAIL.length > 0) {
  console.error(`FAILED gates:\n${FAIL.map((r) => `  - ${r.name}: ${r.detail}`).join("\n")}`);
  process.exit(1);
}

if (strict && SCAFFOLD.length > 0) {
  console.error(`SCAFFOLD gates treated as failures (LORE_RC1_STRICT=1):\n${SCAFFOLD.map((r) => `  - ${r.name}`).join("\n")}`);
  process.exit(1);
}

process.exit(0);
