/**
 * Holding decay — balances slowly decay if agents don't trade.
 * Encourages active participation and prevents stalemate.
 */

/**
 * Apply exponential decay to a balance.
 * newBalance = balance * (1 - decayRate)^periods
 *
 * @param balance - Current balance
 * @param decayRate - Decay rate per period (e.g., 0.001 = 0.1% per period)
 * @param periods - Number of periods since last activity
 * @returns Decayed balance
 */
export function applyDecay(
  balance: number,
  decayRate: number,
  periods: number = 1
): number {
  if (balance <= 0) return 0;
  if (decayRate <= 0) return balance;
  if (decayRate >= 1) return 0;
  if (periods <= 0) return balance;

  return balance * Math.pow(1 - decayRate, periods);
}

/**
 * Calculate the amount lost to decay.
 */
export function calculateDecayLoss(
  balance: number,
  decayRate: number,
  periods: number = 1
): number {
  return balance - applyDecay(balance, decayRate, periods);
}

/**
 * Calculate how many periods until balance reaches a threshold.
 * periods = ln(threshold / balance) / ln(1 - decayRate)
 */
export function periodsUntilThreshold(
  balance: number,
  decayRate: number,
  threshold: number
): number {
  if (balance <= threshold) return 0;
  if (decayRate <= 0) return Infinity;
  if (decayRate >= 1) return 1;

  return Math.ceil(
    Math.log(threshold / balance) / Math.log(1 - decayRate)
  );
}

/**
 * Apply decay to multiple balances, skipping recently active agents.
 * Returns a map of agent_id -> token_id -> decayed amount.
 */
export function applyDecayToBalances(
  balances: Array<{
    agent_id: string;
    token_id: string;
    amount: number;
    lastTradeAt: Date | null;
  }>,
  decayRate: number,
  now: Date = new Date(),
  periodMinutes: number = 60
): Array<{ agent_id: string; token_id: string; newAmount: number; decayLoss: number }> {
  return balances.map((b) => {
    // If agent traded recently, skip decay
    if (b.lastTradeAt) {
      const minutesSinceLastTrade =
        (now.getTime() - b.lastTradeAt.getTime()) / (1000 * 60);
      if (minutesSinceLastTrade < periodMinutes) {
        return {
          agent_id: b.agent_id,
          token_id: b.token_id,
          newAmount: b.amount,
          decayLoss: 0,
        };
      }

      const periods = Math.floor(minutesSinceLastTrade / periodMinutes);
      const newAmount = applyDecay(b.amount, decayRate, periods);
      return {
        agent_id: b.agent_id,
        token_id: b.token_id,
        newAmount,
        decayLoss: b.amount - newAmount,
      };
    }

    // No trade history — apply 1 period of decay
    const newAmount = applyDecay(b.amount, decayRate);
    return {
      agent_id: b.agent_id,
      token_id: b.token_id,
      newAmount,
      decayLoss: b.amount - newAmount,
    };
  });
}
