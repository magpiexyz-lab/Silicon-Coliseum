import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getArenaDetail } from "@/lib/arena-manager";
import { calculatePrice } from "@/lib/amm";
import { rateLimit } from "@/lib/rate-limit";

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

    const { id } = await params;
    const supabase = createServiceClient();

    const detail = await getArenaDetail(supabase, id);

    // Enrich pools with current prices
    const poolsWithPrices = detail.pools.map((pool) => {
      let currentPrice = 0;
      try {
        currentPrice = calculatePrice(pool.reserveToken, pool.reserveBase);
      } catch {
        // Invalid reserves
      }
      return {
        ...pool,
        currentPrice,
      };
    });

    return NextResponse.json({
      arena: detail.arena,
      pools: poolsWithPrices,
      agents: detail.agents,
      recentTrades: detail.recentTrades,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
