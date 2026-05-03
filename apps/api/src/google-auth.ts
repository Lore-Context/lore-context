import { createHash, createHmac, createPublicKey, createVerify, randomBytes, randomUUID, timingSafeEqual, type webcrypto } from "node:crypto";

// Lore v1.0 Google sign-in primitives.
//
// This module is intentionally narrow: it owns env-var parsing, the
// "is auth available" decision, OIDC ID-token claim validation, session token
// minting, cookie helpers, and CSRF helpers. The `CloudPlatform` calls into it
// from request handlers in `cloud.ts`.
//
// Production Google ID tokens are verified against Google's JWKS. Mock mode is
// retained for deterministic tests and local onboarding demos.

export const GOOGLE_PROVIDER = "google";
export const GOOGLE_ALLOWED_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
export const GOOGLE_REQUIRED_SCOPES = ["openid", "email", "profile"] as const;
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const SESSION_COOKIE = "lore_session";
export const CSRF_COOKIE = "lore_csrf";
export const STATE_COOKIE = "lore_oauth_state";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Minimum SESSION_SECRET length enforced in production. HMAC-SHA256 keys can be
// shorter in theory, but a value below 32 chars almost always indicates a
// placeholder/dev string left in the env. We refuse to enable auth in that
// case so a misconfigured prod box never signs cookies with a weak secret.
const MIN_PROD_SESSION_SECRET_LENGTH = 32;
const MOCK_CODE_PREFIX = "mock-code-";

export type GoogleAuthEnv =
  | {
      enabled: true;
      mock: boolean;
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      sessionSecret: string;
      secureCookie: boolean;
      production: boolean;
    }
  | {
      enabled: false;
      reason: string;
      production: boolean;
    };

export interface GoogleIdTokenClaims {
  sub: string;
  email?: string;
  name?: string;
  aud: string;
  iss: string;
  exp: number;
  iat?: number;
  email_verified?: boolean;
  picture?: string;
}

export class GoogleAuthError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Read process.env once and decide if Google sign-in is wired. Tests pass a
// custom env to avoid depending on the host shell.
export function parseGoogleAuthEnv(env: NodeJS.ProcessEnv = process.env): GoogleAuthEnv {
  const production = env.NODE_ENV === "production";
  const mock = env.LORE_AUTH_MOCK_GOOGLE === "1";
  const clientId = env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri = env.GOOGLE_REDIRECT_URI ?? "";
  const sessionSecret = env.SESSION_SECRET ?? "";

  if (production && mock) {
    // Mock path is a development-only escape hatch. In production it MUST be
    // refused even if accidentally set, so a misconfigured env never grants
    // unauthenticated signups.
    return { enabled: false, reason: "LORE_AUTH_MOCK_GOOGLE not allowed in production", production };
  }

  if (mock) {
    // In mock mode we still require a session secret so cookies stay signed.
    // Default to a deterministic dev secret so tests can run without env setup.
    return {
      enabled: true,
      mock: true,
      clientId: clientId || "mock-google-client.local",
      clientSecret: clientSecret || "mock-google-client-secret",
      redirectUri: redirectUri || "http://localhost/auth/google/callback",
      sessionSecret: sessionSecret || "dev-session-secret-change-me",
      secureCookie: false,
      production: false
    };
  }

  if (!clientId || !clientSecret || !redirectUri || !sessionSecret) {
    const missing: string[] = [];
    if (!clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    if (!redirectUri) missing.push("GOOGLE_REDIRECT_URI");
    if (!sessionSecret) missing.push("SESSION_SECRET");
    return {
      enabled: false,
      reason: `Google sign-in disabled: missing env vars ${missing.join(", ")}`,
      production
    };
  }

  if (production && sessionSecret.length < MIN_PROD_SESSION_SECRET_LENGTH) {
    return {
      enabled: false,
      reason: `Google sign-in disabled: SESSION_SECRET must be at least ${MIN_PROD_SESSION_SECRET_LENGTH} chars in production`,
      production
    };
  }

  return {
    enabled: true,
    mock: false,
    clientId,
    clientSecret,
    redirectUri,
    sessionSecret,
    secureCookie: production,
    production
  };
}

export function buildGoogleAuthorizeUrl(env: Extract<GoogleAuthEnv, { enabled: true }>, state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("redirect_uri", env.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_REQUIRED_SCOPES.join(" "));
  url.searchParams.set("access_type", "online");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

// Exchange the browser authorization code for Google's id_token. The token is
// still routed through the same verifier as the POST test/client path.
export async function exchangeGoogleAuthorizationCode(
  code: string,
  env: Extract<GoogleAuthEnv, { enabled: true }>,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  if (env.mock && code.startsWith(MOCK_CODE_PREFIX)) {
    return code.slice(MOCK_CODE_PREFIX.length);
  }

  const body = new URLSearchParams({
    code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: env.redirectUri,
    grant_type: "authorization_code"
  });

  let response: Response;
  try {
    response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });
  } catch (error) {
    throw new GoogleAuthError(
      "auth.code_exchange_failed",
      `Google authorization code exchange failed: ${error instanceof Error ? error.message : String(error)}`,
      502
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GoogleAuthError("auth.code_exchange_failed", "Google token response was not JSON", 502);
  }

  if (!response.ok) {
    const message = readGoogleErrorDescription(payload) ?? `Google token endpoint returned ${response.status}`;
    throw new GoogleAuthError("auth.code_exchange_failed", message, 401);
  }

  if (!payload || typeof payload !== "object") {
    throw new GoogleAuthError("auth.code_exchange_failed", "Google token response was not an object", 502);
  }
  const idToken = (payload as Record<string, unknown>).id_token;
  if (typeof idToken !== "string" || idToken.length === 0) {
    throw new GoogleAuthError("auth.id_token_required", "Google token response did not include id_token", 401);
  }
  return idToken;
}

export async function verifyGoogleIdToken(
  idToken: string,
  env: Extract<GoogleAuthEnv, { enabled: true }>,
  now: number,
  fetchImpl: typeof fetch = fetch
): Promise<GoogleIdTokenClaims> {
  if (!env.mock) {
    await verifyJwtSignature(idToken, now, fetchImpl);
  }
  const claims = decodeIdTokenClaims(idToken, env.mock);
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new GoogleAuthError("auth.id_token_missing_sub", "id_token has no sub", 401);
  }
  if (claims.aud !== env.clientId) {
    throw new GoogleAuthError("auth.id_token_wrong_audience", "id_token audience does not match", 401);
  }
  if (!GOOGLE_ALLOWED_ISSUERS.has(claims.iss)) {
    throw new GoogleAuthError("auth.id_token_wrong_issuer", "id_token issuer is not Google", 401);
  }
  if (typeof claims.exp !== "number" || claims.exp * 1000 < now) {
    throw new GoogleAuthError("auth.id_token_expired", "id_token has expired", 401);
  }
  return claims;
}

