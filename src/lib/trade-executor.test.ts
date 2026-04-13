import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Agent, AITradeAction, MarketData } from "./types";

// Mock supabase-server
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

vi.mock("./supabase-server", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}));

const { executeTrades } = await import("./trade-executor");

const baseAgent: Agent = {
  id: "agent-1",
  user_id: "user-1",
  name: "Test Agent",
  risk_level: "balanced",
  initial_budget: 1000,
  current_balance: 500,
  tokens: ["PEPE", "WIF"],
  is_active: true,
  personality: null,
  created_at: "2024-01-01",
};

const basePrices = new Map<string, MarketData>([
  [
    "PEPE",
    {
      symbol: "PEPE",
      name: "Pepe",
      price: 0.00001,
      priceChange5m: 0,
      priceChange1h: 0,
      priceChange6h: 0,
      priceChange24h: 0,
      volume24h: 0,
      liquidity: 0,
      marketCap: 0,
      fdv: 0,
    },
  ],
  [
    "WIF",
    {
      symbol: "WIF",
      name: "dogwifhat",
      price: 2.5,
      priceChange5m: 0,
      priceChange1h: 0,
      priceChange6h: 0,
      priceChange24h: 0,
      volume24h: 0,
      liquidity: 0,
      marketCap: 0,
      fdv: 0,
    },
  ],
]);

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper to set up mock chain for a specific flow
function setupMockChain() {
  // This creates a flexible mock chain
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: mockFrom,
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  };

  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  });

  mockSelect.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
  });

  mockInsert.mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: mockSingle,
    }),
    error: null,
  });

  mockUpdate.mockReturnValue({
    eq: mockEq,
  });

  mockDelete.mockReturnValue({
    eq: mockEq,
  });

  mockEq.mockReturnValue({
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
    select: vi.fn().mockReturnValue({
      single: mockSingle,
    }),
    error: null,
  });

  return chain;
}

describe("executeTrades", () => {
  it("returns empty array when no actions provided", async () => {
    const result = await executeTrades(baseAgent, [], basePrices);
    expect(result).toEqual([]);
  });

  it("skips trades for tokens with no price data", async () => {
    const actions: AITradeAction[] = [
      {
        action: "BUY",
        token: "UNKNOWN",
        amount_usd: 100,
        confidence: 0.8,
        urgency: "medium",
        reason: "test",
      },
    ];

    const result = await executeTrades(baseAgent, actions, basePrices);
    expect(result).toEqual([]);
  });

  it("skips BUY when insufficient cash", async () => {
    const agent = { ...baseAgent, current_balance: 50 };
    const actions: AITradeAction[] = [
      {
        action: "BUY",
        token: "WIF",
        amount_usd: 100,
        confidence: 0.8,
        urgency: "medium",
        reason: "test",
      },
    ];

    const result = await executeTrades(agent, actions, basePrices);
    expect(result).toEqual([]);
  });

  it("executes a BUY trade for a new holding", async () => {
    setupMockChain();

    // No existing holding
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    // Insert holding succeeds
    const mockInsertSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockInsert.mockReturnValueOnce({ error: null }); // holding insert
    mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }); // balance update

    // Insert trade
    const tradeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "trade-1",
        agent_id: "agent-1",
        action: "BUY",
        token: "WIF",
        amount_usd: 100,
        price: 2.5,
        token_amount: 40,
        confidence: 0.8,
        reasoning: "test buy",
        created_at: "2024-01-01",
      },
      error: null,
    });
    mockInsert
      .mockReturnValueOnce({ error: null }) // holding insert
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ single: tradeSingle }),
      }); // trade insert

    // Re-setup from to use the above
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // holdings select
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        // holdings insert
        return {
          insert: vi.fn().mockReturnValue({ error: null }),
        };
      }
      if (callCount === 3) {
        // agent balance update
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ error: null }),
          }),
        };
      }
      if (callCount === 4) {
        // trade insert
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: tradeSingle }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn() }),
        }),
      };
    });

    const actions: AITradeAction[] = [
      {
        action: "BUY",
        token: "WIF",
        amount_usd: 100,
        confidence: 0.8,
        urgency: "medium",
        reason: "test buy",
      },
    ];

    const result = await executeTrades(baseAgent, actions, basePrices);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe("BUY");
    expect(result[0].token).toBe("WIF");
  });

  it("skips SELL when no holding exists", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    const actions: AITradeAction[] = [
      {
        action: "SELL",
        token: "WIF",
        amount_usd: 100,
        confidence: 0.8,
        urgency: "medium",
        reason: "test sell",
      },
    ];

    const result = await executeTrades(baseAgent, actions, basePrices);
    expect(result).toEqual([]);
  });
});
