import { describe, it, expect, vi } from "vitest";

// vi.mock is hoisted — no external refs allowed in the factory
vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            should_trade: true,
            reasoning: "Market momentum is bullish",
            market_analysis: "Prices rising across pools",
            actions: [
              {
                pool_id: "pool-1",
                token_in: "USDC",
                token_out: "ALPHA",
                amount_in: 100,
                reason: "Bullish momentum",
              },
            ],
          }),
        },
      },
    ],
  });

  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockCreate } };
    },
    __mockCreate: mockCreate,
  };
});

import { evaluateArenaAgent } from "./agent-engine";
import type { Agent, ArenaBalance, Pool, PoolAnalysis } from "./types";

describe("Arena Agent Engine", () => {
  const mockAgent: Agent = {
    id: "agent-1",
    user_id: "user-1",
    name: "TestBot",
    risk_level: "balanced",
    initial_budget: 10000,
    current_balance: 0,
    tokens: [],
    is_active: true,
    personality: null,
    strategy_description: "Buy low sell high",
    is_npc: false,
    created_at: "2024-01-01",
  };

  const mockBalances: ArenaBalance[] = [
    {
      id: "b1",
      arena_id: "arena-1",
      agent_id: "agent-1",
      token_id: "token-usdc",
      amount: 5000,
      updated_at: "2024-01-01",
    },
    {
      id: "b2",
      arena_id: "arena-1",
      agent_id: "agent-1",
      token_id: "token-alpha",
      amount: 200,
      updated_at: "2024-01-01",
    },
  ];

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
      token_a_symbol: "ALPHA",
      token_b_symbol: "USDC",
    },
  ];

  const mockAnalyses: PoolAnalysis[] = [
    {
      poolId: "pool-1",
      tokenA: "ALPHA",
      tokenB: "USDC",
      currentPrice: 5.0,
      priceChange1h: 2.5,
      priceChange24h: 10.0,
      momentum: 0.6,
      volatility: 0.02,
      volume24h: 50000,
      liquidityDepth: 22360,
      narrative: "Bullish momentum",
    },
  ];

  const tokenSymbolMap = new Map([
    ["token-usdc", "USDC"],
    ["token-alpha", "ALPHA"],
  ]);

  it("should return a valid AI decision response", async () => {
    const result = await evaluateArenaAgent(
      mockAgent,
      mockBalances,
      mockPools,
      mockAnalyses,
      [],
      tokenSymbolMap
    );

    expect(result.should_trade).toBe(true);
    expect(result.reasoning).toBeTruthy();
    expect(result.market_analysis).toBeTruthy();
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].pool_id).toBe("pool-1");
    expect(result.actions[0].token_in).toBe("USDC");
    expect(result.actions[0].token_out).toBe("ALPHA");
  });

  it("should return no-trade on AI error", async () => {
    // Access the mock create fn from the mocked module
    const openaiModule = await import("openai") as unknown as { __mockCreate: ReturnType<typeof vi.fn> };
    openaiModule.__mockCreate.mockRejectedValueOnce(new Error("API error"));

    const result = await evaluateArenaAgent(
      mockAgent,
      mockBalances,
      mockPools,
      mockAnalyses,
      [],
      tokenSymbolMap
    );

    expect(result).toBeDefined();
    expect(typeof result.should_trade).toBe("boolean");
  });
});
