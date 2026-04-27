import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAllPrices, calculateReservesForPrice } from "@/lib/price-feed";

/**
 * POST /api/admin/new-arena
 * Creates a new active arena with real prices and enters all celebrity agents.
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

    // Parse optional body
    let arenaName = "The Silicon Showdown";
    let durationDays = 7;
    try {
      const body = await request.json();
      if (body.name) arenaName = body.name;
      if (body.durationDays) durationDays = body.durationDays;
    } catch {
      // no body, use defaults
    }

    // Get vUSD base currency
    const { data: baseToken } = await supabase
      .from("platform_tokens")
      .select("id")
      .eq("is_base_currency", true)
      .maybeSingle();

    if (!baseToken) {
      return NextResponse.json(
        { error: "vUSD base currency not found. Run /api/admin/seed first." },
        { status: 400 }
      );
    }
    const baseTokenId = baseToken.id;

    // Get all Silicon tokens
    const { data: tokens } = await supabase
      .from("platform_tokens")
      .select("id, symbol")
      .eq("is_base_currency", false);

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: "No Silicon tokens found. Run /api/admin/seed first." },
        { status: 400 }
      );
    }

    // Get system user
    const { data: systemUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", "system@silicon-coliseum.ai")
      .maybeSingle();

    if (!systemUser) {
      return NextResponse.json(
        { error: "System user not found. Run /api/admin/seed first." },
        { status: 400 }
      );
    }

    // Create new arena
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const { data: newArena, error: arenaError } = await supabase
      .from("arenas")
      .insert({
        name: arenaName,
        description: `Celebrity AI agents battle it out trading real-world assets! ${durationDays} days of pure chaos.`,
        status: "active",
        starting_balance: 100000,
        max_agents: 20,
        decay_rate: 0.001,
        competition_start: startTime.toISOString(),
        competition_end: endTime.toISOString(),
        created_by: systemUser.id,
      })
      .select()
      .single();

    if (arenaError || !newArena) {
      console.error("Failed to create arena:", arenaError);
      return NextResponse.json(
        { error: `Failed to create arena: ${arenaError?.message}` },
        { status: 500 }
      );
    }

    log.push(`Created arena: "${arenaName}" (${durationDays} days)`);

    // Create pools with real prices
    const prices = await getAllPrices();

    for (const token of tokens) {
      const priceData = prices.get(token.symbol);
      const targetPrice = priceData?.priceUsd || 100;

      const { reserveToken, reserveBase } = calculateReservesForPrice(targetPrice, 500000);

      await supabase.from("pools").insert({
        arena_id: newArena.id,
        token_id: token.id,
        base_token_id: baseTokenId,
        reserve_token: reserveToken,
        reserve_base: reserveBase,
        fee_rate: 0.003,
        total_volume: 0,
      });

      await supabase.from("arena_tokens").insert({
        arena_id: newArena.id,
        token_id: token.id,
      });

      log.push(`Created pool: ${token.symbol}/vUSD @ $${targetPrice.toFixed(2)}`);
    }

    // Get all celebrity agents (owned by system user)
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name")
      .eq("user_id", systemUser.id);

    if (agents && agents.length > 0) {
      for (const agent of agents) {
        await supabase.from("arena_entries").insert({
          arena_id: newArena.id,
          agent_id: agent.id,
          cash_balance: 100000,
          status: "active",
        });
        log.push(`Entered "${agent.name}" into arena`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `New arena "${arenaName}" created!`,
      arenaId: newArena.id,
      log,
    });
  } catch (error) {
    console.error("New arena failed:", error);
    return NextResponse.json(
      { error: `Failed: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
