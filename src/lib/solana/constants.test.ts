import { describe, it, expect } from "vitest";
import {
  CP_RATE_LAMPORTS,
  CP_PER_SOL,
  AGENT_CREATION_COST_CP,
  MIN_BET_SOL,
  MIN_BET_LAMPORTS,
  FEE_BPS,
  LAMPORTS_PER_SOL,
  SEED_CONFIG,
  SEED_ARENA,
  SEED_BET,
  SEED_REWARD,
} from "./constants";

describe("Constants", () => {
  it("CP rate is consistent: 1 SOL = 10,000 CP", () => {
    // 1 SOL = 1,000,000,000 lamports
    // 10,000 CP per SOL means 100,000 lamports per CP
    expect(CP_RATE_LAMPORTS).toBe(BigInt(100_000));
    expect(CP_PER_SOL).toBe(10_000);

    // Verify consistency
    const lamportsPerSol = BigInt(1_000_000_000);
    expect(lamportsPerSol / CP_RATE_LAMPORTS).toBe(BigInt(CP_PER_SOL));
  });

  it("agent creation costs 10,000 CP (= 1 SOL worth)", () => {
    expect(AGENT_CREATION_COST_CP).toBe(10_000);
    expect(AGENT_CREATION_COST_CP).toBe(CP_PER_SOL);
  });

  it("minimum bet is 0.01 SOL = 10,000,000 lamports", () => {
    expect(MIN_BET_SOL).toBe(0.01);
    expect(MIN_BET_LAMPORTS).toBe(BigInt(10_000_000));

    // Verify consistency
    const expectedLamports = BigInt(Math.round(MIN_BET_SOL * 1_000_000_000));
    expect(MIN_BET_LAMPORTS).toBe(expectedLamports);
  });

  it("fee is 5% (500 basis points)", () => {
    expect(FEE_BPS).toBe(500);
    // 500 / 10000 = 0.05 = 5%
    expect(FEE_BPS / 10_000).toBe(0.05);
  });

  it("LAMPORTS_PER_SOL is correct", () => {
    expect(LAMPORTS_PER_SOL).toBe(BigInt(1_000_000_000));
  });

  it("PDA seeds are correct strings", () => {
    expect(SEED_CONFIG).toBe("config");
    expect(SEED_ARENA).toBe("arena");
    expect(SEED_BET).toBe("bet");
    expect(SEED_REWARD).toBe("reward");
  });
});
