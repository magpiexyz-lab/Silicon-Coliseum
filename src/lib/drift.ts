/**
 * Price Drift & Sync — moves pool prices toward real-world targets.
 * Instead of pure random drift, we now drift TOWARD real prices
 * with some randomness to keep it interesting.
 */

import { getAllPrices } from "./price-feed";
import { calculatePrice } from "./amm";

/**
 * Generate a random drift factor between 0.95 and 1.05 (+/-1-5%).
 * Uses uniform distribution.
 */
export function generateDriftFactor(): number {
  return 0.95 + Math.random() * 0.10;
}

/**
 * Apply price-targeted drift to a pool's reserves.
 * If we have a real-world target price, drift TOWARD it (80% weight)
 * with some randomness (20% weight) to keep things fun.
 *
 * If no target, falls back to pure random drift.
 */
export function applyDrift(
  reserveToken: number,
  reserveBase: number,
  targetPrice?: number
): { reserveToken: number; reserveBase: number; driftPercent: number } {
  if (reserveToken <= 0 || reserveBase <= 0) {
    return { reserveToken, reserveBase, driftPercent: 0 };
  }

  const currentPrice = calculatePrice(reserveToken, reserveBase);
  const k = reserveToken * reserveBase;

  let newPrice: number;

  if (targetPrice && targetPrice > 0) {
    // Drift toward target price with some noise
    const priceDiff = targetPrice - currentPrice;
    const driftStrength = 0.1 + Math.random() * 0.15; // Move 10-25% toward target each cycle
    const noise = (Math.random() - 0.5) * currentPrice * 0.03; // ±1.5% noise

    newPrice = currentPrice + priceDiff * driftStrength + noise;

    // Clamp to prevent wild swings (max 10% move per cycle)
    const maxMove = currentPrice * 0.1;
    newPrice = Math.max(currentPrice - maxMove, Math.min(currentPrice + maxMove, newPrice));
  } else {
    // Pure random drift (original behavior)
    const driftFactor = generateDriftFactor();
    newPrice = currentPrice * driftFactor;
  }

  // Calculate new reserves while preserving k
  // price = reserveBase / reserveToken
  // k = reserveBase * reserveToken
  // So: reserveToken = sqrt(k / price), reserveBase = sqrt(k * price)
  const newReserveToken = Math.sqrt(k / newPrice);
  const newReserveBase = Math.sqrt(k * newPrice);

  const driftPercent = ((newPrice - currentPrice) / currentPrice) * 100;

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

/**
 * Fetch real prices and return a symbol->price map for drift targeting.
 */
export async function getRealPriceTargets(): Promise<Map<string, number>> {
  const targets = new Map<string, number>();

  try {
    const prices = await getAllPrices();
    for (const [symbol, data] of prices) {
      targets.set(symbol, data.priceUsd);
    }
  } catch (e) {
    console.error("Failed to fetch real price targets:", e);
  }

  return targets;
}
