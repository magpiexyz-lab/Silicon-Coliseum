import { NextResponse, NextRequest } from "next/server";
import { createServiceClient, createServerClient } from "@/lib/supabase-server";
import { createSession, setSessionCookie } from "@/lib/auth";

/**
 * GET /api/auth/confirm
 * Handles email confirmation redirect from Supabase.
 * Verifies the token, awards signup bonus, creates session, redirects to dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  const supabase = createServiceClient();

  try {
    // Handle PKCE flow (code exchange)
    if (code) {
      const anonClient = createServerClient();
      const { data: sessionData, error: exchangeError } =
        await anonClient.auth.exchangeCodeForSession(code);

      if (exchangeError || !sessionData.user) {
        console.error("Code exchange error:", exchangeError);
        return NextResponse.redirect(
          new URL("/login?error=confirmation_failed", origin)
        );
      }

      const authUser = sessionData.user;

      // Look up the user we created during signup
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, email")
        .eq("auth_id", authUser.id)
        .maybeSingle();

      if (existingUser) {
        const token = await createSession(existingUser.id, existingUser.email);
        const response = NextResponse.redirect(
          new URL("/dashboard?confirmed=true", origin)
        );
        setSessionCookie(response, token);
        return response;
      }

      // Create user row if missing
      const username =
        (authUser.user_metadata?.username as string) ||
        authUser.email?.split("@")[0] ||
        "user";

      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          email: authUser.email!,
          username,
          auth_id: authUser.id,
          cp_balance: 0,
          is_admin: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error("User creation in confirm error:", insertError);
        return NextResponse.redirect(
          new URL("/login?error=user_creation_failed", origin)
        );
      }

      await supabase.from("user_profiles").insert({
        user_id: newUser.id,
        total_arenas: 0,
        wins: 0,
        top3_finishes: 0,
        best_pnl: 0,
        total_trades: 0,
      });

      const token = await createSession(newUser.id, authUser.email!);
      const response = NextResponse.redirect(
        new URL("/dashboard?confirmed=true", origin)
      );
      setSessionCookie(response, token);
      return response;
    }

    if (!token_hash || type !== "signup") {
      // Fallback: redirect to callback route which handles other types
      const callbackUrl = new URL("/api/auth/callback", origin);
      callbackUrl.search = request.nextUrl.search;
      return NextResponse.redirect(callbackUrl);
    }

    // Verify the email confirmation OTP (implicit flow)
    const anonClient = createServerClient();
    const { data: verifyData, error: verifyError } =
      await anonClient.auth.verifyOtp({
        token_hash,
        type: "signup",
      });

    if (verifyError || !verifyData.user) {
      console.error("Email confirmation error:", verifyError);
      return NextResponse.redirect(
        new URL("/login?error=confirmation_failed", origin)
      );
    }

    const authUser = verifyData.user;

    // Look up the user we created during signup
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (existingUser) {
      const token = await createSession(existingUser.id, existingUser.email);
      const response = NextResponse.redirect(
        new URL("/dashboard?confirmed=true", origin)
      );
      setSessionCookie(response, token);
      return response;
    }

    // Edge case: user row wasn't created during signup (shouldn't happen)
    // Create it now from auth metadata
    const username =
      (authUser.user_metadata?.username as string) ||
      authUser.email?.split("@")[0] ||
      "user";

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email: authUser.email!,
        username,
        auth_id: authUser.id,
        cp_balance: 0,
        is_admin: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("User creation in confirm error:", insertError);
      return NextResponse.redirect(
        new URL("/login?error=user_creation_failed", origin)
      );
    }

    await supabase.from("user_profiles").insert({
      user_id: newUser.id,
      total_arenas: 0,
      wins: 0,
      top3_finishes: 0,
      best_pnl: 0,
      total_trades: 0,
    });

    const token = await createSession(newUser.id, authUser.email!);
    const response = NextResponse.redirect(
      new URL("/dashboard?confirmed=true", origin)
    );
    setSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error("Confirm callback error:", err);
    return NextResponse.redirect(new URL("/login?error=unknown", origin));
  }
}
