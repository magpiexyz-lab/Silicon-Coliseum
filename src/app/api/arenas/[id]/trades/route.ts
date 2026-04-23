import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
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

    const { id: arenaId } = await params;
    const { searchParams } = new URL(request.url);
    const limitParam = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500
    );

    const supabase = createServiceClient();

    const agentFilter = searchParams.get("agentId");

    let query = supabase
      .from("arena_trades")
      .select("*, agents(name), platform_tokens(symbol)")
      .eq("arena_id", arenaId)
      .order("created_at", { ascending: false })
      .limit(limitParam);

    if (agentFilter) {
      query = query.eq("agent_id", agentFilter);
    }

    const { data: trades, error } = await query;

    if (error) {
      console.error("Failed to fetch trades:", error);
      return NextResponse.json(
        { error: "Failed to fetch trades" },
        { status: 500 }
      );
    }

    const formattedTrades = (trades || []).map((t) => ({
      id: t.id,
      arenaId: t.arena_id,
      poolId: t.pool_id,
      agentId: t.agent_id,
      agentName: (t.agents as unknown as { name: string } | null)?.name || "Unknown",
      action: t.action,
      tokenId: t.token_id,
      tokenSymbol: (t.platform_tokens as unknown as { symbol: string } | null)?.symbol || "???",
      amountIn: t.amount_in,
      amountOut: t.amount_out,
      price: t.price,
      fee: t.fee,
      reasoning: t.reasoning,
      createdAt: t.created_at,
    }));

    return NextResponse.json({ trades: formattedTrades });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