export function encodeMockAuthorizationCode(claims: GoogleIdTokenClaims): string {
  return `${MOCK_CODE_PREFIX}${encodeMockIdToken(claims)}`;
}

function decodeIdTokenClaims(idToken: string, mock: boolean): GoogleIdTokenClaims {
  // Mock-friendly path: tests can pass a base64-url-encoded JSON object as
  // the entire token. We still require the same claim shape so production
  // and mock paths exercise the same validation surface.
  const trimmed = idToken.trim();
  const parts = trimmed.split(".");
  let payload: string;
  if (parts.length === 3) {
    payload = parts[1] ?? "";
  } else if (mock && parts.length === 1) {
    payload = trimmed;
  } else {
    throw new GoogleAuthError("auth.id_token_malformed", "id_token must be a JWT or mock claims", 401);
  }
  let json: string;
  try {
    json = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    throw new GoogleAuthError("auth.id_token_malformed", "id_token payload is not base64url", 401);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new GoogleAuthError("auth.id_token_malformed", "id_token payload is not JSON", 401);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new GoogleAuthError("auth.id_token_malformed", "id_token payload is not an object", 401);
  }
  return parsed as GoogleIdTokenClaims;
}

// Encode mock claims as a base64-url JSON blob suitable for the test path.
// Production callers never reach this — Google issues the real JWT.
export function encodeMockIdToken(claims: GoogleIdTokenClaims): string {
  return Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
}

interface GoogleJwksCache {
  expiresAt: number;
  keys: GoogleJwk[];
  fetchedAt: number;
}

type GoogleJwk = webcrypto.JsonWebKey & { kid?: string };

// How long we are willing to keep serving an expired JWKS payload while Google
// is unavailable. A short tail (15 min) prevents prolonged downtime caused by
// transient 5xx without weakening the verifier — keys still must match the
// originally signed kid, and Google's published rotation cadence is far longer.
const JWKS_FAIL_STALE_GRACE_MS = 15 * 60 * 1000;

let googleJwksCache: GoogleJwksCache | undefined;

/** @internal Test-only hook to clear the cache between cases. */
export function __resetGoogleJwksCacheForTests(): void {
  googleJwksCache = undefined;
}

