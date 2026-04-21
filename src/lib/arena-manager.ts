import { createServiceClient } from "./supabase-server";
import { calculatePrice } from "./amm";
import type {
  Arena,
  ArenaPhase,
  ArenaEntry,
  ArenaBalance,
  ArenaResult,
  LeaderboardEntry,
} from "./types";

/**
 * Arena Manager — lifecycle management for competitions.
 */

// Prize distribution: 10% platform rake, remaining split among top 10
const PLATFORM_RAKE = 0.10;
const PRIZE_DISTRIBUTION = [0.25, 0.15, 0.12, 0.055, 0.055, 0.055, 0.055, 0.055, 0.055, 0.055];

export async function createArena(params: {
  name: string;
  description?: string;
  entry_fee?: number;
  prize_pool?: number;
  starting_balance?: number;
  max_agents_per_user?: number;
  competition_start?: string;
  competition_end?: string;
  challenge_end?: string;
  decay_rate?: number;
  created_by?: string;
}): Promise<Arena> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("arenas")
    .insert({
      name: params.name,
      description: params.description || null,
      status: "draft",
      phase: "prep",
      entry_fee: params.entry_fee ?? 0,
      prize_pool: params.prize_pool ?? 0,
      starting_balance: params.starting_balance ?? 10000,
      max_agents_per_user: params.max_agents_per_user ?? 1,
      competition_start: params.competition_start || null,
      competition_end: params.competition_end || null,
      challenge_end: params.challenge_end || null,
      decay_rate: params.decay_rate ?? 0.001,
      created_by: params.created_by || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create arena: ${error.message}`);
  return data as Arena;
}

export async function getArena(arenaId: string): Promise<Arena> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("arenas")
    .select("*")
    .eq("id", arenaId)
    .single();

  if (error) throw new Error(`Arena not found: ${error.message}`);
  return data as Arena;
}

export async function listArenas(status?: string): Promise<Arena[]> {
  const supabase = createServiceClient();

  let query = supabase.from("arenas").select("*").order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list arenas: ${error.message}`);
  return (data || []) as Arena[];
}

/**
 * Transition arena to a new phase.
 */
export async function transitionPhase(
  arenaId: string,
  newPhase: ArenaPhase
): Promise<Arena> {
  const supabase = createServiceClient();

  const arena = await getArena(arenaId);

  // Validate transitions
  const validTransitions: Record<ArenaPhase, ArenaPhase[]> = {
    prep: ["competition"],
    competition: ["challenge"],
    challenge: ["rewards"],
    rewards: ["closed"],
    closed: [],
  };

  if (!validTransitions[arena.phase].includes(newPhase)) {
    throw new Error(`Invalid transition: ${arena.phase} -> ${newPhase}`);
  }

  const updates: Record<string, unknown> = {
    phase: newPhase,
    updated_at: new Date().toISOString(),
  };

  // Set status based on phase
  if (newPhase === "competition") {
    updates.status = "active";
    // Activate all registered entries
    await supabase
      .from("arena_entries")
      .update({ status: "active" })
      .eq("arena_id", arenaId)
      .eq("status", "registered");
  } else if (newPhase === "closed") {
    updates.status = "completed";
    // Finalize all entries
    await supabase
      .from("arena_entries")
      .update({ status: "finished" })
      .eq("arena_id", arenaId)
      .eq("status", "active");
  }

  const { data, error } = await supabase
    .from("arenas")
    .update(updates)
    .eq("id", arenaId)
    .select()
    .single();

  if (error) throw new Error(`Failed to transition phase: ${error.message}`);
  return data as Arena;
}

/**
 * Register an agent for an arena.
 */
