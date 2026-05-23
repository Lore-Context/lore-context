import { describe, it, expect } from "vitest";
import {
  createCloudProviderFromEnv,
  createModelGatewayFromEnv,
  describeModelGatewayEnv,
} from "../src/factory.js";

describe("createCloudProviderFromEnv", () => {
  it("returns null when endpoint is missing", () => {
    expect(createCloudProviderFromEnv({ LORE_MODEL_GATEWAY_API_KEY: "sk-x" })).toBeNull();
  });

  it("returns null when api key is missing", () => {
    expect(
      createCloudProviderFromEnv({ LORE_MODEL_GATEWAY_ENDPOINT: "https://m.example.com" }),
    ).toBeNull();
  });

  it("returns null when forced disabled", () => {
    expect(
      createCloudProviderFromEnv({
        LORE_MODEL_GATEWAY_ENDPOINT: "https://m.example.com",
        LORE_MODEL_GATEWAY_API_KEY: "sk-x",
        LORE_MODEL_GATEWAY_DISABLED: "1",
      }),
    ).toBeNull();
  });

  it("returns a configured provider when endpoint+key set", () => {
    const p = createCloudProviderFromEnv({
      LORE_MODEL_GATEWAY_ENDPOINT: "https://m.example.com",
      LORE_MODEL_GATEWAY_API_KEY: "sk-x",
      LORE_MODEL_GATEWAY_MODEL: "test-model",
    });
    expect(p).not.toBeNull();
    expect(p!.available).toBe(true);
    expect(p!.kind).toBe("cloud");
    expect(p!.model).toBe("test-model");
  });
});

describe("createModelGatewayFromEnv", () => {
  it("returns a noop-backed gateway when env is empty", () => {
    const gw = createModelGatewayFromEnv({});
    expect(gw.isEnabled).toBe(false);
    expect(gw.providerKind).toBe("noop");
  });

  it("wires cloud provider when env has endpoint+key", () => {
    const gw = createModelGatewayFromEnv({
      LORE_MODEL_GATEWAY_ENDPOINT: "https://m.example.com",
      LORE_MODEL_GATEWAY_API_KEY: "sk-x",
    });
    expect(gw.isEnabled).toBe(true);
    expect(gw.providerKind).toBe("cloud");
  });

  it("applies budget overrides from env", () => {
    const gw = createModelGatewayFromEnv({
      LORE_MODEL_GATEWAY_MAX_JOBS_HOUR: "5",
      LORE_MODEL_GATEWAY_MAX_JOBS_DAY: "20",
      LORE_MODEL_GATEWAY_MAX_INPUT_BYTES: "1024",
    });
    expect(gw.providerKind).toBe("noop");
    // Budget propagation is verified via behavior in budget tests; here we
    // just assert construction succeeds with custom budget input.
  });
});

describe("describeModelGatewayEnv", () => {
  it("reports unconfigured state when envs are missing", () => {
    const status = describeModelGatewayEnv({});
    expect(status.configured).toBe(false);
    expect(status.provider).toBe("noop");
    expect(status.endpointConfigured).toBe(false);
    expect(status.apiKeyConfigured).toBe(false);
  });

  it("reports configured state when envs are present", () => {
    const status = describeModelGatewayEnv({
      LORE_MODEL_GATEWAY_ENDPOINT: "https://m.example.com",
      LORE_MODEL_GATEWAY_API_KEY: "sk-x",
      LORE_MODEL_GATEWAY_MODEL: "m1",
    });
    expect(status.configured).toBe(true);
    expect(status.provider).toBe("cloud");
    expect(status.model).toBe("m1");
  });

  it("reports forced disable", () => {
    const status = describeModelGatewayEnv({
      LORE_MODEL_GATEWAY_ENDPOINT: "https://m.example.com",
      LORE_MODEL_GATEWAY_API_KEY: "sk-x",
      LORE_MODEL_GATEWAY_DISABLED: "1",
    });
    expect(status.configured).toBe(false);
    expect(status.forcedDisabled).toBe(true);
  });
});
