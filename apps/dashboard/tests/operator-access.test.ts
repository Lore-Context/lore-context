import { describe, expect, it } from "vitest";
import { getOperatorAccessBoundary, operatorAccessLabel, operatorAccessTone } from "../lib/operator-access";

describe("operator access boundary", () => {
  it("denies operator console access by default", () => {
    const boundary = getOperatorAccessBoundary({ nodeEnv: "production" });

    expect(boundary).toMatchObject({
      state: "denied",
      readonly: true
    });
    expect(operatorAccessLabel(boundary)).toBe("Access denied");
    expect(operatorAccessTone(boundary)).toBe("risk");
  });

  it("allows only an explicit public read-only operator flag", () => {
    const boundary = getOperatorAccessBoundary({
      nodeEnv: "production",
      operatorDemoEnabled: "1"
    });

    expect(boundary).toMatchObject({
      state: "demo-readonly",
      readonly: true
    });
    expect(boundary.reason).toContain("public read-only flag");
    expect(operatorAccessLabel(boundary)).toBe("Read-only console");
    expect(operatorAccessTone(boundary)).toBe("warn");
  });

  it("keeps local preview flags out of production access", () => {
    expect(getOperatorAccessBoundary({ nodeEnv: "production", localOperatorEnabled: "1" }).state).toBe("denied");
    expect(getOperatorAccessBoundary({ nodeEnv: "development", localOperatorEnabled: "1" }).state).toBe("demo-readonly");
  });
});
