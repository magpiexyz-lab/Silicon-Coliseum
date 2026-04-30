import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { transformBetsResponse } from "@/lib/my-bets";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const session = await getSession(request);
    if (!session) {
      // Not logged in — return empty bets, no error
      return NextResponse.json({ bets: [] });
    }

    const { id: arenaId } = await params;
    const supabase = createServiceClient();

    // Resolve internal userId (auth_id -> users.id)
    let userId = session.userId;
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", session.userId)
      .maybeSingle();

    if (!user) {
      const { data: userByAuth } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", session.userId)
        .maybeSingle();
      if (userByAuth) {
        userId = userByAuth.id;
      } else {
        // User not found in database
        return NextResponse.json({ bets: [] });
      }
    }

    // Fetch user's bets for this arena, joined with agents for names
    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select("id, agent_id, agents(name), cp_amount, sol_amount, bet_currency, status, created_at")
      .eq("arena_id", arenaId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (betsError) {
      return NextResponse.json(
        { error: "Failed to fetch bets" },
        { status: 500 }
      );
    }

    const transformedBets = transformBetsResponse(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (bets || []) as any[]
    );

    // Fetch unclaimed SOL rewards for this arena
    const { data: solRewards } = await supabase
      .from("sol_rewards")
      .select("id, reward_type, sol_amount, is_claimed, wallet_address")
      .eq("arena_id", arenaId)
      .eq("user_id", userId)
      .eq("is_claimed", false);

    const rewards = (solRewards || []).map((r) => ({
      id: r.id,
      rewardType: r.reward_type,
      solAmount: r.sol_amount,
      isClaimed: r.is_claimed,
      walletAddress: r.wallet_address,
    }));

    return NextResponse.json({ bets: transformedBets, rewards });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
