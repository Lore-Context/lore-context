import { describe, expect, it } from "vitest";
import {
  applySourceAction,
  canCapture,
  isPrivateMode,
  sourceStateFromLegacy,
  SOURCE_DELETED,
  type CaptureSourceState
} from "../src/source-state.js";

describe("canCapture", () => {
  it("returns true only for active and degraded", () => {
    expect(canCapture("active")).toBe(true);
    expect(canCapture("degraded")).toBe(true);
    expect(canCapture("paused")).toBe(false);
    expect(canCapture("private")).toBe(false);
    expect(canCapture("disconnected")).toBe(false);
    expect(canCapture("awaiting_authorization")).toBe(false);
  });
});

describe("isPrivateMode", () => {
  it("returns true only for private", () => {
    expect(isPrivateMode("private")).toBe(true);
    expect(isPrivateMode("active")).toBe(false);
    expect(isPrivateMode("paused")).toBe(false);
  });
});

describe("applySourceAction — pause_capture", () => {
  const states: CaptureSourceState[] = ["active", "paused", "private", "degraded", "disconnected", "awaiting_authorization"];

  for (const state of states) {
    it(`pause from ${state} is allowed`, () => {
      const result = applySourceAction(state, "pause_capture");
      expect(result.allowed).toBe(true);
      expect(result.next).toBe("paused");
    });
  }
});

describe("applySourceAction — resume_capture", () => {
  it("resumes from paused → active", () => {
    const result = applySourceAction("paused", "resume_capture");
    expect(result.allowed).toBe(true);
    expect(result.next).toBe("active");
  });

  it("resumes from degraded → active", () => {
    const result = applySourceAction("degraded", "resume_capture");
    expect(result.allowed).toBe(true);
    expect(result.next).toBe("active");
  });

  it("active resume is a no-op (idempotent)", () => {
    const result = applySourceAction("active", "resume_capture");
    expect(result.allowed).toBe(true);
    expect(result.next).toBe("active");
  });

  it("cannot resume from private — must disable private mode first", () => {
    const result = applySourceAction("private", "resume_capture");
    expect(result.allowed).toBe(false);
    expect(result.next).toBe("paused");
  });

  it("cannot resume from disconnected — requires reconnect", () => {
    const result = applySourceAction("disconnected", "resume_capture");
    expect(result.allowed).toBe(false);
    expect(result.next).toBe("disconnected");
  });

  it("cannot resume from awaiting_authorization", () => {
    const result = applySourceAction("awaiting_authorization", "resume_capture");
    expect(result.allowed).toBe(false);
  });
});

describe("applySourceAction — private mode", () => {
  it("enable_private_mode from any state transitions to private", () => {
    const states: CaptureSourceState[] = ["active", "paused", "degraded", "disconnected", "awaiting_authorization"];
    for (const state of states) {
      const result = applySourceAction(state, "enable_private_mode");
      expect(result.allowed).toBe(true);
      expect(result.next).toBe("private");
    }
  });

  it("disable_private_mode from private → paused (must explicitly resume)", () => {
    const result = applySourceAction("private", "disable_private_mode");
    expect(result.allowed).toBe(true);
    expect(result.next).toBe("paused");
  });

  it("disable_private_mode when not in private mode is rejected", () => {
    const result = applySourceAction("active", "disable_private_mode");
    expect(result.allowed).toBe(false);
    expect(result.next).toBe("active");
  });
});

describe("applySourceAction — delete_source", () => {
  const states: CaptureSourceState[] = ["active", "paused", "private", "degraded", "disconnected", "awaiting_authorization"];

  for (const state of states) {
    it(`delete from ${state} returns SOURCE_DELETED`, () => {
      const result = applySourceAction(state, "delete_source");
      expect(result.allowed).toBe(true);
      expect(result.next).toBe(SOURCE_DELETED);
    });
  }
});

describe("sourceStateFromLegacy", () => {
  it("maps v0.8 active → active", () => {
    expect(sourceStateFromLegacy("active")).toBe("active");
  });

  it("maps v0.8 paused → paused", () => {
    expect(sourceStateFromLegacy("paused")).toBe("paused");
  });

  it("maps private_mode → private", () => {
    expect(sourceStateFromLegacy("private_mode")).toBe("private");
  });

  it("maps revoked/deleted/error → disconnected", () => {
    expect(sourceStateFromLegacy("revoked")).toBe("disconnected");
    expect(sourceStateFromLegacy("deleted")).toBe("disconnected");
    expect(sourceStateFromLegacy("error")).toBe("disconnected");
  });

  it("maps undefined/null/unknown → awaiting_authorization", () => {
    expect(sourceStateFromLegacy(undefined)).toBe("awaiting_authorization");
    expect(sourceStateFromLegacy(null)).toBe("awaiting_authorization");
    expect(sourceStateFromLegacy("something_unknown")).toBe("awaiting_authorization");
  });
});
