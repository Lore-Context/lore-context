import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyLore(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyLore(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyLore(request, context);
}

async function proxyLore(request: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  const targetBase = resolveLoreApiBase();
  if (!targetBase.ok) {
    return jsonProxyError(targetBase.status, targetBase.code, targetBase.message);
  }
  const sourceUrl = new URL(request.url);
  const path = params.path.join("/");
  const targetUrl = new URL(`/${path}${sourceUrl.search}`, targetBase.url);
  const headers = new Headers();

  copyBearerHeader(request.headers, headers);
  copyHeader(request.headers, headers, "x-lore-api-key");
  copyAllowlistedCookies(request.headers, headers);
  copyHeader(request.headers, headers, "x-lore-csrf");
  copyHeader(request.headers, headers, "content-type");

  // Public SaaS traffic uses Lore's own session cookies. Admin API-key
  // injection is opt-in and only available after the dashboard middleware has
  // positively marked the request as Basic-authenticated.
  if (
    request.headers.get("x-lore-dashboard-authenticated") === "basic" &&
    process.env.LORE_DASHBOARD_ADMIN_PROXY === "1" &&
    !headers.has("authorization") &&
    !headers.has("x-lore-api-key") &&
    process.env.LORE_API_KEY
  ) {
    headers.set("authorization", `Bearer ${process.env.LORE_API_KEY}`);
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store"
    });
  } catch {
    return jsonProxyError(502, "dashboard.proxy_unreachable", "Lore API proxy target is unreachable");
  }

  const responseHeaders = new Headers();
  copyHeader(response.headers, responseHeaders, "content-type");
  copyHeader(response.headers, responseHeaders, "www-authenticate");
  copySetCookieHeaders(response.headers, responseHeaders);
  // The API returns a JSON envelope `{ authorizationUrl, state, scopes }` so
  // dashboard JS clients can drive sign-in via `fetch` + `location.assign`. A
  // direct browser navigation (e.g. the marketing site's `<a href>` CTA) has
  // no JS, so we unwrap that envelope into a 302 when the caller advertises
  // `Accept: text/html`. The `lore_oauth_state` cookie set by the API still
  // rides on this same response.
  if (path === "auth/google/start" && wantsHtml(request)) {
    // Vary on Accept so any edge/browser cache stores the 302 and the JSON
    // envelope under separate cache entries; without this an `<a>`-click 302
    // could be replayed to a later `fetch` caller (and vice versa), and the
    // embedded `lore_oauth_state` cookie would leak across users.
    responseHeaders.append("vary", "accept");
    responseHeaders.set("cache-control", "no-store, private");
    if (!response.ok) {
      // Don't render an upstream JSON error (e.g. auth.public_beta_paused)
      // as text to a browser nav; bounce back to the dashboard root with
      // the upstream status surfaced as a query param.
      responseHeaders.set("location", `/?auth_error=${encodeURIComponent(String(response.status))}`);
      responseHeaders.delete("content-type");
      return new Response(null, {
        status: 303,
        headers: responseHeaders
      });
    }
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as { authorizationUrl?: unknown };
      if (typeof parsed.authorizationUrl === "string" && isGoogleAuthorizeUrl(parsed.authorizationUrl)) {
        responseHeaders.set("location", parsed.authorizationUrl);
        responseHeaders.delete("content-type");
        return new Response(null, {
          status: 302,
          headers: responseHeaders
        });
      }
    } catch {
      // Non-JSON payload: pass through unchanged below.
    }
    return new Response(text, {
      status: response.status,
      headers: responseHeaders
    });
  }
  if (path === "auth/google/callback") {
    responseHeaders.set("location", response.ok ? "/" : `/?auth_error=${encodeURIComponent(String(response.status))}`);
    return new Response(null, {
      status: 303,
      headers: responseHeaders
    });
  }
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}

export function resolveLoreApiBase(): { ok: true; url: string } | { ok: false; status: number; code: string; message: string } {
  const configured = process.env.LORE_API_URL;
  const production = process.env.NODE_ENV === "production";
  if (!configured) {
    if (production) {
      return {
        ok: false,
        status: 500,
        code: "dashboard.config_missing",
        message: "LORE_API_URL must be set in production"
      };
    }
    return { ok: true, url: "http://127.0.0.1:3000" };
  }
  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    return {
      ok: false,
      status: 500,
      code: "dashboard.config_invalid",
      message: "LORE_API_URL must be an absolute URL"
    };
  }
  if (production && process.env.LORE_DASHBOARD_ALLOW_LOOPBACK_API !== "1" && isLoopbackHost(parsed.hostname)) {
    return {
      ok: false,
      status: 500,
      code: "dashboard.config_unsafe_loopback",
      message: "LORE_API_URL cannot point at loopback in production"
    };
  }
  return { ok: true, url: parsed.toString() };
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function jsonProxyError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message, status }, status },
    {
      status,
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}

function wantsHtml(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return /\btext\/html\b/i.test(accept);
}

// Defense-in-depth: only emit the upstream `authorizationUrl` as a top-level
// browser redirect when its origin is Google's authorize endpoint. This guards
// against a future API regression where a user-controlled value could be
// echoed into the response and turn this proxy into an open-redirect surface.
function isGoogleAuthorizeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === "https://accounts.google.com" && url.pathname === "/o/oauth2/v2/auth";
  } catch {
    return false;
  }
}

function copyHeader(source: Headers, target: Headers, name: string): void {
  const value = source.get(name);
  if (value) {
    target.set(name, value);
  }
}

// Forward only Lore-owned session cookies to the API. The browser may carry
// unrelated cookies (analytics, third-party widgets) that the API never reads;
// scrubbing them limits accidental leakage and keeps the proxy contract narrow.
const FORWARDED_COOKIE_NAMES = new Set(["lore_session", "lore_csrf", "lore_oauth_state"]);

function copyAllowlistedCookies(source: Headers, target: Headers): void {
  const value = source.get("cookie");
  if (!value) return;
  const kept: string[] = [];
  for (const part of value.split(/;\s*/)) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (FORWARDED_COOKIE_NAMES.has(name)) {
      kept.push(part);
    }
  }
  if (kept.length > 0) {
    target.set("cookie", kept.join("; "));
  }
}

function copyBearerHeader(source: Headers, target: Headers): void {
  const value = source.get("authorization");
  if (value?.match(/^Bearer\s+/i)) {
    target.set("authorization", value);
  }
}

function copySetCookieHeaders(source: Headers, target: Headers): void {
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookies = typeof getSetCookie === "function" ? getSetCookie.call(source) : [];
  if (cookies.length > 0) {
    for (const cookie of cookies) {
      target.append("set-cookie", cookie);
    }
    return;
  }
  copyHeader(source, target, "set-cookie");
}
