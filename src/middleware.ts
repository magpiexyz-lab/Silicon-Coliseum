import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes: require auth + admin check
  if (pathname.startsWith("/admin")) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin(session.walletAddress)) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  // Dashboard routes: require auth
  if (pathname.startsWith("/dashboard")) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Login and signup: redirect to dashboard if already authenticated
  if (pathname === "/login" || pathname === "/signup") {
    const session = await getSessionFromRequest(request);
    if (session) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  // All other routes (arenas, profile, tokens, landing): pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
