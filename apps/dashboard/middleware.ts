import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

// V2.0.5-D3 / V2.0.5-U5: strict Content-Security-Policy + framing + referrer
// hardening for the secret vault unlock route. Applied to every /settings/secrets/*
// path so passphrase entry cannot be embedded, iframed, or exfiltrated via
// third-party scripts. The headers go on EVERY response — including 401/503
// early exits — so a clickjacking attacker cannot iframe the error page
// either.
//
// `unsafe-inline` in script-src is a documented trade-off for Next.js
// hydration scripts without per-request nonces; tracked as a v2.0.6 carry-
// forward in security-whitepaper.md §3. Defense-in-depth on this route
// relies on `frame-ancestors 'none'` + `form-action 'self'` + `object-src
// 'none'` + Basic Auth gating in front of the route.
export const SECRET_VAULT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests"
].join("; ");

export function applySecretVaultSecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  if (!pathname.startsWith("/settings/secrets")) return response;
  response.headers.set("Content-Security-Policy", SECRET_VAULT_CSP);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

function unauthorizedResponse(pathname: string): NextResponse {
  const response = new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Lore Dashboard"',
      "Content-Type": "text/plain"
    }
  });
  return applySecretVaultSecurityHeaders(response, pathname);
}

function serviceUnavailableResponse(pathname: string, body: string): NextResponse {
  const response = new NextResponse(body, {
    status: 503,
    headers: { "Content-Type": "text/plain" }
  });
  return applySecretVaultSecurityHeaders(response, pathname);
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const isProd = process.env.NODE_ENV === "production";
  const disableAuth = process.env.LORE_DASHBOARD_DISABLE_AUTH === "1";
  const publicSaas = process.env.LORE_DASHBOARD_PUBLIC_SAAS === "1";

  // Disable auth is only allowed in non-production environments
  if (disableAuth && !isProd) {
    return withDashboardAuthMode(request, "dev");
  }

  if (isProd && publicSaas && process.env.LORE_DASHBOARD_ADMIN_PROXY === "1") {
    return serviceUnavailableResponse(
      pathname,
      "LORE_DASHBOARD_PUBLIC_SAAS and LORE_DASHBOARD_ADMIN_PROXY are mutually exclusive in production"
    );
  }

  if (publicSaas) {
    return withDashboardAuthMode(request, "public");
  }

  const expectedUser = process.env.DASHBOARD_BASIC_AUTH_USER;
  const expectedPass = process.env.DASHBOARD_BASIC_AUTH_PASS;

  // In production, refuse to start without auth credentials configured
  if (isProd && (!expectedUser || !expectedPass)) {
    return serviceUnavailableResponse(
      pathname,
      "DASHBOARD_BASIC_AUTH not configured — refusing to expose admin proxy"
    );
  }

  // If credentials not configured in dev, allow through
  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse(pathname);
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  let credentials: string;
  try {
    credentials = decodeBase64Utf8(base64Credentials);
  } catch {
    return unauthorizedResponse(pathname);
  }

  const colonIndex = credentials.indexOf(":");
  if (colonIndex === -1) {
    return unauthorizedResponse(pathname);
  }

  const user = credentials.slice(0, colonIndex);
  const pass = credentials.slice(colonIndex + 1);

  // Compare BOTH parts before deciding — no short-circuit. This prevents a
  // remote attacker from inferring the username via timing (the prior `||`
  // form skipped the password comparison whenever the username mismatched).
  const userOk = timingSafeStringEqual(user, expectedUser);
  const passOk = timingSafeStringEqual(pass, expectedPass);
  if (!(userOk && passOk)) {
    return unauthorizedResponse(pathname);
  }

  return withDashboardAuthMode(request, "basic");
}

function withDashboardAuthMode(request: NextRequest, mode: "basic" | "dev" | "public"): NextResponse {
  const headers = new Headers(request.headers);
  headers.set("x-lore-dashboard-authenticated", mode);
  const response = NextResponse.next({ request: { headers } });
  return applySecretVaultSecurityHeaders(response, request.nextUrl.pathname);
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
