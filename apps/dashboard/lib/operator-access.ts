export type OperatorAccessState = "denied" | "demo-readonly";

export interface OperatorAccessEnv {
  nodeEnv?: string;
  operatorDemoEnabled?: string | boolean;
  localOperatorEnabled?: string | boolean;
}

export interface OperatorAccessBoundary {
  state: OperatorAccessState;
  readonly: true;
  reason: string;
}

function explicitPublicFlag(value: string | boolean | undefined) {
  return value === true || value === "1" || value === "true";
}

export function getOperatorAccessBoundary(env: OperatorAccessEnv = {}): OperatorAccessBoundary {
  if (explicitPublicFlag(env.operatorDemoEnabled)) {
    return {
      state: "demo-readonly",
      readonly: true,
      reason: "Operator console preview is explicitly enabled with a public read-only flag."
    };
  }

  if (env.nodeEnv !== "production" && explicitPublicFlag(env.localOperatorEnabled)) {
    return {
      state: "demo-readonly",
      readonly: true,
      reason: "Local operator console preview is explicitly enabled for this non-production session."
    };
  }

  return {
    state: "denied",
    readonly: true,
    reason: "Operator console access is denied by default until an explicit local or read-only operator flag is present."
  };
}

export function operatorAccessLabel(boundary: OperatorAccessBoundary) {
  return boundary.state === "demo-readonly" ? "Read-only console" : "Access denied";
}

export function operatorAccessTone(boundary: OperatorAccessBoundary): "ok" | "warn" | "risk" {
  return boundary.state === "demo-readonly" ? "warn" : "risk";
}
