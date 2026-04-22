import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const limit = rateLimit(ip, "read");
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    let session;
    try {
      session = await requireAuth(request);
    } catch (res) {
      if (res instanceof Response) {
        return NextResponse.json(
          JSON.parse(await res.text()),
          { status: res.status }
        );
      }
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Look up user
    let userData = await supabase
      .from("users")
      .select("*")
      .eq("id", session.userId)
      .maybeSingle();

    if (!userData.data) {
      userData = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", session.userId)
        .maybeSingle();
    }

    if (!userData.data) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userData.data;

    // Fetch user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatar_url || null,
        isAdmin: user.is_admin || false,
        cpBalance: user.cp_balance ?? 0,
        createdAt: user.created_at,
      },
      profile: profile
        ? {
            totalArenas: profile.total_arenas || 0,
            wins: profile.wins || 0,
            top3Finishes: profile.top3_finishes || 0,
            bestPnl: profile.best_pnl || 0,
            totalTrades: profile.total_trades || 0,
          }
        : {
            totalArenas: 0,
            wins: 0,
            top3Finishes: 0,
            bestPnl: 0,
            totalTrades: 0,
          },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
