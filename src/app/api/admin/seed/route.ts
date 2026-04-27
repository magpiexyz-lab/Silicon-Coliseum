import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { CELEBRITY_AGENTS } from "@/lib/celebrity-agents";
import { getAllPrices, calculateReservesForPrice } from "@/lib/price-feed";

/**
 * POST /api/admin/seed
 * Seeds the database with Silicon tokens, celebrity agents, and creates a default arena.
 * Protected by CRON_SECRET or admin auth.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const cronSecret =
      request.headers.get("x-cron-secret") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    const isCronAuth =
      process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

    if (!isCronAuth) {
      const { getSession } = await import("@/lib/auth");
      const session = await getSession(request);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const supabase = createServiceClient();
      const { data: adminUser } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", session.userId)
        .maybeSingle();
      if (!adminUser?.is_admin) {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }
    }

    const supabase = createServiceClient();
    const log: string[] = [];

    // =========================================================================
    // 1. Ensure vUSD base currency exists
    // =========================================================================
    let baseTokenId: string;
    const { data: existingBase } = await supabase
      .from("platform_tokens")
      .select("id")
      .eq("is_base_currency", true)
      .maybeSingle();

    if (existingBase) {
      baseTokenId = existingBase.id;
      log.push("vUSD base currency already exists");
    } else {
      const { data: newBase } = await supabase
        .from("platform_tokens")
        .insert({
          symbol: "vUSD",
          name: "Virtual USD",
          is_base_currency: true,
          description: "Platform stablecoin pegged to $1",
        })
        .select()
        .single();
      baseTokenId = newBase!.id;
      log.push("Created vUSD base currency");
    }

    // =========================================================================
    // 2. Create Silicon Tokens (if not exist)
    // =========================================================================
    const siliconTokens = [
      { symbol: "sBTC", name: "Silicon Bitcoin", description: "Tracks real BTC price. Digital gold, baby! 🪙", emoji: "₿" },
      { symbol: "sGOLD", name: "Silicon Gold", description: "Tracks real Gold price. Boomer's best friend 🥇", emoji: "🥇" },
      { symbol: "sSILVER", name: "Silicon Silver", description: "Tracks real Silver price. The poor man's gold 🥈", emoji: "🥈" },
      { symbol: "sOIL", name: "Silicon Crude Oil", description: "Tracks real Crude Oil price. Liquid black gold 🛢️", emoji: "🛢️" },
      { symbol: "sWHEAT", name: "Silicon Wheat", description: "Tracks real Wheat price. Bread goes brrr 🌾", emoji: "🌾" },
      { symbol: "sETH", name: "Silicon Ethereum", description: "Tracks real ETH price. The world computer 💎", emoji: "💎" },
    ];

    const tokenIds: Map<string, string> = new Map();

    for (const token of siliconTokens) {
      const { data: existing } = await supabase
        .from("platform_tokens")
        .select("id")
        .eq("symbol", token.symbol)
        .maybeSingle();

      if (existing) {
        tokenIds.set(token.symbol, existing.id);
        log.push(`Token ${token.symbol} already exists`);
      } else {
        const { data: newToken } = await supabase
          .from("platform_tokens")
          .insert({
            symbol: token.symbol,
            name: token.name,
            description: token.description,
            is_base_currency: false,
          })
          .select()
          .single();

        if (newToken) {
          tokenIds.set(token.symbol, newToken.id);
          log.push(`Created token: ${token.symbol}`);
        }
      }
    }

    // =========================================================================
    // 3. Create a "system" admin user for owning celebrity agents
    // =========================================================================
    let systemUserId: string;
    const { data: existingSystem } = await supabase
      .from("users")
      .select("id")
      .eq("email", "system@silicon-coliseum.ai")
      .maybeSingle();

    if (existingSystem) {
      systemUserId = existingSystem.id;
      log.push("System user already exists");
    } else {
      // Use a deterministic UUID for system user
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          auth_id: "00000000-0000-0000-0000-000000000001",
          email: "system@silicon-coliseum.ai",
          username: "SiliconGod",
          is_admin: true,
          cp_balance: 999999,
        })
        .select()
        .single();

      if (userError) {
        console.error("Failed to create system user:", userError);
        return NextResponse.json(
          { error: `Failed to create system user: ${userError.message}` },
          { status: 500 }
        );
      }

      systemUserId = newUser!.id;
      log.push("Created system admin user");
    }

    // =========================================================================
    // 4. Create Celebrity Agents (if not exist)
    // =========================================================================
    const agentIds: Map<string, string> = new Map();

    for (const celeb of CELEBRITY_AGENTS) {
      const { data: existing } = await supabase
        .from("agents")
        .select("id")
        .eq("name", celeb.name)
        .eq("user_id", systemUserId)
        .maybeSingle();

      if (existing) {
        agentIds.set(celeb.name, existing.id);
        log.push(`Agent "${celeb.name}" already exists`);
      } else {
        const { data: newAgent } = await supabase
          .from("agents")
          .insert({
            user_id: systemUserId,
            name: celeb.name,
            risk_level: celeb.riskLevel,
            strategy_description: celeb.strategyDescription,
            total_arenas: 0,
            total_wins: 0,
            best_pnl: 0,
          })
          .select()
          .single();

        if (newAgent) {
          agentIds.set(celeb.name, newAgent.id);
          log.push(`Created agent: "${celeb.name}" (${celeb.riskLevel})`);
        }
      }
    }

    // =========================================================================
    // 5. Create Arena "The Silicon Showdown" (if no active arena exists)
    // =========================================================================
    const { data: activeArenas } = await supabase
      .from("arenas")
      .select("id")
      .in("status", ["active", "upcoming"]);

    let arenaId: string;

    if (activeArenas && activeArenas.length > 0) {
      arenaId = activeArenas[0].id;
      log.push(`Active arena already exists: ${arenaId}`);
    } else {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const { data: newArena } = await supabase
        .from("arenas")
        .insert({
          name: "The Silicon Showdown",
          description:
            "Celebrity AI agents battle it out trading real-world assets! Who will dominate? The value investor or the degen? Place your bets! 🎪🤖",
          status: "active",
          starting_balance: 100000,
          max_agents: 20,
          decay_rate: 0.001,
          competition_start: startTime.toISOString(),
          competition_end: endTime.toISOString(),
          created_by: systemUserId,
        })
        .select()
        .single();

      if (!newArena) {
        return NextResponse.json(
          { error: "Failed to create arena" },
          { status: 500 }
        );
      }

      arenaId = newArena.id;
      log.push(`Created arena: "The Silicon Showdown" (7 days)`);

      // Create pools with real prices
      const prices = await getAllPrices();

      for (const [symbol, tokenId] of tokenIds) {
        const priceData = prices.get(symbol);
        const targetPrice = priceData?.priceUsd || 100;

        // Calculate reserves to match real price with good liquidity
        const { reserveToken, reserveBase } =
          calculateReservesForPrice(targetPrice, 500000);

        await supabase.from("pools").insert({
          arena_id: arenaId,
          token_id: tokenId,
          base_token_id: baseTokenId,
          reserve_token: reserveToken,
          reserve_base: reserveBase,
          fee_rate: 0.003,
          total_volume: 0,
        });

        await supabase.from("arena_tokens").insert({
          arena_id: arenaId,
          token_id: tokenId,
        });

        log.push(
          `Created pool: ${symbol}/vUSD @ $${targetPrice.toFixed(2)}`
        );
      }
    }

    // =========================================================================
    // 6. Enter all celebrity agents into the arena
    // =========================================================================
    for (const [agentName, agentId] of agentIds) {
      const { data: existingEntry } = await supabase
        .from("arena_entries")
        .select("id")
        .eq("arena_id", arenaId)
        .eq("agent_id", agentId)
        .maybeSingle();

      if (!existingEntry) {
        await supabase.from("arena_entries").insert({
          arena_id: arenaId,
          agent_id: agentId,
          cash_balance: 100000,
          status: "active",
        });
        log.push(`Entered "${agentName}" into arena`);
      } else {
        log.push(`"${agentName}" already in arena`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully!",
      log,
      summary: {
        tokens: tokenIds.size,
        agents: agentIds.size,
        arenaId,
      },
    });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json(
      { error: `Seed failed: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
