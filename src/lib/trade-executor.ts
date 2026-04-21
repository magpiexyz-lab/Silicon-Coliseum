import { createServiceClient } from "./supabase-server";
import { executeSwap } from "./pool-manager";
import type { ArenaTradeAction, ArenaTrade, Pool } from "./types";

/**
 * Trade Executor — executes AI agent trade decisions in arena pools.
 * Translates AI actions (which use token symbols) to pool-manager calls (which use token IDs).
 */

export async function executeArenaTrades(
  arenaId: string,
  agentId: string,
  actions: ArenaTradeAction[],
  pools: Pool[],
  symbolToIdMap: Map<string, string>
): Promise<ArenaTrade[]> {
  const executedTrades: ArenaTrade[] = [];

  for (const action of actions) {
    try {
      // Resolve token symbols to IDs
      const tokenInId = symbolToIdMap.get(action.token_in);
      const tokenOutId = symbolToIdMap.get(action.token_out);

      if (!tokenInId || !tokenOutId) {
        console.warn(
          `Skipping trade: unknown token ${action.token_in} or ${action.token_out}`
        );
        continue;
      }

      // Find the pool — use the AI-specified pool_id or find one matching the token pair
      let poolId = action.pool_id;

      // Validate pool exists and contains the right tokens
      const pool = pools.find((p) => p.id === poolId);
      if (!pool) {
        // Try to find a matching pool by tokens
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
        poolId = matchingPool.id;
      }

      // Execute swap through pool manager
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
