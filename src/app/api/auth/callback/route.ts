import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error);
      return NextResponse.redirect(
        new URL("/login?error=auth_failed", origin)
      );
    }

    return NextResponse.redirect(new URL("/arenas", origin));
  } catch {
    return NextResponse.redirect(new URL("/login?error=unknown", origin));
  }
}
