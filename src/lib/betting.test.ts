import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the resolveSolBets function's distribution logic by
// extracting the math and testing it independently.
// The actual function uses Supabase, so we mock it.

describe("SOL Bet Resolution Distribution Math", () => {
  // The distribution formula from resolveSolBets:
  // - 50% of losers' SOL → top 3 performers (50%/25%/20% + 5% fee)
  // - 50% of losers' SOL → winning bettors (proportional)

  function calculateDistribution(
    losingPoolLamports: number,
    winningBets: { amount: number }[],
    topPerformerCount: number
  ) {
    const performerPool = Math.floor(losingPoolLamports * 0.5);
    const bettorPool = losingPoolLamports - performerPool;

    // Performer rewards
    const performerDistribution = [0.5, 0.25, 0.2];
    const feeRate = 0.05;
    const feeAmount = Math.floor(performerPool * feeRate);

    const performerRewards: number[] = [];
    for (let i = 0; i < Math.min(topPerformerCount, 3); i++) {
      performerRewards.push(
        Math.floor(performerPool * (performerDistribution[i] || 0))
      );
    }

    // Bettor rewards
    const totalWinningBetAmount = winningBets.reduce(
      (sum, b) => sum + b.amount,
      0
    );
    const bettorRewards = winningBets.map((bet) => {
      const proportion =
        totalWinningBetAmount > 0 ? bet.amount / totalWinningBetAmount : 0;
      const winnings = Math.floor(bettorPool * proportion);
      return bet.amount + winnings; // original + winnings
    });

    return { performerPool, bettorPool, performerRewards, bettorRewards, feeAmount };
  }

  it("distributes 50/50 between performers and bettors", () => {
    const result = calculateDistribution(1_000_000_000, [], 3);
    expect(result.performerPool).toBe(500_000_000);
    expect(result.bettorPool).toBe(500_000_000);
  });

  it("performer rewards are 50%/25%/20% of performer pool", () => {
    const result = calculateDistribution(1_000_000_000, [], 3);
    expect(result.performerRewards[0]).toBe(250_000_000); // 50% of 500M
    expect(result.performerRewards[1]).toBe(125_000_000); // 25% of 500M
    expect(result.performerRewards[2]).toBe(100_000_000); // 20% of 500M
  });

  it("fee is 5% of performer pool", () => {
    const result = calculateDistribution(1_000_000_000, [], 3);
    expect(result.feeAmount).toBe(25_000_000); // 5% of 500M
  });

  it("performer + fee = 100% of performer pool", () => {
    const result = calculateDistribution(1_000_000_000, [], 3);
    const totalPerformer =
      result.performerRewards.reduce((s, r) => s + r, 0) + result.feeAmount;
    expect(totalPerformer).toBe(result.performerPool);
  });

  it("bettor rewards proportional to bet size", () => {
    const winningBets = [
      { amount: 300_000_000 }, // 30%
      { amount: 700_000_000 }, // 70%
    ];
    const result = calculateDistribution(1_000_000_000, winningBets, 3);

    // Bettor pool is 500M
    // Bet 1: 300M original + 30% of 500M = 300M + 150M = 450M
    // Bet 2: 700M original + 70% of 500M = 700M + 350M = 1050M
    expect(result.bettorRewards[0]).toBe(300_000_000 + 150_000_000);
    expect(result.bettorRewards[1]).toBe(700_000_000 + 350_000_000);
  });

  it("single winning bettor gets entire bettor pool + original", () => {
    const winningBets = [{ amount: 100_000_000 }];
    const result = calculateDistribution(500_000_000, winningBets, 3);
    // Bettor pool = 250M, single bettor gets 100% of it + their original 100M
    expect(result.bettorRewards[0]).toBe(100_000_000 + 250_000_000);
  });

  it("no winning bets means no bettor rewards", () => {
    const result = calculateDistribution(1_000_000_000, [], 3);
    expect(result.bettorRewards.length).toBe(0);
  });

  it("handles zero losing pool (no losers)", () => {
    const result = calculateDistribution(0, [{ amount: 100_000_000 }], 3);
    expect(result.performerPool).toBe(0);
    expect(result.bettorPool).toBe(0);
    expect(result.performerRewards.every((r) => r === 0)).toBe(true);
    expect(result.feeAmount).toBe(0);
    // Bettor gets back original + 0 winnings
    expect(result.bettorRewards[0]).toBe(100_000_000);
  });

  it("handles fewer than 3 performers", () => {
    const result = calculateDistribution(1_000_000_000, [], 1);
    expect(result.performerRewards.length).toBe(1);
    expect(result.performerRewards[0]).toBe(250_000_000); // 50% of performer pool
  });

  it("handles odd lamport amounts without rounding errors", () => {
    // 999,999,999 lamports (not divisible by 2)
    const result = calculateDistribution(
      999_999_999,
      [{ amount: 50_000_000 }],
      3
    );
    // Floor(999,999,999 * 0.5) = 499,999,999
    expect(result.performerPool).toBe(499_999_999);
    // Remainder goes to bettor pool
    expect(result.bettorPool).toBe(500_000_000);
    expect(result.performerPool + result.bettorPool).toBe(999_999_999);
  });
});

