/**
 * Random Price Drift -- simulates external market forces to prevent stalemate.
 * Every eval cycle, pool reserves are nudged randomly to shift prices.
 */

/**
 * Generate a random drift factor between 0.95 and 1.05 (+/-1-5%).
 * Uses uniform distribution.
 */
export function generateDriftFactor(): number {
  // Random number in [0.95, 1.05]
  return 0.95 + Math.random() * 0.10;
}

/**
 * Apply random drift to a pool's reserves.
 * Multiplies one side (reserveToken) by a drift factor, keeping k approximately preserved
 * by adjusting reserveBase inversely.
 *
 * Returns new reserves and the drift percentage.
 */
export function applyDrift(
  reserveToken: number,
  reserveBase: number
): { reserveToken: number; reserveBase: number; driftPercent: number } {
  if (reserveToken <= 0 || reserveBase <= 0) {
    return { reserveToken, reserveBase, driftPercent: 0 };
  }

  const k = reserveToken * reserveBase;
  const driftFactor = generateDriftFactor();

  // Apply drift to token reserve
  const newReserveToken = reserveToken * driftFactor;

  // Preserve k approximately: newReserveBase = k / newReserveToken
  const newReserveBase = k / newReserveToken;

  // Calculate price change: old price = reserveBase/reserveToken, new price = newReserveBase/newReserveToken
  const oldPrice = reserveBase / reserveToken;
  const newPrice = newReserveBase / newReserveToken;
  const driftPercent = ((newPrice - oldPrice) / oldPrice) * 100;

  return {
    reserveToken: newReserveToken,
    reserveBase: newReserveBase,
    driftPercent,
  };
}

/**
 * Apply cash decay to an agent's vUSD cash balance.
 * newBalance = cashBalance * (1 - decayRate)
 *
 * Default decay rate is 0.001 (0.1% per cycle).
 */
export function applyCashDecay(cashBalance: number, decayRate: number = 0.001): number {
  if (cashBalance <= 0) return 0;
  if (decayRate <= 0) return cashBalance;
  if (decayRate >= 1) return 0;

  return cashBalance * (1 - decayRate);
}
