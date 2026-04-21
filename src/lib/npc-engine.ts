import { createServiceClient } from "./supabase-server";
import { executeSwap } from "./pool-manager";
import { calculatePrice } from "./amm";
import type { NpcConfig, Pool, ArenaBalance } from "./types";

/**
 * NPC Engine — bot market makers that create baseline volume.
 * Strategies: random_walk, mean_reversion, volume_injection.
 * NPCs trade through the same AMM as user agents.
 */

const DEFAULT_NPC_CONFIGS: Record<NpcConfig["strategy"], NpcConfig> = {
  random_walk: {
    strategy: "random_walk",
    tradeFrequency: 0.6,
    maxTradeSize: 0.05,
    volatilityTarget: 0,
  },
  mean_reversion: {
    strategy: "mean_reversion",
    tradeFrequency: 0.4,
    maxTradeSize: 0.08,
    volatilityTarget: 0.02,
  },
  volume_injection: {
    strategy: "volume_injection",
    tradeFrequency: 0.8,
    maxTradeSize: 0.03,
    volatilityTarget: 0,
  },
};

/**
 * Run NPC trading for an arena. Called at the start of each cron tick.
 */
export async function runNpcTrading(arenaId: string): Promise<number> {
  const supabase = createServiceClient();

  // Get NPC entries for this arena
  const { data: npcEntries } = await supabase
    .from("arena_entries")
    .select("*, agents(id, name, strategy_description)")
    .eq("arena_id", arenaId)
    .eq("is_npc", true)
    .eq("status", "active");

  if (!npcEntries || npcEntries.length === 0) return 0;

  // Get pools
  const { data: pools } = await supabase
    .from("pools")
    .select("*")
    .eq("arena_id", arenaId);

  if (!pools || pools.length === 0) return 0;

  let totalTrades = 0;

  for (const entry of npcEntries) {
    const agent = entry.agents as unknown as { id: string; name: string; strategy_description: string | null } | null;
    if (!agent) continue;

    // Determine NPC strategy from agent description
    const strategy = parseNpcStrategy(agent.strategy_description);
    const config = DEFAULT_NPC_CONFIGS[strategy];

    // Random chance to skip this tick
    if (Math.random() > config.tradeFrequency) continue;

    try {
      const tradesExecuted = await executeNpcTrade(
        arenaId,
        agent.id,
        pools as Pool[],
        config
      );
      totalTrades += tradesExecuted;
    } catch (error) {
      console.error(`NPC ${agent.name} trade failed:`, error);
    }
  }

  return totalTrades;
}

function parseNpcStrategy(description: string | null): NpcConfig["strategy"] {
  if (!description) return "random_walk";
  const lower = description.toLowerCase();
  if (lower.includes("mean_reversion") || lower.includes("revert")) return "mean_reversion";
  if (lower.includes("volume") || lower.includes("inject")) return "volume_injection";
  return "random_walk";
}

async function executeNpcTrade(
  arenaId: string,
  agentId: string,
  pools: Pool[],
  config: NpcConfig
): Promise<number> {
  const supabase = createServiceClient();

  // Get agent's balances
  const { data: balances } = await supabase
    .from("arena_balances")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("agent_id", agentId);

  if (!balances || balances.length === 0) return 0;

  // Pick a random pool
  const pool = pools[Math.floor(Math.random() * pools.length)];

  switch (config.strategy) {
    case "random_walk":
      return executeRandomWalk(arenaId, agentId, pool, balances as ArenaBalance[], config);
    case "mean_reversion":
      return executeMeanReversion(arenaId, agentId, pool, balances as ArenaBalance[], config);
    case "volume_injection":
      return executeVolumeInjection(arenaId, agentId, pool, balances as ArenaBalance[], config);
    default:
      return 0;
  }
}

async function executeRandomWalk(
  arenaId: string,
  agentId: string,
  pool: Pool,
  balances: ArenaBalance[],
  config: NpcConfig
): Promise<number> {
  // Randomly buy or sell
  const buyTokenA = Math.random() > 0.5;
  const tokenInId = buyTokenA ? pool.token_b : pool.token_a;

  const balance = balances.find((b) => b.token_id === tokenInId);
  if (!balance || balance.amount <= 0) return 0;

  const tradeSize = balance.amount * config.maxTradeSize * (0.5 + Math.random() * 0.5);
  if (tradeSize <= 0.01) return 0;

  await executeSwap(arenaId, pool.id, agentId, tokenInId, tradeSize, "NPC: random walk");
  return 1;
}

async function executeMeanReversion(
  arenaId: string,
  agentId: string,
  pool: Pool,
  balances: ArenaBalance[],
  config: NpcConfig
): Promise<number> {
  const supabase = createServiceClient();

  // Get recent snapshots to determine mean price
  const { data: snapshots } = await supabase
    .from("pool_snapshots")
    .select("price")
    .eq("pool_id", pool.id)
    .order("created_at", { ascending: false })
    .limit(24);

  if (!snapshots || snapshots.length < 3) {
    // Not enough data, do random walk
    return executeRandomWalk(arenaId, agentId, pool, balances, config);
  }

  const meanPrice =
    snapshots.reduce((s: number, snap: { price: number }) => s + snap.price, 0) / snapshots.length;
  const currentPrice = calculatePrice(pool.reserve_a, pool.reserve_b);
  const deviation = (currentPrice - meanPrice) / meanPrice;

  // If price is above mean, sell token_a (push price down)
  // If price is below mean, buy token_a (push price up)
  let tokenInId: string;
  if (deviation > config.volatilityTarget) {
    tokenInId = pool.token_a; // Sell token_a
  } else if (deviation < -config.volatilityTarget) {
    tokenInId = pool.token_b; // Buy token_a (sell token_b)
  } else {
    return 0; // Within target range
  }

  const balance = balances.find((b) => b.token_id === tokenInId);
  if (!balance || balance.amount <= 0) return 0;

  const intensity = Math.min(1, Math.abs(deviation) / 0.1); // Larger deviation = larger trade
  const tradeSize = balance.amount * config.maxTradeSize * intensity;
  if (tradeSize <= 0.01) return 0;

  await executeSwap(arenaId, pool.id, agentId, tokenInId, tradeSize, `NPC: mean reversion (dev: ${deviation.toFixed(4)})`);
  return 1;
}

async function executeVolumeInjection(
  arenaId: string,
  agentId: string,
  pool: Pool,
  balances: ArenaBalance[],
  config: NpcConfig
): Promise<number> {
  // Small trades in both directions to create volume
  let trades = 0;

  // Buy direction
  const buyBalance = balances.find((b) => b.token_id === pool.token_b);
  if (buyBalance && buyBalance.amount > 0) {
    const size = buyBalance.amount * config.maxTradeSize * (0.3 + Math.random() * 0.4);
    if (size > 0.01) {
      try {
        await executeSwap(arenaId, pool.id, agentId, pool.token_b, size, "NPC: volume inject buy");
        trades++;
      } catch { /* skip */ }
    }
  }

  // Sell direction (after buying)
  const sellBalance = balances.find((b) => b.token_id === pool.token_a);
  if (sellBalance && sellBalance.amount > 0) {
    const size = sellBalance.amount * config.maxTradeSize * (0.3 + Math.random() * 0.4);
    if (size > 0.01) {
      try {
        await executeSwap(arenaId, pool.id, agentId, pool.token_a, size, "NPC: volume inject sell");
        trades++;
      } catch { /* skip */ }
    }
  }

  return trades;
}
