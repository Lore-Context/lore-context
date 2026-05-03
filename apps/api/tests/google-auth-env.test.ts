import { describe, expect, it } from "vitest";
import { parseGoogleAuthEnv } from "../src/google-auth.js";

const PROD_BASE = {
  NODE_ENV: "production",
  GOOGLE_CLIENT_ID: "client.example.com",
  GOOGLE_CLIENT_SECRET: "real-google-client-secret",
  GOOGLE_REDIRECT_URI: "https://app.lore.test/api/lore/auth/google/callback",
  SESSION_SECRET: "x".repeat(32)
} as NodeJS.ProcessEnv;

describe("parseGoogleAuthEnv production guard", () => {
  it("disables auth when GOOGLE_CLIENT_SECRET is empty in production", () => {
    const env: NodeJS.ProcessEnv = { ...PROD_BASE, GOOGLE_CLIENT_SECRET: "" };
    const result = parseGoogleAuthEnv(env);
    expect(result.enabled).toBe(false);
    if (result.enabled === false) {
      expect(result.reason).toMatch(/GOOGLE_CLIENT_SECRET/);
      expect(result.production).toBe(true);
    }
  });

  it("disables auth when SESSION_SECRET is shorter than 32 chars in production", () => {
    const env: NodeJS.ProcessEnv = { ...PROD_BASE, SESSION_SECRET: "short-dev-secret" };
    const result = parseGoogleAuthEnv(env);
    expect(result.enabled).toBe(false);
    if (result.enabled === false) {
      expect(result.reason).toMatch(/SESSION_SECRET/);
      expect(result.reason).toMatch(/32/);
      expect(result.production).toBe(true);
    }
  });

  it("refuses LORE_AUTH_MOCK_GOOGLE in production even with otherwise-valid env", () => {
    const env: NodeJS.ProcessEnv = { ...PROD_BASE, LORE_AUTH_MOCK_GOOGLE: "1" };
    const result = parseGoogleAuthEnv(env);
    expect(result.enabled).toBe(false);
    if (result.enabled === false) {
      expect(result.reason).toMatch(/LORE_AUTH_MOCK_GOOGLE not allowed in production/);
    }
  });

  it("enables auth when all required prod env vars are present and SESSION_SECRET is long enough", () => {
    const result = parseGoogleAuthEnv({ ...PROD_BASE });
    expect(result.enabled).toBe(true);
    if (result.enabled === true) {
      expect(result.production).toBe(true);
      expect(result.secureCookie).toBe(true);
      expect(result.mock).toBe(false);
    }
  });

  it("permits a short SESSION_SECRET outside production (dev/test ergonomics)", () => {
    const env: NodeJS.ProcessEnv = { ...PROD_BASE, NODE_ENV: "development", SESSION_SECRET: "dev-secret" };
    const result = parseGoogleAuthEnv(env);
    expect(result.enabled).toBe(true);
  });
});
