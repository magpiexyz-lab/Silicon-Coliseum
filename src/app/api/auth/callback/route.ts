import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { awardSignupBonus } from "@/lib/points";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = createServiceClient();

  try {
    // Handle email verification via token_hash (magic link / email confirm)
    if (token_hash && type === "email") {
      const { data: verifyData, error: verifyError } =
        await supabase.auth.verifyOtp({
          token_hash,
          type: "email",
        });

      if (verifyError || !verifyData.user) {
        console.error("Email verification error:", verifyError);
        return NextResponse.redirect(
          new URL("/login?error=verification_failed", origin)
        );
      }

      const authUser = verifyData.user;
      const username =
        (authUser.user_metadata?.username as string) ||
        authUser.email?.split("@")[0] ||
        "user";

      // Check if user already exists (idempotent)
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authUser.id)
        .maybeSingle();

      if (!existingUser) {
        // Create users table row
        const { data: user, error: insertError } = await supabase
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
          console.error("User creation in callback error:", insertError);
          return NextResponse.redirect(
            new URL("/login?error=user_creation_failed", origin)
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
          // Non-fatal
        }

        // Set session cookie
        const token = await createSession(user.id, authUser.email!);
        const response = NextResponse.redirect(
          new URL("/dashboard", origin)
        );
        setSessionCookie(response, token);
        return response;
      }

      // Existing user — just set session
      const token = await createSession(
        existingUser.id,
        authUser.email!
      );
      const response = NextResponse.redirect(
        new URL("/dashboard", origin)
      );
      setSessionCookie(response, token);
      return response;
    }

    // Handle OAuth code exchange
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("OAuth callback error:", error);
        return NextResponse.redirect(
          new URL("/login?error=auth_failed", origin)
        );
      }

      return NextResponse.redirect(new URL("/dashboard", origin));
    }

    return NextResponse.redirect(
      new URL("/login?error=missing_params", origin)
    );
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=unknown", origin));
  }
}
