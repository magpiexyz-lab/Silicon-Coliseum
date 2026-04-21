import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { calculatePrice } from "@/lib/amm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const arenaId = searchParams.get("arena_id");

    const supabase = createServiceClient();

    let query = supabase
      .from("pools")
      .select(`
        *,
        token_a_ref:platform_tokens!pools_token_a_fkey(symbol, name),
        token_b_ref:platform_tokens!pools_token_b_fkey(symbol, name)
      `)
      .order("created_at", { ascending: false });

    if (arenaId) {
      query = query.eq("arena_id", arenaId);
    }

    const { data: rawPools, error } = await query;

    if (error) {
      console.error("Failed to fetch pools:", error);
      return NextResponse.json(
        { error: "Failed to fetch pools" },
        { status: 500 }
      );
    }

    // Enrich with current price and token symbols
    const pools = (rawPools || []).map((p: Record<string, unknown>) => {
      const reserveA = p.reserve_a as number;
      const reserveB = p.reserve_b as number;
      let currentPrice: number | null = null;
      try {
        currentPrice = calculatePrice(reserveA, reserveB);
      } catch {
        // Reserves may be zero for uninitialized pools
      }

      return {
        ...p,
        token_a_symbol: (p.token_a_ref as { symbol: string } | null)?.symbol,
        token_b_symbol: (p.token_b_ref as { symbol: string } | null)?.symbol,
        token_a_name: (p.token_a_ref as { name: string } | null)?.name,
        token_b_name: (p.token_b_ref as { name: string } | null)?.name,
        token_a_ref: undefined,
        token_b_ref: undefined,
        current_price: currentPrice,
      };
    });

    return NextResponse.json({ pools });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