export async function joinArena(
  arenaId: string,
  agentId: string,
  userId: string,
  isNpc: boolean = false
): Promise<ArenaEntry> {
  const supabase = createServiceClient();

  const arena = await getArena(arenaId);

  if (arena.phase !== "prep") {
    throw new Error("Can only join arenas in prep phase");
  }

  // Check max agents per user (skip for NPCs)
  if (!isNpc) {
    const { count } = await supabase
      .from("arena_entries")
      .select("*", { count: "exact", head: true })
      .eq("arena_id", arenaId)
      .eq("user_id", userId)
      .eq("is_npc", false);

    if ((count || 0) >= arena.max_agents_per_user) {
      throw new Error(`Maximum ${arena.max_agents_per_user} agent(s) per user`);
    }
  }

  // Create entry
  const { data: entry, error: entryError } = await supabase
    .from("arena_entries")
    .insert({
      arena_id: arenaId,
      agent_id: agentId,
      user_id: userId,
      is_npc: isNpc,
      status: "registered",
    })
    .select()
    .single();

  if (entryError) throw new Error(`Failed to join arena: ${entryError.message}`);

  // Initialize starting balance (as a "USDC" or base token)
  // Find the arena's base token (first token added to the arena)
  const { data: arenaTokens } = await supabase
    .from("arena_tokens")
    .select("token_id")
    .eq("arena_id", arenaId)
    .limit(1);

  if (arenaTokens && arenaTokens.length > 0) {
    await supabase.from("arena_balances").insert({
      arena_id: arenaId,
      agent_id: agentId,
      token_id: arenaTokens[0].token_id,
      amount: arena.starting_balance,
    });
  }

  return entry as ArenaEntry;
}

/**
 * Calculate total portfolio value for an agent in an arena.
 * Values all holdings at current pool prices.
 */
export async function calculateAgentValue(
  arenaId: string,
  agentId: string
): Promise<{ totalValue: number; balances: ArenaBalance[] }> {
  const supabase = createServiceClient();

  // Get agent's balances
  const { data: balances, error: balError } = await supabase
    .from("arena_balances")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("agent_id", agentId);

  if (balError) throw new Error(`Failed to fetch balances: ${balError.message}`);

  // Get all pools for this arena
  const { data: pools } = await supabase
    .from("pools")
    .select("*")
    .eq("arena_id", arenaId);

  // Get the base token (first token — typically USDC-like)
  const { data: arenaTokens } = await supabase
    .from("arena_tokens")
    .select("token_id")
    .eq("arena_id", arenaId)
    .limit(1);

  const baseTokenId = arenaTokens?.[0]?.token_id;

  let totalValue = 0;

  for (const bal of (balances || []) as ArenaBalance[]) {
    if (bal.amount <= 0) continue;

    if (bal.token_id === baseTokenId) {
      // Base token counts as face value
      totalValue += bal.amount;
    } else if (pools) {
      // Find pool to price this token against base
      const pool = pools.find(
        (p: Record<string, unknown>) =>
          (p.token_a === bal.token_id && p.token_b === baseTokenId) ||
          (p.token_b === bal.token_id && p.token_a === baseTokenId)
      );

      if (pool) {
        // Calculate price in terms of base token
        const isTokenA = pool.token_a === bal.token_id;
        const price = isTokenA
          ? calculatePrice(pool.reserve_a as number, pool.reserve_b as number)
          : calculatePrice(pool.reserve_b as number, pool.reserve_a as number);
        totalValue += bal.amount * price;
      }
    }
  }

  return { totalValue, balances: (balances || []) as ArenaBalance[] };
}

/**
 * Get arena leaderboard — ranks agents by portfolio value / P&L%.
 */
export async function getArenaLeaderboard(arenaId: string): Promise<LeaderboardEntry[]> {
  const supabase = createServiceClient();

  const arena = await getArena(arenaId);

  // Get all entries
  const { data: entries } = await supabase
    .from("arena_entries")
    .select("*, agents(name, risk_level, is_npc), users(username)")
    .eq("arena_id", arenaId);

  if (!entries || entries.length === 0) return [];

  // Get trade counts
  const { data: tradeCounts } = await supabase
    .from("arena_trades")
    .select("agent_id")
    .eq("arena_id", arenaId);

  const tradeCountMap = new Map<string, number>();
  if (tradeCounts) {
    for (const t of tradeCounts) {
      tradeCountMap.set(t.agent_id, (tradeCountMap.get(t.agent_id) || 0) + 1);
    }
  }

  const leaderboard: LeaderboardEntry[] = [];

  for (const entry of entries) {
    const { totalValue } = await calculateAgentValue(arenaId, entry.agent_id);
    const pnlPercent =
      arena.starting_balance > 0
        ? ((totalValue - arena.starting_balance) / arena.starting_balance) * 100
        : 0;

    const agent = entry.agents as unknown as { name: string; risk_level: string; is_npc: boolean } | null;
    const user = entry.users as unknown as { username: string } | null;

    leaderboard.push({
      rank: 0,
      agentId: entry.agent_id,
      agentName: agent?.name || "Unknown",
      ownerUsername: user?.username || "Unknown",
      riskLevel: (agent?.risk_level || "balanced") as LeaderboardEntry["riskLevel"],
      initialBudget: arena.starting_balance,
      totalValue,
      pnlPercent,
      tradeCount: tradeCountMap.get(entry.agent_id) || 0,
      isNpc: entry.is_npc,
    });
  }

  // Sort by P&L% descending
  leaderboard.sort((a, b) => b.pnlPercent - a.pnlPercent);
  leaderboard.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return leaderboard;
}

