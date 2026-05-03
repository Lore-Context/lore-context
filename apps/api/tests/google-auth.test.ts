import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudPlatform, InMemoryCloudStore } from "../src/cloud.js";
import { createLoreApi, responseHeadersToNodeHeaders } from "../src/index.js";

const FIXED_NOW = new Date("2026-05-02T07:00:00.000Z");
const CLIENT_ID = "mock-client.local";

type CloudResult = Awaited<ReturnType<CloudPlatform["handle"]>>;

function enableGoogleMockEnv(): void {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("LORE_AUTH_MOCK_GOOGLE", "1");
  vi.stubEnv("GOOGLE_CLIENT_ID", CLIENT_ID);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "mock-google-secret");
  vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost/auth/google/callback");
  vi.stubEnv("SESSION_SECRET", "test-session-secret");
}

function freshPlatform(): CloudPlatform {
  return new CloudPlatform({
    store: new InMemoryCloudStore(),
    now: () => FIXED_NOW
  });
}

async function handle(platform: CloudPlatform, url: string, init: RequestInit = {}): Promise<CloudResult> {
  const parsed = new URL(url);
  const method = init.method ?? "GET";
  return platform.handle({
    request: new Request(parsed, { ...init, method }),
    url: parsed,
    path: parsed.pathname,
    method,
    hasAdminApiKey: false,
    isLoopback: false
  });
}

