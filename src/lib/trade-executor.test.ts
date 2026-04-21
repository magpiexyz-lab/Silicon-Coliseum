import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pool-manager
vi.mock("./pool-manager", () => ({
  executeSwap: vi.fn().mockResolvedValue({
    trade: {
      id: "trade-1",
      arena_id: "arena-1",
      pool_id: "pool-1",
      agent_id: "agent-1",
      token_in: "token-usdc",
      token_out: "token-alpha",
      amount_in: 100,
      amount_out: 19.5,
      price: 5.128,
      fee: 0.3,
      reasoning: "Bullish momentum",
      created_at: "2024-01-01",
    },
    swapResult: {
      amountOut: 19.5,
      fee: 0.3,
      priceImpact: 0.01,
      executionPrice: 5.128,
      newReserveIn: 50100,
      newReserveOut: 9980.5,
    },
  }),
}));

import { executeArenaTrades } from "./trade-executor";
import type { ArenaTradeAction, Pool } from "./types";

describe("Arena Trade Executor", () => {
  const mockPools: Pool[] = [
    {
      id: "pool-1",
      arena_id: "arena-1",
      token_a: "token-alpha",
      token_b: "token-usdc",
      reserve_a: 10000,
      reserve_b: 50000,
      fee_rate: 0.003,
      total_volume: 100000,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  ];

  const symbolToIdMap = new Map([
    ["USDC", "token-usdc"],
    ["ALPHA", "token-alpha"],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should execute trades through pool manager", async () => {
    const actions: ArenaTradeAction[] = [
      {
        pool_id: "pool-1",
        token_in: "USDC",
        token_out: "ALPHA",
        amount_in: 100,
        reason: "Bullish momentum",
      },
    ];

    const trades = await executeArenaTrades(
      "arena-1",
      "agent-1",
      actions,
      mockPools,
      symbolToIdMap
    );

    expect(trades).toHaveLength(1);
    expect(trades[0].amount_in).toBe(100);
  });

  it("should skip trades with unknown tokens", async () => {
    const actions: ArenaTradeAction[] = [
      {
        pool_id: "pool-1",
        token_in: "UNKNOWN",
        token_out: "ALPHA",
        amount_in: 100,
        reason: "test",
      },
    ];

    const trades = await executeArenaTrades(
      "arena-1",
      "agent-1",
      actions,
      mockPools,
      symbolToIdMap
    );

    expect(trades).toHaveLength(0);
  });

  it("should find pool by token pair when pool_id doesn't match", async () => {
    const actions: ArenaTradeAction[] = [
      {
        pool_id: "nonexistent-pool",
        token_in: "USDC",
        token_out: "ALPHA",
        amount_in: 50,
        reason: "test",
      },
    ];

    const trades = await executeArenaTrades(
      "arena-1",
      "agent-1",
      actions,
      mockPools,
      symbolToIdMap
    );

    expect(trades).toHaveLength(1);
  });
});
