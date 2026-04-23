import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = rateLimit(ip, "read");
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createServiceClient();
    const tab = request.nextUrl.searchParams.get("tab") || "agents";

    if (tab === "agents") {
      // Aggregate from arena_results grouped by agent
      const { data: results } = await supabase
        .from("arena_results")
        .select("agent_id, final_rank, pnl_percent, reward_cp, trade_count, agents(name, risk_level, user_id, users(username))");

      if (!results || results.length === 0) {
        return NextResponse.json({ leaderboard: [] });
      }

      // Group by agent
      const agentMap = new Map<string, {
        agentName: string;
        ownerUsername: string;
        riskLevel: string;
        arenas: number;
        wins: number;
        totalPnl: number;
        totalCp: number;
        pnlValues: number[];
      }>();

      for (const r of results) {
        const agent = r.agents as unknown as {
          name: string;
          risk_level: string;
          user_id: string;
          users: { username: string } | null;
        } | null;

        if (!agent) continue;

        const existing = agentMap.get(r.agent_id) || {
          agentName: agent.name,
          ownerUsername: agent.users?.username || "Unknown",
          riskLevel: agent.risk_level,
          arenas: 0,
          wins: 0,
          totalPnl: 0,
          totalCp: 0,
          pnlValues: [],
        };

        existing.arenas += 1;
        if (r.final_rank === 1) existing.wins += 1;
        existing.totalCp += r.reward_cp || 0;
        existing.pnlValues.push(r.pnl_percent || 0);

        agentMap.set(r.agent_id, existing);
      }

      const leaderboard = Array.from(agentMap.entries())
        .map(([agentId, data]) => {
          const avgPnl = data.pnlValues.length > 0
            ? data.pnlValues.reduce((a, b) => a + b, 0) / data.pnlValues.length
            : 0;
          return {
            agentId,
            agentName: data.agentName,
            ownerUsername: data.ownerUsername,
            riskLevel: data.riskLevel,
            arenas: data.arenas,
            wins: data.wins,
            avgPnl,
            totalCp: data.totalCp,
          };
        })
        .sort((a, b) => b.wins - a.wins || b.avgPnl - a.avgPnl)
        .map((entry, i) => ({ ...entry, rank: i + 1 }));

      return NextResponse.json({ leaderboard });
    }

    if (tab === "bettors") {
      // Aggregate from bets + cp_transactions
      const { data: bets } = await supabase
        .from("bets")
        .select("user_id, cp_amount, status, payout, users(username)");

      if (!bets || bets.length === 0) {
        return NextResponse.json({ leaderboard: [] });
      }

      const bettorMap = new Map<string, {
        username: string;
        betsPlaced: number;
        betsWon: number;
        totalCpWon: number;
      }>();

      for (const b of bets) {
        const user = b.users as unknown as { username: string } | null;
        const existing = bettorMap.get(b.user_id) || {
          username: user?.username || "Unknown",
          betsPlaced: 0,
          betsWon: 0,
          totalCpWon: 0,
        };

        existing.betsPlaced += 1;
        if (b.status === "won") {
          existing.betsWon += 1;
          existing.totalCpWon += (b.payout || 0) - b.cp_amount;
        }

        bettorMap.set(b.user_id, existing);
      }

      const leaderboard = Array.from(bettorMap.entries())
        .map(([userId, data]) => ({
          userId,
          username: data.username,
          betsPlaced: data.betsPlaced,
          betsWon: data.betsWon,
          totalCpWon: data.totalCpWon,
        }))
        .sort((a, b) => b.totalCpWon - a.totalCpWon || b.betsWon - a.betsWon)
        .map((entry, i) => ({ ...entry, rank: i + 1 }));

      return NextResponse.json({ leaderboard });
    }

    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