function extractSetCookie(result: CloudResult, name: string): string {
  const raw = result.headers?.["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  expect(match).toBeDefined();
  return match!.split(";")[0]!;
}

function mockClaims(overrides: Partial<Parameters<typeof CloudPlatform.encodeMockIdToken>[0]> = {}) {
  return {
    sub: "google-user-1",
    aud: CLIENT_ID,
    iss: "https://accounts.google.com",
    exp: Math.floor(FIXED_NOW.getTime() / 1000) + 3600,
    email: "user@example.com",
    name: "Lore User",
    ...overrides
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Google auth", () => {
  it("starts browser OAuth with an authorization code URL and state cookie", async () => {
    enableGoogleMockEnv();
    const platform = freshPlatform();

    const result = await handle(platform, "http://localhost/auth/google/start");

    expect(result.status).toBe(200);
    const payload = result.payload as { authorizationUrl: string; state: string; scopes: string[] };
    const authorizationUrl = new URL(payload.authorizationUrl);
    expect(authorizationUrl.origin).toBe("https://accounts.google.com");
    expect(authorizationUrl.searchParams.get("response_type")).toBe("code");
    expect(authorizationUrl.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe("http://localhost/auth/google/callback");
    expect(authorizationUrl.searchParams.get("state")).toBe(payload.state);
    expect(payload.scopes).toEqual(["openid", "email", "profile"]);
    expect(extractSetCookie(result, "lore_oauth_state")).toBe(`lore_oauth_state=${payload.state}`);
  });

  it("completes browser OAuth callback with a code, matching state, and session cookies", async () => {
    enableGoogleMockEnv();
    const platform = freshPlatform();
    const started = await handle(platform, "http://localhost/auth/google/start");
    const stateCookie = extractSetCookie(started, "lore_oauth_state");
    const state = stateCookie.split("=")[1]!;
    const code = CloudPlatform.encodeMockAuthorizationCode(mockClaims());
    const callbackUrl = `http://localhost/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

    const result = await handle(platform, callbackUrl, { headers: { cookie: stateCookie } });

    expect(result.status).toBe(200);
    expect(result.payload).toMatchObject({
      account: { email: "user@example.com", displayName: "Lore User" },
      identity: { provider: "google", providerUserId: "google-user-1", email: "user@example.com" },
      createdNew: true
    });
    expect(extractSetCookie(result, "lore_session")).toMatch(/^lore_session=lct_session_/);
    expect(extractSetCookie(result, "lore_csrf")).toMatch(/^lore_csrf=[a-f0-9]{64}$/);
    expect(extractSetCookie(result, "lore_oauth_state")).toBe("lore_oauth_state=");
  });

  it("preserves callback session cookies through the Node HTTP header bridge", async () => {
    enableGoogleMockEnv();
    const platform = freshPlatform();
    const app = createLoreApi({ cloudPlatform: platform });
    const started = await app.handle(new Request("http://localhost/auth/google/start"));
    const stateCookie = started.headers.getSetCookie().find((cookie) => cookie.startsWith("lore_oauth_state="));
    expect(stateCookie).toBeDefined();
    const state = stateCookie!.split(";")[0]!.split("=")[1]!;
    const code = CloudPlatform.encodeMockAuthorizationCode(mockClaims());

    const callback = await app.handle(new Request(
      `http://localhost/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      { headers: { cookie: stateCookie!.split(";")[0]! } }
    ));
    const nodeHeaders = responseHeadersToNodeHeaders(callback.headers);
    const setCookies = nodeHeaders["set-cookie"];

    expect(callback.status).toBe(200);
    expect(Array.isArray(setCookies)).toBe(true);
    expect(setCookies).toEqual(expect.arrayContaining([
      expect.stringMatching(/^lore_session=lct_session_/),
      expect.stringMatching(/^lore_csrf=[a-f0-9]{64}/),
      expect.stringMatching(/^lore_oauth_state=/)
    ]));

    const cookieHeader = (setCookies as string[])
      .filter((cookie) => cookie.startsWith("lore_session=") || cookie.startsWith("lore_csrf="))
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    const csrf = cookieHeader.match(/(?:^|; )lore_csrf=([^;]+)/)?.[1];
    expect(csrf).toBeDefined();

    const me = await app.handle(new Request("http://localhost/v1/me", { headers: { cookie: cookieHeader } }));
    expect(me.status).toBe(200);

    const logout = await app.handle(new Request("http://localhost/auth/logout", {
      method: "POST",
      headers: { cookie: cookieHeader, "x-lore-csrf": csrf! }
    }));
    const logoutSetCookies = responseHeadersToNodeHeaders(logout.headers)["set-cookie"];

    expect(logout.status).toBe(200);
    expect(Array.isArray(logoutSetCookies)).toBe(true);
    expect(logoutSetCookies).toEqual(expect.arrayContaining([
      expect.stringMatching(/^lore_session=;/),
      expect.stringMatching(/^lore_csrf=;/)
    ]));

    const afterLogout = await app.handle(new Request("http://localhost/v1/me", { headers: { cookie: cookieHeader } }));
    expect(afterLogout.status).toBe(401);
  });

  it("lets a signed-in user issue and redeem a live connection token with CSRF", async () => {
    enableGoogleMockEnv();
    const platform = freshPlatform();
    const app = createLoreApi({ cloudPlatform: platform });
    const started = await app.handle(new Request("http://app.lore.test/auth/google/start"));
    const stateCookie = started.headers.getSetCookie().find((cookie) => cookie.startsWith("lore_oauth_state="));
    expect(stateCookie).toBeDefined();
    const state = stateCookie!.split(";")[0]!.split("=")[1]!;
    const code = CloudPlatform.encodeMockAuthorizationCode(mockClaims({ email: "self-service@example.com" }));

    const callback = await app.handle(new Request(
      `http://app.lore.test/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      { headers: { cookie: stateCookie!.split(";")[0]! } }
    ));
    const setCookies = responseHeadersToNodeHeaders(callback.headers)["set-cookie"] as string[];
    const cookieHeader = setCookies
      .filter((cookie) => cookie.startsWith("lore_session=") || cookie.startsWith("lore_csrf="))
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    const csrf = cookieHeader.match(/(?:^|; )lore_csrf=([^;]+)/)?.[1];
    expect(csrf).toBeDefined();

    const missingCsrf = await app.handle(new Request("http://app.lore.test/v1/cloud/install-token", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: "{}"
    }));
    expect(missingCsrf.status).toBe(403);

    const install = await app.handle(new Request("http://app.lore.test/v1/cloud/install-token", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader, "x-lore-csrf": csrf! },
      body: JSON.stringify({})
    }));
    expect(install.status).toBe(200);
    const installPayload = await install.json() as { installToken: string; accountId: string; vaultId: string };
    expect(installPayload.installToken).toMatch(/^lct_install_/);
    expect(installPayload.accountId).toMatch(/^acct_/);
    expect(installPayload.vaultId).toMatch(/^vault_/);

    const pair = await app.handle(new Request("http://app.lore.test/v1/cloud/devices/pair", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ installToken: installPayload.installToken, deviceLabel: "dashboard" })
    }));
    expect(pair.status).toBe(200);
    const pairPayload = await pair.json() as { deviceToken: string; serviceToken: string; accountId: string; vaultId: string };
    expect(pairPayload.deviceToken).toMatch(/^lct_device_/);
    expect(pairPayload.serviceToken).toMatch(/^lct_service_/);
    expect(pairPayload.accountId).toBe(installPayload.accountId);
    expect(pairPayload.vaultId).toBe(installPayload.vaultId);
  });

  it("rejects Google callback when the state cookie is missing or mismatched", async () => {
    enableGoogleMockEnv();
    const platform = freshPlatform();
    const code = CloudPlatform.encodeMockAuthorizationCode(mockClaims());
    const callbackUrl = `http://localhost/auth/google/callback?code=${encodeURIComponent(code)}&state=state_from_google`;

    await expect(handle(platform, callbackUrl)).rejects.toMatchObject({
      code: "auth.state_mismatch",
      status: 400
    });

    await expect(handle(platform, callbackUrl, { headers: { cookie: "lore_oauth_state=different_state" } })).rejects.toMatchObject({
      code: "auth.state_mismatch",
      status: 400
    });
  });

  it("keeps the POST id_token path but requires a matching state cookie", async () => {
    enableGoogleMockEnv();
    const platform = freshPlatform();
    const started = await handle(platform, "http://localhost/auth/google/start");
    const stateCookie = extractSetCookie(started, "lore_oauth_state");
    const state = stateCookie.split("=")[1]!;
    const idToken = CloudPlatform.encodeMockIdToken(mockClaims({ sub: "google-user-2", email: "post@example.com" }));

    await expect(handle(platform, "http://localhost/auth/google/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id_token: idToken, state })
    })).rejects.toMatchObject({ code: "auth.state_mismatch", status: 400 });

    const result = await handle(platform, "http://localhost/auth/google/callback", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: stateCookie },
      body: JSON.stringify({ id_token: idToken, state })
    });

    expect(result.status).toBe(200);
    expect(result.payload).toMatchObject({
      account: { email: "post@example.com" },
      identity: { providerUserId: "google-user-2" },
      createdNew: true
    });
  });
});