async function verifyJwtSignature(idToken: string, now: number, fetchImpl: typeof fetch): Promise<void> {
  const parts = idToken.trim().split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new GoogleAuthError("auth.id_token_malformed", "id_token must be a signed JWT", 401);
  }

  const header = decodeJwtHeader(parts[0]);
  if (header.alg !== "RS256") {
    throw new GoogleAuthError("auth.id_token_bad_algorithm", "id_token must use RS256", 401);
  }
  if (!header.kid) {
    throw new GoogleAuthError("auth.id_token_missing_kid", "id_token has no key id", 401);
  }

  const keys = await fetchGoogleJwks(now, fetchImpl);
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    throw new GoogleAuthError("auth.id_token_unknown_key", "id_token signing key is not in Google JWKS", 401);
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const verified = verifier.verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(parts[2], "base64url"));
  if (!verified) {
    throw new GoogleAuthError("auth.id_token_bad_signature", "id_token signature is invalid", 401);
  }
}

function decodeJwtHeader(rawHeader: string): { alg?: string; kid?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(rawHeader, "base64url").toString("utf8"));
  } catch {
    throw new GoogleAuthError("auth.id_token_malformed", "id_token header is not valid JSON", 401);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new GoogleAuthError("auth.id_token_malformed", "id_token header is not an object", 401);
  }
  const record = parsed as Record<string, unknown>;
  return {
    alg: typeof record.alg === "string" ? record.alg : undefined,
    kid: typeof record.kid === "string" ? record.kid : undefined
  };
}

async function fetchGoogleJwks(now: number, fetchImpl: typeof fetch): Promise<GoogleJwk[]> {
  if (googleJwksCache && googleJwksCache.expiresAt > now) {
    return googleJwksCache.keys;
  }

  try {
    const response = await fetchImpl(GOOGLE_JWKS_URL);
    if (!response.ok) {
      throw new GoogleAuthError("auth.jwks_unavailable", `Google JWKS returned ${response.status}`, 502);
    }
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>).keys)) {
      throw new GoogleAuthError("auth.jwks_invalid", "Google JWKS response did not include keys", 502);
    }
    const maxAge = parseMaxAgeSeconds(response.headers.get("cache-control")) ?? 3600;
    const keys = (payload as { keys: GoogleJwk[] }).keys;
    googleJwksCache = { keys, expiresAt: now + maxAge * 1000, fetchedAt: now };
    return keys;
  } catch (error) {
    // Fail-stale: if Google JWKS becomes unreachable but we have a cached set
    // from a recent successful fetch, serve it for a short grace window so a
    // transient outage does not block every active sign-in. Outside the grace
    // window we surface the original failure.
    if (googleJwksCache && now - googleJwksCache.fetchedAt <= JWKS_FAIL_STALE_GRACE_MS) {
      return googleJwksCache.keys;
    }
    if (error instanceof GoogleAuthError) {
      throw error;
    }
    throw new GoogleAuthError(
      "auth.jwks_unavailable",
      `Google JWKS fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      502
    );
  }
}

function parseMaxAgeSeconds(cacheControl: string | null): number | undefined {
  const match = cacheControl?.match(/(?:^|,)\s*max-age=(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function readGoogleErrorDescription(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  return typeof record.error_description === "string"
    ? record.error_description
    : typeof record.error === "string"
      ? record.error
      : undefined;
}

// Sessions: random plaintext token + sha256 hash for the cloud_tokens row.
export function newSessionPlaintext(): string {
  return `lct_session_${randomBytes(32).toString("base64url")}`;
}

export function hmacCsrfToken(sessionPlaintext: string, secret: string): string {
  return createHmac("sha256", secret).update(sessionPlaintext).digest("hex");
}

export function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function newOauthState(): string {
  return randomBytes(32).toString("base64url");
}

export function newAccountId(): string { return `acct_${randomUUID()}`; }
export function newVaultId(): string { return `vault_${randomUUID()}`; }
export function newIdentityId(): string { return `oid_${randomUUID()}`; }

// Cookie helpers — minimal serialisers that respect HttpOnly, Secure,
// SameSite=Lax, and Max-Age. Multiple Set-Cookie headers are returned as an
// array so the wrapper can flatten into native Headers.
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  maxAgeSeconds?: number;
  path?: string;
  expires?: Date;
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${options.path ?? "/"}`);
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (typeof options.maxAgeSeconds === "number") parts.push(`Max-Age=${options.maxAgeSeconds}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  return parts.join("; ");
}

export function clearCookie(name: string, secure: boolean): string {
  return serializeCookie(name, "", { secure, maxAgeSeconds: 0, expires: new Date(0) });
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(/;\s*/)) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function hashSession(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
