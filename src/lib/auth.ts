import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "session";
const JWT_EXPIRY = "7d";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

// Create a JWT session token
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

// Verify a JWT session token
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

// Set session cookie on a NextResponse
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  });
}

// Get session from a NextRequest by reading the cookie and verifying
export async function getSessionFromRequest(
  request: NextRequest
): Promise<{ userId: string; walletAddress: string } | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}
