import { SupabaseClient } from "@supabase/supabase-js";
import { calculateSwapOutput, calculatePrice } from "./amm";
import type { ArenaTrade, Pool } from "./types";

/**
 * Trade Executor -- executes trades on AMM pools.
 * Handles balance validation, pool reserve updates, and trade recording.
 */

/**
 * Execute a BUY: agent spends vUSD to buy TOKEN.
 *
 * Flow:
 * 1. Validate agent has enough cash (vUSD)
 * 2. Calculate swap via AMM (vUSD -> TOKEN)
 * 3. Update pool reserves
 * 4. Deduct agent cash_balance
 * 5. Update arena_balances (add TOKEN)
 * 6. Insert arena_trades record
 */
export async function executeBuy(
  supabase: SupabaseClient,
  arenaId: string,
  agentId: string,
  poolId: string,
  amountVusd: number
): Promise<ArenaTrade> {
  if (amountVusd <= 0) throw new Error("Amount must be positive");

  // Fetch pool
  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (poolError || !pool) throw new Error("Pool not found");

  // Fetch agent
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("cash_balance")
    .eq("id", agentId)
    .eq("arena_id", arenaId)
    .single();

  if (agentError || !agent) throw new Error("Agent not found");
  if (agent.cash_balance < amountVusd)
    throw new Error(
      `Insufficient cash: have ${agent.cash_balance}, need ${amountVusd}`
    );

  // Calculate swap: vUSD (base) -> TOKEN
  const reserveIn = pool.reserve_base; // vUSD
  const reserveOut = pool.reserve_token; // TOKEN
  const { amountOut, fee } = calculateSwapOutput(
    amountVusd,
    reserveIn,
    reserveOut,
    pool.fee_rate
  );

  const executionPrice = amountVusd / amountOut;

  // Update pool reserves
  const newReserveBase = pool.reserve_base + amountVusd;
  const newReserveToken = pool.reserve_token - amountOut;

  await supabase
    .from("pools")
    .update({
      reserve_base: newReserveBase,
      reserve_token: newReserveToken,
      total_volume: pool.total_volume + amountVusd,
    })
    .eq("id", poolId);

  // Deduct agent cash
  await supabase
    .from("agents")
    .update({ cash_balance: agent.cash_balance - amountVusd })
    .eq("id", agentId);

  // Update arena_balances: add TOKEN
  const { data: existingBalance } = await supabase
    .from("arena_balances")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("agent_id", agentId)
    .eq("token_id", pool.token_id)
    .maybeSingle();

  if (existingBalance) {
    await supabase
      .from("arena_balances")
      .update({ amount: existingBalance.amount + amountOut })
      .eq("id", existingBalance.id);
  } else {
    await supabase.from("arena_balances").insert({
      arena_id: arenaId,
      agent_id: agentId,
      token_id: pool.token_id,
      amount: amountOut,
    });
  }

  // Record trade
  const { data: trade, error: tradeError } = await supabase
    .from("arena_trades")
    .insert({
      arena_id: arenaId,
      pool_id: poolId,
      agent_id: agentId,
      action: "BUY",
      token_id: pool.token_id,
      amount_in: amountVusd,
      amount_out: amountOut,
      price: executionPrice,
      fee,
      reasoning: null,
    })
    .select()
    .single();

  if (tradeError)
    throw new Error(`Failed to record trade: ${tradeError.message}`);

  return mapTradeRow(trade);
}

/**
 * Execute a SELL: agent sells TOKEN for vUSD.
 *
 * Flow:
 * 1. Validate agent has enough TOKEN
 * 2. Calculate swap via AMM (TOKEN -> vUSD)
 * 3. Update pool reserves
 * 4. Deduct TOKEN from arena_balances
 * 5. Add vUSD to agent cash_balance
 * 6. Insert arena_trades record
 */
