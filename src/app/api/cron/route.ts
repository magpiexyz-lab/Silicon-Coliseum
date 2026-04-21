import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { evaluateArenaAgent } from "@/lib/agent-engine";
import { executeArenaTrades } from "@/lib/trade-executor";
import { getPoolsByArena, recordSnapshot, applyPerturbation } from "@/lib/pool-manager";
import { analyzeArenaPools } from "@/lib/pool-analyzer";
import { runNpcTrading } from "@/lib/npc-engine";
import { applyDecayToBalances } from "@/lib/decay";
import { checkPhaseTransitions } from "@/lib/arena-manager";
import type { Agent, ArenaBalance, ArenaTrade, Pool } from "@/lib/types";

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b.padEnd(a.length, "\0").slice(0, a.length));
    require("crypto").timingSafeEqual(bufA, bufB);
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return require("crypto").timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  try {
    // Validate CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "") || "";

    if (!providedSecret || !timingSafeCompare(providedSecret, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Check and execute phase transitions
    await checkPhaseTransitions();

    // Get all active arenas in competition phase
    const { data: activeArenas } = await supabase
      .from("arenas")
      .select("*")
      .eq("status", "active")
      .eq("phase", "competition");

    if (!activeArenas || activeArenas.length === 0) {
      return NextResponse.json({
        message: "No active arenas in competition phase",
        results: [],
      });
    }

    const allResults = [];

    for (const arena of activeArenas) {
      try {
        // 1. NPC market makers trade first
        const npcTrades = await runNpcTrading(arena.id);

        // 2. Get pools for this arena
        const pools = await getPoolsByArena(arena.id);
        if (pools.length === 0) continue;

        // 3. Apply random perturbations to pools
        for (const pool of pools) {
          await applyPerturbation(pool.id, arena.decay_rate > 0 ? 0.02 : 0.01);
        }

        // 4. Apply holding decay
        await applyArenaDecay(arena.id, arena.decay_rate);

        // 5. Analyze pools for AI context
        const poolAnalyses = await analyzeArenaPools(arena.id);

        // 6. Build token symbol map
        const tokenSymbolMap = await buildTokenSymbolMap(arena.id);
        const symbolToIdMap = new Map<string, string>();
        for (const [id, symbol] of tokenSymbolMap) {
          symbolToIdMap.set(symbol, id);
        }

        // 7. Evaluate each user agent
        const { data: userEntries } = await supabase
          .from("arena_entries")
          .select("*, agents(*)")
          .eq("arena_id", arena.id)
          .eq("is_npc", false)
          .eq("status", "active");

        let agentTradesTotal = 0;

        for (const entry of userEntries || []) {
          const agent = entry.agents as unknown as Agent;
          if (!agent) continue;

          try {
            // Get agent balances
            const { data: balances } = await supabase
              .from("arena_balances")
              .select("*")
              .eq("arena_id", arena.id)
              .eq("agent_id", agent.id);

            // Get recent trades
            const { data: recentTrades } = await supabase
              .from("arena_trades")
              .select("*")
              .eq("arena_id", arena.id)
              .eq("agent_id", agent.id)
              .order("created_at", { ascending: false })
              .limit(20);

            // Run AI evaluation
            const decision = await evaluateArenaAgent(
              agent,
              (balances || []) as ArenaBalance[],
              pools,
              poolAnalyses,
              (recentTrades || []) as ArenaTrade[],
              tokenSymbolMap
            );

            // Store decision
            await supabase.from("decisions").insert({
              agent_id: agent.id,
              should_trade: decision.should_trade,
              reasoning: decision.reasoning,
              market_analysis: decision.market_analysis,
              raw_json: decision,
            });

            // Execute trades
            if (decision.should_trade && decision.actions.length > 0) {
              const trades = await executeArenaTrades(
                arena.id,
                agent.id,
                decision.actions,
                pools,
                symbolToIdMap
              );
              agentTradesTotal += trades.length;
            }
          } catch (agentError) {
            console.error(
              `Failed to evaluate agent ${agent.id}:`,
              agentError
            );
          }
        }

        // 8. Record pool snapshots
        for (const pool of pools) {
          await recordSnapshot(pool.id);
        }

        allResults.push({
          arenaId: arena.id,
          arenaName: arena.name,
          npcTrades,
          agentTrades: agentTradesTotal,
          poolsProcessed: pools.length,
        });
      } catch (arenaError) {
        console.error(`Failed to process arena ${arena.id}:`, arenaError);
        allResults.push({
          arenaId: arena.id,
          arenaName: arena.name,
          error: "Processing failed",
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${activeArenas.length} arenas`,
      results: allResults,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}

async function applyArenaDecay(arenaId: string, decayRate: number): Promise<void> {
  if (decayRate <= 0) return;

  const supabase = createServiceClient();

  // Get all balances for this arena
  const { data: balances } = await supabase
    .from("arena_balances")
    .select("*")
    .eq("arena_id", arenaId);

  if (!balances || balances.length === 0) return;

  // Get last trade time per agent
  const { data: lastTrades } = await supabase
    .from("arena_trades")
    .select("agent_id, created_at")
    .eq("arena_id", arenaId)
    .order("created_at", { ascending: false });

  const lastTradeMap = new Map<string, Date>();
  if (lastTrades) {
    for (const t of lastTrades) {
      if (!lastTradeMap.has(t.agent_id)) {
        lastTradeMap.set(t.agent_id, new Date(t.created_at));
      }
    }
  }

  const balancesWithActivity = balances.map((b: ArenaBalance) => ({
    agent_id: b.agent_id,
    token_id: b.token_id,
    amount: b.amount,
    lastTradeAt: lastTradeMap.get(b.agent_id) || null,
  }));

  const decayed = applyDecayToBalances(balancesWithActivity, decayRate);

  for (const d of decayed) {
    if (d.decayLoss > 0) {
      await supabase
        .from("arena_balances")
        .update({ amount: d.newAmount, updated_at: new Date().toISOString() })
        .eq("arena_id", arenaId)
        .eq("agent_id", d.agent_id)
        .eq("token_id", d.token_id);
    }
  }
}

async function buildTokenSymbolMap(arenaId: string): Promise<Map<string, string>> {
  const supabase = createServiceClient();

  const { data: arenaTokens } = await supabase
    .from("arena_tokens")
    .select("token_id, platform_tokens(id, symbol)")
    .eq("arena_id", arenaId);

  const map = new Map<string, string>();
  if (arenaTokens) {
    for (const at of arenaTokens) {
      const token = at.platform_tokens as unknown as { id: string; symbol: string } | null;
      if (token) {
        map.set(token.id, token.symbol);
      }
    }
  }

  return map;
}
