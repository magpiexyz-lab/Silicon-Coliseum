import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
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

    // Check if email already exists in auth
    const { data: existingEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Create user with Supabase Auth — email confirmation required
    // Supabase will send a confirmation email automatically
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { username },
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

    // Insert into users table (but user cannot login until email confirmed)
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

    // Send confirmation email via Supabase Auth
    // generateLink creates a magic link for email confirmation
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo: `${siteUrl}/api/auth/confirm`,
      },
    });

    // Don't create session yet — user must confirm email first
    return NextResponse.json({
      success: true,
      needsConfirmation: true,
      message: "Check your email to confirm your account",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
