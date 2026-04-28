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
  const targetUrl = new URL(`/${params.path.join("/")}${sourceUrl.search}`, targetBase);
  const headers = new Headers();

  copyHeader(request.headers, headers, "authorization");
  copyHeader(request.headers, headers, "x-lore-api-key");
  copyHeader(request.headers, headers, "content-type");

  if (!headers.has("authorization") && !headers.has("x-lore-api-key") && process.env.LORE_API_KEY) {
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
