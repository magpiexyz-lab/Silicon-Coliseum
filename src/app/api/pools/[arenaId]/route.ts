import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { calculatePrice } from "@/lib/amm";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
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

    const { arenaId } = await params;
    const supabase = createServiceClient();

    // Fetch pools with token info
    const { data: pools, error: poolsError } = await supabase
      .from("pools")
      .select("*, platform_tokens!pools_token_id_fkey(symbol, name)")
      .eq("arena_id", arenaId);

    if (poolsError) {
      console.error("Failed to fetch pools:", poolsError);
      return NextResponse.json(
        { error: "Failed to fetch pools" },
        { status: 500 }
      );
    }

    // Enrich pools with current prices
    const enrichedPools = (pools || []).map((pool) => {
      let currentPrice = 0;
      try {
        currentPrice = calculatePrice(pool.reserve_token, pool.reserve_base);
      } catch {
        // Invalid reserves
      }

      return {
        id: pool.id,
        arenaId: pool.arena_id,
        tokenId: pool.token_id,
        baseTokenId: pool.base_token_id,
        reserveToken: pool.reserve_token,
        reserveBase: pool.reserve_base,
        feeRate: pool.fee_rate,
        totalVolume: pool.total_volume,
        currentPrice,
        token: pool.platform_tokens,
      };
    });

    // Fetch last 50 snapshots per pool
    const poolIds = (pools || []).map((p) => p.id);
    let snapshots: Record<string, unknown[]> = {};

    if (poolIds.length > 0) {
      const { data: snapshotData } = await supabase
        .from("pool_snapshots")
        .select("*")
        .in("pool_id", poolIds)
        .order("created_at", { ascending: false })
        .limit(50 * poolIds.length);

      // Group snapshots by pool ID
      snapshots = {};
      for (const poolId of poolIds) {
        snapshots[poolId] = (snapshotData || [])
          .filter((s) => s.pool_id === poolId)
          .slice(0, 50);
      }
    }

    return NextResponse.json({ pools: enrichedPools, snapshots });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
