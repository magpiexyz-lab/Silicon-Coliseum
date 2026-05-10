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

    // Check if include params are requested
    const url = new URL(request.url);
    const include = url.searchParams.get("include");

    // Fetch active arenas (agents in active arenas)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let activeArenas: any[] = [];
    if (include === "active_arenas") {
      const { data: activeEntries } = await supabase
        .from("arena_entries")
        .select("arena_id, agent_id, agents(id, name), arenas(id, name, status, competition_end)")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (activeEntries) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = (activeEntries as any[]).filter(
          (e) => e.arenas?.status === "active"
        );
        activeArenas = await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filtered.map(async (entry: any) => {
            const { data: lb } = await supabase
              .from("arena_results")
              .select("final_rank, pnl_percent")
              .eq("arena_id", entry.arena_id)
              .eq("agent_id", entry.agent_id)
              .maybeSingle();

            return {
              arenaId: entry.arena_id,
              arenaName: entry.arenas?.name || "Arena",
              agentName: entry.agents?.name || "Agent",
              currentRank: lb?.final_rank || 0,
              pnlPercent: lb?.pnl_percent || 0,
              status: "active",
            };
          })
        );
      }
    }

    // Fetch arena history (completed arenas)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let history: any[] = [];
    if (include === "history") {
      const { data: results } = await supabase
        .from("arena_results")
        .select("arena_id, agent_id, final_rank, pnl_percent, reward_cp, agents(name), arenas(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (results) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        history = (results as any[]).map((r) => ({
          arenaId: r.arena_id,
          arenaName: r.arenas?.name || "Arena",
          agentName: r.agents?.name || "Agent",
          rank: r.final_rank,
          pnlPercent: r.pnl_percent,
          cpEarned: r.reward_cp || 0,
        }));
      }
    }

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
      ...(include === "active_arenas" ? { activeArenas } : {}),
      ...(include === "history" ? { history } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