export async function executeSell(
  supabase: SupabaseClient,
  arenaId: string,
  agentId: string,
  poolId: string,
  tokenAmount: number
): Promise<ArenaTrade> {
  if (tokenAmount <= 0) throw new Error("Amount must be positive");

  // Fetch pool
  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (poolError || !pool) throw new Error("Pool not found");

  // Fetch agent token balance
  const { data: balance, error: balError } = await supabase
    .from("arena_balances")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("agent_id", agentId)
    .eq("token_id", pool.token_id)
    .maybeSingle();

  if (balError || !balance || balance.amount < tokenAmount)
    throw new Error(
      `Insufficient token balance: have ${balance?.amount ?? 0}, need ${tokenAmount}`
    );

  // Calculate swap: TOKEN -> vUSD (base)
  const reserveIn = pool.reserve_token; // TOKEN
  const reserveOut = pool.reserve_base; // vUSD
  const { amountOut, fee } = calculateSwapOutput(
    tokenAmount,
    reserveIn,
    reserveOut,
    pool.fee_rate
  );

  const executionPrice = amountOut / tokenAmount;

  // Update pool reserves
  const newReserveToken = pool.reserve_token + tokenAmount;
  const newReserveBase = pool.reserve_base - amountOut;

  await supabase
    .from("pools")
    .update({
      reserve_token: newReserveToken,
      reserve_base: newReserveBase,
      total_volume: pool.total_volume + amountOut,
    })
    .eq("id", poolId);

  // Deduct TOKEN from arena_balances
  await supabase
    .from("arena_balances")
    .update({ amount: balance.amount - tokenAmount })
    .eq("id", balance.id);

  // Add vUSD to agent cash
  const { data: agent } = await supabase
    .from("agents")
    .select("cash_balance")
    .eq("id", agentId)
    .single();

  if (agent) {
    await supabase
      .from("agents")
      .update({ cash_balance: agent.cash_balance + amountOut })
      .eq("id", agentId);
  }

  // Record trade
  const { data: trade, error: tradeError } = await supabase
    .from("arena_trades")
    .insert({
      arena_id: arenaId,
      pool_id: poolId,
      agent_id: agentId,
      action: "SELL",
      token_id: pool.token_id,
      amount_in: tokenAmount,
      amount_out: amountOut,
      price: executionPrice,
      fee,
      reasoning: null,
    })
    .select()
    .single();

  if (tradeError)
    throw new Error(`Failed to record trade: ${tradeError.message}`);

  return mapTradeRow(trade);
}

// ============================================================================
// Helpers
// ============================================================================

function mapTradeRow(row: Record<string, unknown>): ArenaTrade {
  return {
    id: row.id as string,
    arenaId: row.arena_id as string,
    poolId: row.pool_id as string,
    agentId: row.agent_id as string,
    action: row.action as ArenaTrade["action"],
    tokenId: row.token_id as string,
    amountIn: (row.amount_in as number) || 0,
    amountOut: (row.amount_out as number) || 0,
    price: (row.price as number) || 0,
    fee: (row.fee as number) || 0,
    reasoning: (row.reasoning as string) || null,
    createdAt: row.created_at as string,
  };
}

// ============================================================================
// Legacy exports (backward compatibility)
// ============================================================================
import { executeSwap } from "./pool-manager";
import type { ArenaTradeAction, ArenaTrade as LegacyArenaTrade, Pool as LegacyPool } from "./types";

/** @deprecated Use executeBuy/executeSell instead */
export async function executeArenaTrades(
  arenaId: string,
  agentId: string,
  actions: ArenaTradeAction[],
  pools: Array<Record<string, unknown>>,
  symbolToIdMap: Map<string, string>
): Promise<LegacyArenaTrade[]> {
  const executedTrades: LegacyArenaTrade[] = [];

  for (const action of actions) {
    try {
      const tokenInId = symbolToIdMap.get(action.token_in);
      const tokenOutId = symbolToIdMap.get(action.token_out);

      if (!tokenInId || !tokenOutId) {
        console.warn(
          `Skipping trade: unknown token ${action.token_in} or ${action.token_out}`
        );
        continue;
      }

      let poolId = action.pool_id;
      const pool = pools.find((p) => p.id === poolId);
      if (!pool) {
        const matchingPool = pools.find(
          (p) =>
            (p.token_a === tokenInId && p.token_b === tokenOutId) ||
            (p.token_a === tokenOutId && p.token_b === tokenInId)
        );
        if (!matchingPool) {
          console.warn(
            `Skipping trade: no pool for ${action.token_in}/${action.token_out}`
          );
          continue;
        }
        poolId = matchingPool.id as string;
      }

      const { trade } = await executeSwap(
        arenaId,
        poolId,
        agentId,
        tokenInId,
        action.amount_in,
        action.reason
      );

      executedTrades.push(trade);
    } catch (error) {
      console.error(
        `Trade execution failed for ${action.token_in} -> ${action.token_out}:`,
        error
      );
    }
  }

  return executedTrades;
}
