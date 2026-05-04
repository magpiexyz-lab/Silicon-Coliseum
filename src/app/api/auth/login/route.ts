import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const limit = rateLimit(ip, "write");
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const supabase = createServiceClient();

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      // Check if it's an unconfirmed email error
      if (authError.message.includes("Email not confirmed")) {
        return NextResponse.json(
          { error: "Please confirm your email before logging in. Check your inbox." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    const authId = authData.user.id;

    // Look up user in users table by auth_id
    let userData = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .maybeSingle();

    // If not found by auth_id, try by email
    if (!userData.data) {
      userData = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();
    }

    if (!userData.data) {
      return NextResponse.json(
        { error: "User account not found. Please sign up first." },
        { status: 404 }
      );
    }

    const user = userData.data;

    // Create JWT session
    const token = await createSession(user.id, email);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        cpBalance: user.cp_balance ?? 0,
        isAdmin: user.is_admin ?? false,
      },
    });
    setSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
