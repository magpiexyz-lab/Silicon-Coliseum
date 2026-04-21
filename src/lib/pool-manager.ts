import { createServiceClient } from "./supabase-server";
import { calculateSwapOutput, calculatePrice } from "./amm";
import type { Pool, ArenaTrade, PoolSnapshot, SwapResult } from "./types";

/**
 * Pool Manager — DB layer wrapping AMM math.
 */

export async function createPool(
  arenaId: string,
  tokenA: string,
  tokenB: string,
  reserveA: number,
  reserveB: number,
  feeRate: number = 0.003
): Promise<Pool> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pools")
    .insert({
      arena_id: arenaId,
      token_a: tokenA,
      token_b: tokenB,
      reserve_a: reserveA,
      reserve_b: reserveB,
      fee_rate: feeRate,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create pool: ${error.message}`);
  return data as Pool;
}

export async function getPoolsByArena(arenaId: string): Promise<Pool[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pools")
    .select(`
      *,
      token_a_ref:platform_tokens!pools_token_a_fkey(symbol, name),
      token_b_ref:platform_tokens!pools_token_b_fkey(symbol, name)
    `)
    .eq("arena_id", arenaId);

  if (error) throw new Error(`Failed to fetch pools: ${error.message}`);

  return (data || []).map((p: Record<string, unknown>) => ({
    ...p,
    token_a_symbol: (p.token_a_ref as { symbol: string } | null)?.symbol,
    token_b_symbol: (p.token_b_ref as { symbol: string } | null)?.symbol,
    token_a_name: (p.token_a_ref as { name: string } | null)?.name,
    token_b_name: (p.token_b_ref as { name: string } | null)?.name,
  })) as Pool[];
}

export async function getPoolById(poolId: string): Promise<Pool> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pools")
    .select(`
      *,
      token_a_ref:platform_tokens!pools_token_a_fkey(symbol, name),
      token_b_ref:platform_tokens!pools_token_b_fkey(symbol, name)
    `)
    .eq("id", poolId)
    .single();

  if (error) throw new Error(`Failed to fetch pool: ${error.message}`);

  const p = data as Record<string, unknown>;
  return {
    ...p,
    token_a_symbol: (p.token_a_ref as { symbol: string } | null)?.symbol,
    token_b_symbol: (p.token_b_ref as { symbol: string } | null)?.symbol,
    token_a_name: (p.token_a_ref as { name: string } | null)?.name,
    token_b_name: (p.token_b_ref as { name: string } | null)?.name,
  } as Pool;
}

/**
 * Execute a swap: wraps AMM math + updates reserves + records trade + updates balances.
 */
export async function executeSwap(
  arenaId: string,
  poolId: string,
  agentId: string,
  tokenInId: string,
  amountIn: number,
  reasoning?: string
): Promise<{ trade: ArenaTrade; swapResult: SwapResult }> {
  const supabase = createServiceClient();

  // Fetch pool
  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (poolError || !pool) throw new Error(`Pool not found: ${poolError?.message}`);

  // Determine direction
  const isAtoB = pool.token_a === tokenInId;
  const isBtoA = pool.token_b === tokenInId;
  if (!isAtoB && !isBtoA) throw new Error("Token not in this pool");

  const reserveIn = isAtoB ? pool.reserve_a : pool.reserve_b;
  const reserveOut = isAtoB ? pool.reserve_b : pool.reserve_a;
  const tokenOutId = isAtoB ? pool.token_b : pool.token_a;

  // Check agent has enough balance
  const { data: balance } = await supabase
    .from("arena_balances")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("agent_id", agentId)
    .eq("token_id", tokenInId)
    .maybeSingle();

  if (!balance || balance.amount < amountIn) {
    throw new Error(`Insufficient balance: have ${balance?.amount ?? 0}, need ${amountIn}`);
  }

  // Calculate swap
  const swapResult = calculateSwapOutput(amountIn, reserveIn, reserveOut, pool.fee_rate);

  // Calculate execution price (price of token_out in terms of token_in)
  const executionPrice = amountIn / swapResult.amountOut;

  // Update pool reserves
  const newReserveA = isAtoB
    ? pool.reserve_a + amountIn
    : pool.reserve_a - swapResult.amountOut;
  const newReserveB = isAtoB
    ? pool.reserve_b - swapResult.amountOut
    : pool.reserve_b + amountIn;

  const { error: poolUpdateError } = await supabase
    .from("pools")
    .update({
      reserve_a: newReserveA,
      reserve_b: newReserveB,
      total_volume: pool.total_volume + amountIn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", poolId);

  if (poolUpdateError) throw new Error(`Failed to update pool: ${poolUpdateError.message}`);

  // Update agent balances: deduct token_in
  const { error: deductError } = await supabase
    .from("arena_balances")
    .update({
      amount: balance.amount - amountIn,
      updated_at: new Date().toISOString(),
    })
    .eq("arena_id", arenaId)
    .eq("agent_id", agentId)
    .eq("token_id", tokenInId);

  if (deductError) throw new Error(`Failed to deduct balance: ${deductError.message}`);

  // Update agent balances: add token_out (upsert)
  const { data: outBalance } = await supabase
    .from("arena_balances")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("agent_id", agentId)
    .eq("token_id", tokenOutId)
    .maybeSingle();

  if (outBalance) {
    const { error: addError } = await supabase
      .from("arena_balances")
      .update({
        amount: outBalance.amount + swapResult.amountOut,
        updated_at: new Date().toISOString(),
      })
      .eq("id", outBalance.id);

    if (addError) throw new Error(`Failed to add balance: ${addError.message}`);
  } else {
    const { error: insertError } = await supabase
      .from("arena_balances")
      .insert({
        arena_id: arenaId,
        agent_id: agentId,
        token_id: tokenOutId,
        amount: swapResult.amountOut,
      });

    if (insertError) throw new Error(`Failed to insert balance: ${insertError.message}`);
  }

  // Record trade
  const { data: trade, error: tradeError } = await supabase
    .from("arena_trades")
    .insert({
      arena_id: arenaId,
      pool_id: poolId,
      agent_id: agentId,
      token_in: tokenInId,
      token_out: tokenOutId,
      amount_in: amountIn,
      amount_out: swapResult.amountOut,
      price: executionPrice,
      fee: swapResult.fee,
      reasoning: reasoning || null,
    })
    .select()
    .single();

  if (tradeError) throw new Error(`Failed to record trade: ${tradeError.message}`);

  return { trade: trade as ArenaTrade, swapResult };
}

/**
 * Record a pool snapshot for price history charts.
 */
export async function recordSnapshot(poolId: string): Promise<PoolSnapshot> {
  const supabase = createServiceClient();

  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (poolError || !pool) throw new Error(`Pool not found: ${poolError?.message}`);

  const price = calculatePrice(pool.reserve_a, pool.reserve_b);

  // Calculate volume since last snapshot
  const { data: lastSnapshot } = await supabase
    .from("pool_snapshots")
    .select("volume, created_at")
    .eq("pool_id", poolId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const volumeSinceLastSnapshot = lastSnapshot
    ? pool.total_volume - (lastSnapshot.volume || 0)
    : pool.total_volume;

  const { data, error } = await supabase
    .from("pool_snapshots")
    .insert({
      pool_id: poolId,
      price,
      reserve_a: pool.reserve_a,
      reserve_b: pool.reserve_b,
      volume: pool.total_volume,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to record snapshot: ${error.message}`);
  return data as PoolSnapshot;
}

/**
 * Apply random perturbation to pool reserves.
 * Simulates external market forces to prevent stalemate.
 */
export async function applyPerturbation(
  poolId: string,
  maxPerturbPercent: number = 0.02
): Promise<void> {
  const supabase = createServiceClient();

  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (poolError || !pool) throw new Error(`Pool not found: ${poolError?.message}`);

  // Random perturbation between -maxPercent and +maxPercent
  const perturbA = 1 + (Math.random() * 2 - 1) * maxPerturbPercent;
  const perturbB = 1 + (Math.random() * 2 - 1) * maxPerturbPercent;

  const { error } = await supabase
    .from("pools")
    .update({
      reserve_a: pool.reserve_a * perturbA,
      reserve_b: pool.reserve_b * perturbB,
      updated_at: new Date().toISOString(),
    })
    .eq("id", poolId);

  if (error) throw new Error(`Failed to apply perturbation: ${error.message}`);
}

/**
 * Get pool price history (snapshots).
 */
export async function getPoolHistory(
  poolId: string,
  limit: number = 100
): Promise<PoolSnapshot[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pool_snapshots")
    .select("*")
    .eq("pool_id", poolId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch pool history: ${error.message}`);
  return (data || []) as PoolSnapshot[];
}