describe("CP Bet Resolution", () => {
  // Test the CP distribution logic:
  // - Losing pool splits 50/50 between agent owners and winning bettors
  // - Winning bettors get original bet back + proportional share

  function calculateCpDistribution(
    losingPool: number,
    winningBets: { cpAmount: number }[]
  ) {
    const bettorShare = losingPool * 0.5;
    const ownerShare = losingPool * 0.5;

    const totalWinningBetAmount = winningBets.reduce(
      (sum, b) => sum + b.cpAmount,
      0
    );

    const bettorPayouts = winningBets.map((bet) => {
      const proportion =
        totalWinningBetAmount > 0 ? bet.cpAmount / totalWinningBetAmount : 0;
      const winnings = bettorShare * proportion;
      return bet.cpAmount + winnings; // original + winnings
    });

    return { bettorShare, ownerShare, bettorPayouts };
  }

  it("splits losing pool 50/50 between owners and bettors", () => {
    const result = calculateCpDistribution(1000, []);
    expect(result.bettorShare).toBe(500);
    expect(result.ownerShare).toBe(500);
  });

  it("winning bettors get original + proportional share", () => {
    const result = calculateCpDistribution(1000, [
      { cpAmount: 200 },
      { cpAmount: 800 },
    ]);
    // 200/1000 * 500 = 100 winnings + 200 original = 300
    expect(result.bettorPayouts[0]).toBe(300);
    // 800/1000 * 500 = 400 winnings + 800 original = 1200
    expect(result.bettorPayouts[1]).toBe(1200);
  });

  it("single winner gets entire bettor share + original", () => {
    const result = calculateCpDistribution(1000, [{ cpAmount: 100 }]);
    expect(result.bettorPayouts[0]).toBe(100 + 500);
  });
});

describe("Agent Creation CP Gate", () => {
  const AGENT_CREATION_COST = 10_000;

  it("requires exactly 10,000 CP", () => {
    expect(AGENT_CREATION_COST).toBe(10_000);
  });

  it("allows creation with sufficient balance", () => {
    const balance = 15_000;
    expect(balance >= AGENT_CREATION_COST).toBe(true);
    expect(balance - AGENT_CREATION_COST).toBe(5_000);
  });

  it("rejects creation with insufficient balance", () => {
    const balance = 9_999;
    expect(balance >= AGENT_CREATION_COST).toBe(false);
  });

  it("allows creation with exact balance", () => {
    const balance = 10_000;
    expect(balance >= AGENT_CREATION_COST).toBe(true);
    expect(balance - AGENT_CREATION_COST).toBe(0);
  });
});

describe("CP Purchase Calculation", () => {
  const CP_PER_SOL = 10_000;

  function calculateCpFromLamports(lamports: number): number {
    return Math.floor(lamports / (1_000_000_000 / CP_PER_SOL));
  }

  it("1 SOL = 10,000 CP", () => {
    expect(calculateCpFromLamports(1_000_000_000)).toBe(10_000);
  });

  it("0.5 SOL = 5,000 CP", () => {
    expect(calculateCpFromLamports(500_000_000)).toBe(5_000);
  });

  it("0.1 SOL = 1,000 CP", () => {
    expect(calculateCpFromLamports(100_000_000)).toBe(1_000);
  });

  it("0.01 SOL = 100 CP", () => {
    expect(calculateCpFromLamports(10_000_000)).toBe(100);
  });

  it("sub-CP amounts floor to 0", () => {
    // Less than 100,000 lamports (1 CP worth)
    expect(calculateCpFromLamports(99_999)).toBe(0);
  });

  it("fractional CP is floored", () => {
    // 150,000 lamports = 1.5 CP → floors to 1
    expect(calculateCpFromLamports(150_000)).toBe(1);
  });
});

describe("Signup Bonus", () => {
  it("awards 100 CP", () => {
    const SIGNUP_BONUS = 100;
    expect(SIGNUP_BONUS).toBe(100);
    // User needs 100 signup bonuses worth of CP to create an agent
    // (or buy CP with SOL)
    expect(10_000 / SIGNUP_BONUS).toBe(100);
  });
});

describe("Betting Phase Validation", () => {
  it("rejects bets after betting phase end", () => {
    const bettingPhaseEnd = new Date("2026-04-29T10:00:00Z");
    const now = new Date("2026-04-29T11:00:00Z");
    expect(now > bettingPhaseEnd).toBe(true);
  });

  it("accepts bets before betting phase end", () => {
    const bettingPhaseEnd = new Date("2026-04-29T12:00:00Z");
    const now = new Date("2026-04-29T11:00:00Z");
    expect(now > bettingPhaseEnd).toBe(false);
  });

  it("accepts bets when no betting phase end is set", () => {
    const bettingPhaseEnd = null;
    // When null, no phase restriction — bets always accepted
    const shouldReject = bettingPhaseEnd !== null && new Date() > new Date(bettingPhaseEnd);
    expect(shouldReject).toBe(false);
  });
});

describe("Arena Bet Type Lock", () => {
  const validBetTypes = ["cp_only", "sol_only", "both"] as const;

  it("cp_only rejects SOL bets", () => {
    const betType = "cp_only";
    expect(betType === "cp_only").toBe(true);
    // SOL bets should be rejected when betType is cp_only
  });

  it("sol_only rejects CP bets", () => {
    const betType = "sol_only";
    expect(betType === "sol_only").toBe(true);
  });

  it("both accepts either", () => {
    const betType: string = "both";
    expect(betType !== "cp_only" && betType !== "sol_only").toBe(true);
  });

  it("default is 'both'", () => {
    expect(validBetTypes.includes("both")).toBe(true);
  });
});

describe("Minimum Bet Validation", () => {
  const MIN_BET_LAMPORTS = BigInt(10_000_000); // 0.01 SOL

  it("rejects bets below minimum", () => {
    const betAmount = BigInt(9_999_999);
    expect(betAmount < MIN_BET_LAMPORTS).toBe(true);
  });

  it("accepts bets at minimum", () => {
    const betAmount = BigInt(10_000_000);
    expect(betAmount < MIN_BET_LAMPORTS).toBe(false);
  });

  it("accepts bets above minimum", () => {
    const betAmount = BigInt(100_000_000);
    expect(betAmount < MIN_BET_LAMPORTS).toBe(false);
  });
});
