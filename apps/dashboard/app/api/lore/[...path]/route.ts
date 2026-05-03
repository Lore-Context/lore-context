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
  const targetBase = process.env.LORE_API_URL ?? "http://127.0.0.1:3000";
  const sourceUrl = new URL(request.url);
  const path = params.path.join("/");
  const targetUrl = new URL(`/${path}${sourceUrl.search}`, targetBase);
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

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
    cache: "no-store"
  });

  const responseHeaders = new Headers();
  copyHeader(response.headers, responseHeaders, "content-type");
  copyHeader(response.headers, responseHeaders, "www-authenticate");
  copySetCookieHeaders(response.headers, responseHeaders);
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
