import type { SwapResult } from "./types";

/**
 * Constant Product AMM (x * y = k)
 * All functions are pure — no database access.
 */

/**
 * Calculate swap output using constant product formula.
 * output = reserve_out - (k / (reserve_in + input_after_fee))
 */
export function calculateSwapOutput(
  amountIn: number,
  reserveIn: number,
  reserveOut: number,
  feeRate: number = 0.003
): SwapResult {
  if (amountIn <= 0) throw new Error("Amount in must be positive");
  if (reserveIn <= 0 || reserveOut <= 0) throw new Error("Reserves must be positive");
  if (feeRate < 0 || feeRate >= 1) throw new Error("Fee rate must be between 0 and 1");

  const fee = amountIn * feeRate;
  const amountInAfterFee = amountIn - fee;

  const k = reserveIn * reserveOut;
  const newReserveIn = reserveIn + amountInAfterFee;
  const amountOut = reserveOut - k / newReserveIn;

  if (amountOut <= 0) throw new Error("Insufficient liquidity");
  if (amountOut >= reserveOut) throw new Error("Amount exceeds available liquidity");

  const newReserveOut = reserveOut - amountOut;
  const executionPrice = amountIn / amountOut;
  const spotPrice = reserveIn / reserveOut;
  const priceImpact = Math.abs(executionPrice - spotPrice) / spotPrice;

  return {
    amountOut,
    fee,
    priceImpact,
    executionPrice,
    newReserveIn: reserveIn + amountIn, // Full amount (including fee) goes to reserves
    newReserveOut: newReserveOut,
  };
}

/**
 * Calculate spot price (price of token_a in terms of token_b).
 * price = reserve_b / reserve_a
 */
export function calculatePrice(reserveA: number, reserveB: number): number {
  if (reserveA <= 0 || reserveB <= 0) throw new Error("Reserves must be positive");
  return reserveB / reserveA;
}

/**
 * Calculate price impact for a given trade size.
 */
export function calculatePriceImpact(
  amountIn: number,
  reserveIn: number,
  reserveOut: number,
  feeRate: number = 0.003
): number {
  const result = calculateSwapOutput(amountIn, reserveIn, reserveOut, feeRate);
  return result.priceImpact;
}

/**
 * Find a route between two tokens through available pools.
 * Returns array of pool IDs forming the route.
 * For MVP: direct routes only (single hop).
 */
export function findRoute(
  tokenIn: string,
  tokenOut: string,
  pools: Array<{ id: string; token_a: string; token_b: string }>
): string[] {
  // Direct route
  const directPool = pools.find(
    (p) =>
      (p.token_a === tokenIn && p.token_b === tokenOut) ||
      (p.token_a === tokenOut && p.token_b === tokenIn)
  );
  if (directPool) return [directPool.id];

  // Two-hop route through intermediate token
  for (const poolA of pools) {
    let intermediateToken: string | null = null;

    if (poolA.token_a === tokenIn) intermediateToken = poolA.token_b;
    else if (poolA.token_b === tokenIn) intermediateToken = poolA.token_a;

    if (!intermediateToken) continue;

    const poolB = pools.find(
      (p) =>
        p.id !== poolA.id &&
        ((p.token_a === intermediateToken && p.token_b === tokenOut) ||
          (p.token_a === tokenOut && p.token_b === intermediateToken))
    );

    if (poolB) return [poolA.id, poolB.id];
  }

  return []; // No route found
}

/**
 * Calculate multi-hop swap output.
 * Chains swaps through multiple pools.
 */
export function calculateMultiHopSwap(
  amountIn: number,
  route: Array<{
    reserveIn: number;
    reserveOut: number;
    feeRate: number;
  }>
): { finalAmountOut: number; totalFee: number; totalPriceImpact: number } {
  let currentAmount = amountIn;
  let totalFee = 0;
  let totalPriceImpact = 0;

  for (const hop of route) {
    const result = calculateSwapOutput(
      currentAmount,
      hop.reserveIn,
      hop.reserveOut,
      hop.feeRate
    );
    currentAmount = result.amountOut;
    totalFee += result.fee;
    totalPriceImpact = 1 - (1 - totalPriceImpact) * (1 - result.priceImpact);
  }

  return {
    finalAmountOut: currentAmount,
    totalFee,
    totalPriceImpact,
  };
}

/**
 * Calculate liquidity addition amounts to maintain ratio.
 */
export function addLiquidity(
  amountA: number,
  reserveA: number,
  reserveB: number
): { amountA: number; amountB: number; newReserveA: number; newReserveB: number } {
  if (reserveA === 0 && reserveB === 0) {
    // Initial liquidity — caller must provide both
    throw new Error("Cannot add single-sided liquidity to empty pool");
  }

  const ratio = reserveB / reserveA;
  const amountB = amountA * ratio;

  return {
    amountA,
    amountB,
    newReserveA: reserveA + amountA,
    newReserveB: reserveB + amountB,
  };
}

/**
 * Calculate liquidity removal proportional to share.
 */
export function removeLiquidity(
  sharePercent: number,
  reserveA: number,
  reserveB: number
): { amountA: number; amountB: number; newReserveA: number; newReserveB: number } {
  if (sharePercent <= 0 || sharePercent > 1) {
    throw new Error("Share percent must be between 0 and 1");
  }

  const amountA = reserveA * sharePercent;
  const amountB = reserveB * sharePercent;

  return {
    amountA,
    amountB,
    newReserveA: reserveA - amountA,
    newReserveB: reserveB - amountB,
  };
}
