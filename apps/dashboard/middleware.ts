import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

export function middleware(request: NextRequest): NextResponse {
  const isProd = process.env.NODE_ENV === "production";
  const disableAuth = process.env.LORE_DASHBOARD_DISABLE_AUTH === "1";
  const publicSaas = process.env.LORE_DASHBOARD_PUBLIC_SAAS === "1";

  // Disable auth is only allowed in non-production environments
  if (disableAuth && !isProd) {
    return withDashboardAuthMode(request, "dev");
  }

  if (publicSaas) {
    return withDashboardAuthMode(request, "public");
  }

  const expectedUser = process.env.DASHBOARD_BASIC_AUTH_USER;
  const expectedPass = process.env.DASHBOARD_BASIC_AUTH_PASS;

  // In production, refuse to start without auth credentials configured
  if (isProd && (!expectedUser || !expectedPass)) {
    return new NextResponse(
      "DASHBOARD_BASIC_AUTH not configured — refusing to expose admin proxy",
      { status: 503, headers: { "Content-Type": "text/plain" } }
    );
  }

  // If credentials not configured in dev, allow through
  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Lore Dashboard"',
        "Content-Type": "text/plain"
      }
    });
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  let credentials: string;
  try {
    credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
  } catch {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Lore Dashboard"',
        "Content-Type": "text/plain"
      }
    });
  }

  const colonIndex = credentials.indexOf(":");
  if (colonIndex === -1) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Lore Dashboard"',
        "Content-Type": "text/plain"
      }
    });
  }

  const user = credentials.slice(0, colonIndex);
  const pass = credentials.slice(colonIndex + 1);

  if (user !== expectedUser || pass !== expectedPass) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Lore Dashboard"',
        "Content-Type": "text/plain"
      }
    });
  }

  return withDashboardAuthMode(request, "basic");
}

function withDashboardAuthMode(request: NextRequest, mode: "basic" | "dev" | "public"): NextResponse {
  const headers = new Headers(request.headers);
  headers.set("x-lore-dashboard-authenticated", mode);
  return NextResponse.next({ request: { headers } });
}