/**
 * Distribute rewards for a completed arena.
 */
export async function distributeRewards(arenaId: string): Promise<ArenaResult[]> {
  const supabase = createServiceClient();

  const arena = await getArena(arenaId);
  if (arena.phase !== "rewards") {
    throw new Error("Arena must be in rewards phase to distribute");
  }

  const leaderboard = await getArenaLeaderboard(arenaId);

  const distributablePool = arena.prize_pool * (1 - PLATFORM_RAKE);
  const results: ArenaResult[] = [];

  for (const entry of leaderboard) {
    const distIndex = entry.rank - 1;
    const rewardPercent = distIndex < PRIZE_DISTRIBUTION.length ? PRIZE_DISTRIBUTION[distIndex] : 0;
    const rewardAmount = distributablePool * rewardPercent;

    const { data, error } = await supabase
      .from("arena_results")
      .insert({
        arena_id: arenaId,
        agent_id: entry.agentId,
        user_id: "", // Will be filled from entry
        final_rank: entry.rank,
        final_value: entry.totalValue,
        pnl_percent: entry.pnlPercent,
        reward_amount: rewardAmount,
        trade_count: entry.tradeCount,
      })
      .select()
      .single();

    if (!error && data) {
      results.push(data as ArenaResult);
    }
  }

  // Update user profiles
  for (const entry of leaderboard) {
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", entry.ownerUsername) // We need user_id, not username
      .maybeSingle();

    // Skip NPC profile updates
    if (entry.isNpc) continue;

    // Get user_id from arena entry
    const { data: arenaEntry } = await supabase
      .from("arena_entries")
      .select("user_id")
      .eq("arena_id", arenaId)
      .eq("agent_id", entry.agentId)
      .single();

    if (!arenaEntry) continue;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", arenaEntry.user_id)
      .maybeSingle();

    if (profile) {
      await supabase
        .from("user_profiles")
        .update({
          total_arenas: profile.total_arenas + 1,
          wins: entry.rank === 1 ? profile.wins + 1 : profile.wins,
          top3_finishes: entry.rank <= 3 ? profile.top3_finishes + 1 : profile.top3_finishes,
          best_pnl: Math.max(profile.best_pnl, entry.pnlPercent),
          total_trades: profile.total_trades + entry.tradeCount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", arenaEntry.user_id);
    } else {
      await supabase.from("user_profiles").insert({
        user_id: arenaEntry.user_id,
        total_arenas: 1,
        wins: entry.rank === 1 ? 1 : 0,
        top3_finishes: entry.rank <= 3 ? 1 : 0,
        best_pnl: entry.pnlPercent,
        total_trades: entry.tradeCount,
      });
    }
  }

  return results;
}

/**
 * Check and auto-transition arena phases based on time.
 */
export async function checkPhaseTransitions(): Promise<void> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Prep -> Competition: when competition_start has passed
  const { data: prepArenas } = await supabase
    .from("arenas")
    .select("id")
    .eq("status", "active")
    .eq("phase", "prep")
    .lte("competition_start", now);

  for (const arena of prepArenas || []) {
    await transitionPhase(arena.id, "competition");
  }

  // Competition -> Challenge: when competition_end has passed
  const { data: compArenas } = await supabase
    .from("arenas")
    .select("id")
    .eq("status", "active")
    .eq("phase", "competition")
    .lte("competition_end", now);

  for (const arena of compArenas || []) {
    await transitionPhase(arena.id, "challenge");
  }

  // Challenge -> Rewards: when challenge_end has passed
  const { data: challengeArenas } = await supabase
    .from("arenas")
    .select("id")
    .eq("status", "active")
    .eq("phase", "challenge")
    .lte("challenge_end", now);

  for (const arena of challengeArenas || []) {
    await transitionPhase(arena.id, "rewards");
    await distributeRewards(arena.id);
    await transitionPhase(arena.id, "closed");
  }
}
