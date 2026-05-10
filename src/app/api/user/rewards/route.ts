import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/user/rewards
 * Returns all unclaimed SOL rewards for the authenticated user,
 * including arena name and reward type (performer vs bettor).
 */
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
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Resolve user ID
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
        return NextResponse.json({ rewards: [] });
      }
    } else {
      userId = user.id;
    }

    // Fetch all unclaimed SOL rewards with arena info
    const { data: rewards, error: rewardsError } = await supabase
      .from("sol_rewards")
      .select("id, arena_id, reward_type, sol_amount, wallet_address, is_claimed, created_at, arenas(name)")
      .eq("user_id", userId)
      .eq("is_claimed", false)
      .order("created_at", { ascending: false });

    if (rewardsError) {
      return NextResponse.json(
        { error: "Failed to fetch rewards" },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedRewards = (rewards || []).map((r: any) => ({
      id: r.id,
      arenaId: r.arena_id,
      arenaName: r.arenas?.name || "Arena",
      rewardType: r.reward_type, // "performer" or "bettor"
      solAmount: r.sol_amount, // in lamports
      walletAddress: r.wallet_address,
      createdAt: r.created_at,
    }));

    // Also fetch total claimed rewards for reference
    const { data: claimedRewards } = await supabase
      .from("sol_rewards")
      .select("sol_amount")
      .eq("user_id", userId)
      .eq("is_claimed", true);

    const totalClaimed = (claimedRewards || []).reduce(
      (sum: number, r: { sol_amount: number }) => sum + r.sol_amount,
      0
    );

    return NextResponse.json({
      rewards: formattedRewards,
      totalUnclaimed: formattedRewards.reduce(
        (sum: number, r: { solAmount: number }) => sum + r.solAmount,
        0
      ),
      totalClaimed,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
