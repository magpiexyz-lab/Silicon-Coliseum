import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "./types";

const COOKIE_NAME = "session";
const JWT_EXPIRY = "7d";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

// ============================================================================
// JWT Session Management (legacy, used by existing API routes)
// ============================================================================

/** Create a JWT session token */
export async function createSession(
  userId: string,
  walletAddress: string
): Promise<string> {
  const token = await new SignJWT({ userId, walletAddress })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());

  return token;
}

/** Verify a JWT session token */
export async function verifySession(
  token: string
): Promise<{ userId: string; walletAddress: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.userId as string;
    const walletAddress = payload.walletAddress as string;

    if (!userId || !walletAddress) {
      return null;
    }

    return { userId, walletAddress };
  } catch {
    return null;
  }
}

/** Set session cookie on a NextResponse */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  });
}

/** Get session from a NextRequest by reading the cookie and verifying */
export async function getSessionFromRequest(
  request: NextRequest
): Promise<{ userId: string; walletAddress: string } | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

// ============================================================================
// Supabase Auth Helpers (arena-first model)
// ============================================================================

/**
 * Read Supabase auth session from request.
 * Extracts userId and email from Supabase Auth JWT in cookie.
 */
export async function getSession(
  request: NextRequest
): Promise<{ userId: string; email: string } | null> {
  // First try Supabase auth token from cookie
  const supabaseToken =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("sb-auth-token")?.value;

  if (supabaseToken) {
    try {
      // Decode without verification -- Supabase handles verification
      const parts = supabaseToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf-8")
        );
        if (payload.sub && payload.email) {
          return { userId: payload.sub, email: payload.email };
        }
      }
    } catch {
      // Fall through to legacy session
    }
  }

  // Fallback to legacy JWT session
  const legacySession = await getSessionFromRequest(request);
  if (legacySession) {
    return { userId: legacySession.userId, email: "" };
  }

  return null;
}

/**
 * Require authenticated user. Throws 401 response if not authenticated.
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ userId: string; email: string }> {
  const session = await getSession(request);
  if (!session) {
    throw new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

/**
 * Require admin user. Throws 403 response if not admin.
 */
export async function requireAdmin(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<User> {
  const session = await requireAuth(request);

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.userId)
    .single();

  if (error || !user) {
    throw new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!user.is_admin) {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return {
    id: user.id,
    authId: user.auth_id || user.id,
    email: user.email || session.email,
    username: user.username,
    avatarUrl: user.avatar_url || null,
    isAdmin: user.is_admin,
    cpBalance: user.cp_balance || 0,
    createdAt: user.created_at,
  } as User;
}
