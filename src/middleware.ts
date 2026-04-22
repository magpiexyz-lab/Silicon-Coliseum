import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes: require auth
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/arenas")) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Login and signup: redirect to arenas if already authenticated
  if (pathname === "/login" || pathname === "/signup") {
    const session = await getSessionFromRequest(request);
    if (session) {
      const arenasUrl = new URL("/arenas", request.url);
      return NextResponse.redirect(arenasUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/arenas/:path*",
    "/login",
    "/signup",
  ],
};
