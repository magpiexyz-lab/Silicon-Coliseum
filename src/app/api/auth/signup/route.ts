import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { awardSignupBonus } from "@/lib/points";
import { rateLimit } from "@/lib/rate-limit";

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username must contain only letters, numbers, and underscores"
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, username, password } = parsed.data;

    const supabase = createServiceClient();

    // Check if username is taken
    const { data: existingUsername } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create auth user" },
        { status: 500 }
      );
    }

    const authId = authData.user.id;

    // Insert into users table
    const { data: user, error: insertError } = await supabase
      .from("users")
      .insert({
        email,
        username,
        auth_id: authId,
        cp_balance: 0,
        is_admin: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Signup insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create user_profiles entry
    await supabase.from("user_profiles").insert({
      user_id: user.id,
      total_arenas: 0,
      wins: 0,
      top3_finishes: 0,
      best_pnl: 0,
      total_trades: 0,
    });

    // Award 100 CP signup bonus
    try {
      await awardSignupBonus(supabase, user.id);
    } catch {
      // Non-fatal: user created but bonus failed
    }

    // Re-fetch user to get updated cp_balance
    const { data: updatedUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    // Create JWT session
    const token = await createSession(user.id, email);

    const response = NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id || user.id,
        email: updatedUser?.email || email,
        username: updatedUser?.username || username,
        cpBalance: updatedUser?.cp_balance ?? 0,
        isAdmin: updatedUser?.is_admin ?? false,
      },
    });
    setSessionCookie(response, token);

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
