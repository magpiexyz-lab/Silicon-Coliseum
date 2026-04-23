import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const CreateTokenSchema = z.object({
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(10)
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, "Token name is required").max(100),
  imageUrl: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

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

    const supabase = createServiceClient();

    const { data: tokens, error } = await supabase
      .from("platform_tokens")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch tokens:", error);
      return NextResponse.json(
        { error: "Failed to fetch tokens" },
        { status: 500 }
      );
    }

    const include = request.nextUrl.searchParams.get("include");
    if (include === "prices" && tokens) {
      // Fetch pool prices for active arenas
      const { data: activeArenas } = await supabase
        .from("arenas")
        .select("id, name")
        .eq("status", "active");

      const enriched = await Promise.all(
        (tokens || []).map(async (token) => {
          const prices: Array<{ arenaName: string; price: number; priceChange: number }> = [];
          const recentTrades: Array<{ action: string; agentName: string; amount: number; price: number; createdAt: string }> = [];

          if (activeArenas && !token.is_base_currency) {
            for (const arena of activeArenas) {
              const { data: pool } = await supabase
                .from("pools")
                .select("reserve_token, reserve_base")
                .eq("arena_id", arena.id)
                .eq("token_id", token.id)
                .maybeSingle();

              if (pool && pool.reserve_token > 0) {
                const price = pool.reserve_base / pool.reserve_token;
                prices.push({
                  arenaName: arena.name,
                  price,
                  priceChange: 0,
                });
              }
            }
          }

          // Fetch recent trades for this token
          const { data: trades } = await supabase
            .from("arena_trades")
            .select("action, price, created_at, agent_id, agents(name)")
            .eq("token_id", token.id)
            .order("created_at", { ascending: false })
            .limit(5);

          if (trades) {
            for (const t of trades) {
              const agentData = t.agents as unknown as { name: string } | null;
              recentTrades.push({
                action: t.action,
                agentName: agentData?.name || "Unknown",
                amount: 0,
                price: t.price,
                createdAt: t.created_at,
              });
            }
          }

          return {
            ...token,
            isBaseCurrency: token.is_base_currency,
            prices,
            recentTrades,
          };
        })
      );

      return NextResponse.json({ tokens: enriched });
    }

    return NextResponse.json({ tokens: tokens || [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const limit = rateLimit(ip, "write");
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const supabase = createServiceClient();

    try {
      await requireAdmin(request, supabase);
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

    const body = await request.json();
    const parsed = CreateTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { symbol, name, imageUrl, description } = parsed.data;

    // Check for duplicate symbol
    const { data: existing } = await supabase
      .from("platform_tokens")
      .select("id")
      .eq("symbol", symbol)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Token symbol already exists" },
        { status: 409 }
      );
    }

    const { data: token, error: insertError } = await supabase
      .from("platform_tokens")
      .insert({
        symbol,
        name,
        image_url: imageUrl || null,
        description: description || null,
        is_base_currency: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create token:", insertError);
      return NextResponse.json(
        { error: "Failed to create token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
