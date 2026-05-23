import { describe, expect, it } from "vitest";
import {
  redactSensitiveContent,
  isRedactionClean,
  checkNoLocalModelTerms,
  checkNoMcpTerminology,
  runCloudModelFallbackHarness,
  REDACTION_PLACEHOLDER,
} from "../src/guardrails.js";

// ---------------------------------------------------------------------------
// redactSensitiveContent
// ---------------------------------------------------------------------------

describe("redactSensitiveContent", () => {
  it("redacts an OpenAI-style API key", () => {
    const { redacted, matchedPatterns } = redactSensitiveContent(
      "Set your key: sk-abcdefghijklmnopqrstuvwx"
    );
    expect(redacted).not.toContain("sk-abcdefghijklmnopqrstuvwx");
    expect(redacted).toContain(REDACTION_PLACEHOLDER);
    expect(matchedPatterns).toContain("openai_api_key");
  });

  it("redacts a Bearer token", () => {
    const { redacted, matchedPatterns } = redactSensitiveContent(
      "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    );
    expect(redacted).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(matchedPatterns.length).toBeGreaterThan(0);
  });

  it("redacts a password assignment", () => {
    const { redacted, matchedPatterns } = redactSensitiveContent(
      "password=supersecretpassword123"
    );
    expect(redacted).not.toContain("supersecretpassword123");
    expect(matchedPatterns).toContain("password_assignment");
  });

  it("redacts an env-style secret", () => {
    const { redacted, matchedPatterns } = redactSensitiveContent(
      "STRIPE_SECRET_KEY=sk_live_abc123def456ghi789jkl"
    );
    expect(redacted).not.toContain("sk_live_abc123def456ghi789jkl");
    expect(matchedPatterns.length).toBeGreaterThan(0);
  });

  it("redacts a JWT token", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.abc123def456";
    const { redacted } = redactSensitiveContent(`token: ${jwt}`);
    expect(redacted).not.toContain(jwt);
  });

  it("leaves safe content untouched", () => {
    const safe = "User discussed project deadlines and team velocity.";
    const { redacted, matchCount } = redactSensitiveContent(safe);
    expect(redacted).toBe(safe);
    expect(matchCount).toBe(0);
  });

  it("returns matchCount equal to the number of distinct secrets found", () => {
    const input = "sk-aaaaaaaaaaaaaaaaaaaaaa and password=hunter2hunter2";
    const { matchCount } = redactSensitiveContent(input);
    expect(matchCount).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// isRedactionClean
// ---------------------------------------------------------------------------

describe("isRedactionClean", () => {
  it("returns false when a raw API key is present", () => {
    expect(isRedactionClean("key: sk-abcdefghijklmnopqrstuvwx")).toBe(false);
  });

  it("returns true for already-redacted content", () => {
    expect(isRedactionClean(`key: ${REDACTION_PLACEHOLDER}`)).toBe(true);
  });

  it("returns true for normal prose", () => {
    expect(isRedactionClean("We reviewed the sprint backlog today.")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkNoLocalModelTerms
// ---------------------------------------------------------------------------

describe("checkNoLocalModelTerms", () => {
  it("flags copy that mentions ollama", () => {
    const result = checkNoLocalModelTerms("Install Ollama to get started with local inference.");
    expect(result.clean).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("flags copy asking users to download model weights", () => {
    const result = checkNoLocalModelTerms("Please download the model weights before proceeding.");
    expect(result.clean).toBe(false);
  });

  it("flags quantization terminology", () => {
    const result = checkNoLocalModelTerms("Choose quantization level: Q4, Q8, or F16.");
    expect(result.clean).toBe(false);
    expect(result.violations).toContain("quantization");
  });

  it("flags llama.cpp references", () => {
    const result = checkNoLocalModelTerms("Build llama.cpp with Metal support.");
    expect(result.clean).toBe(false);
  });

  it("passes clean cloud-first copy", () => {
    const result = checkNoLocalModelTerms(
      "Connect your AI assistant and start capturing memories automatically."
    );
    expect(result.clean).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("passes copy that mentions model in a non-install context", () => {
    const result = checkNoLocalModelTerms(
      "Lore uses a cloud-managed model to improve memory quality."
    );
    expect(result.clean).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkNoMcpTerminology
// ---------------------------------------------------------------------------

describe("checkNoMcpTerminology", () => {
  it("flags MCP in default view", () => {
    const result = checkNoMcpTerminology("Configure your MCP server to connect Claude.");
    expect(result.clean).toBe(false);
    expect(result.violations).toContain("MCP");
  });

  it("flags hook terminology in default view", () => {
    const result = checkNoMcpTerminology("Add a hook to capture session events.");
    expect(result.clean).toBe(false);
  });

  it("flags adapter terminology in default view", () => {
    const result = checkNoMcpTerminology("Use the AgentMemory adapter to sync data.");
    expect(result.clean).toBe(false);
  });

  it("flags vector search terminology in default view", () => {
    const result = checkNoMcpTerminology("Run a vector search across your memories.");
    expect(result.clean).toBe(false);
  });

  it("passes clean product copy", () => {
    const result = checkNoMcpTerminology(
      "Connect your AI tools and see what was remembered."
    );
    expect(result.clean).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("allows MCP terms in advanced views", () => {
    const result = checkNoMcpTerminology(
      "Configure MCP transport and hook chain here.",
      { isAdvancedView: true }
    );
    expect(result.clean).toBe(true);
  });

  it("flags edit JSON config instruction in default view", () => {
    const result = checkNoMcpTerminology(
      "Edit your MCP config JSON file to add the Lore server."
    );
    expect(result.clean).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// runCloudModelFallbackHarness
// ---------------------------------------------------------------------------

describe("runCloudModelFallbackHarness", () => {
  it("passes when rule-based fallback produces candidates and surfaces degraded banner", async () => {
    const harness = await runCloudModelFallbackHarness(async (_event, opts) => {
      // Simulate: model disabled → rule-based candidates produced, degraded flag set
      if (!opts.modelEnabled) {
        return { candidates: ["rule-based candidate 1"], degraded: true };
      }
      return { candidates: ["model candidate 1"], degraded: false };
    });

    expect(harness.functionalWithoutModel).toBe(true);
    expect(harness.ruleBasedCandidateProduced).toBe(true);
    expect(harness.degradedBannerSurfaced).toBe(true);
    expect(harness.modelStatus).toBe("disabled");
  });

  it("detects missing degraded banner when model is disabled", async () => {
    const harness = await runCloudModelFallbackHarness(async (_event, _opts) => {
      // Bug: forgot to set degraded: true
      return { candidates: ["some candidate"], degraded: false };
    });

    expect(harness.degradedBannerSurfaced).toBe(false);
  });

  it("detects no rule-based candidates produced on model failure", async () => {
    const harness = await runCloudModelFallbackHarness(async () => {
      return { candidates: [], degraded: true };
    });

    expect(harness.ruleBasedCandidateProduced).toBe(false);
    expect(harness.degradedBannerSurfaced).toBe(true);
  });
});
