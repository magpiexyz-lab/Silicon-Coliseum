import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MarketData } from "./types";

// Mock supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock("./supabase-server", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}));

const { calculateLeaderboard } = await import("./leaderboard");

const mockPrices = new Map<string, MarketData>([
  [
    "PEPE",
    {
      symbol: "PEPE",
      name: "Pepe",
      price: 0.00002, // Price doubled from buy
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

describe("calculateLeaderboard", () => {
  it("returns an empty array when no agents exist", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "agents") {
        return {
          select: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        };
      }
      if (table === "holdings") {
        return {
          select: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      if (table === "trades") {
        return {
          select: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return { select: vi.fn() };
    });

    const result = await calculateLeaderboard(mockPrices);
    expect(result).toEqual([]);
  });

  it("calculates P&L correctly and ranks by P&L% descending", async () => {
    const agents = [
      {
        id: "agent-1",
        user_id: "user-1",
        name: "Agent A",
        risk_level: "balanced",
        initial_budget: 1000,
        current_balance: 500, // $500 cash remaining
        tokens: ["PEPE"],
        is_active: true,
        personality: null,
        created_at: "2024-01-01",
        users: { username: "alice" },
      },
      {
        id: "agent-2",
        user_id: "user-2",
        name: "Agent B",
        risk_level: "aggressive",
        initial_budget: 1000,
        current_balance: 200, // $200 cash remaining
        tokens: ["PEPE"],
        is_active: true,
        personality: null,
        created_at: "2024-01-01",
        users: { username: "bob" },
      },
    ];

    const holdings = [
      {
        id: "h1",
        agent_id: "agent-1",
        token: "PEPE",
        amount: 25000000, // 25M PEPE at $0.00002 = $500
        avg_buy_price: 0.00001,
      },
      {
        id: "h2",
        agent_id: "agent-2",
        token: "PEPE",
        amount: 50000000, // 50M PEPE at $0.00002 = $1000
        avg_buy_price: 0.00001,
      },
    ];

    const trades = [
      { agent_id: "agent-1" },
      { agent_id: "agent-1" },
      { agent_id: "agent-2" },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "agents") {
        return {
          select: vi.fn().mockReturnValue({
            data: agents,
            error: null,
          }),
        };
      }
      if (table === "holdings") {
        return {
          select: vi.fn().mockReturnValue({ data: holdings, error: null }),
        };
      }
      if (table === "trades") {
        return {
          select: vi.fn().mockReturnValue({ data: trades, error: null }),
        };
      }
      return { select: vi.fn() };
    });

    const result = await calculateLeaderboard(mockPrices);

    expect(result).toHaveLength(2);

    // Agent B: $200 cash + 50M * $0.00002 = $200 + $1000 = $1200 total
    // P&L = ($1200 - $1000) / $1000 * 100 = 20%
    expect(result[0].agentName).toBe("Agent B");
    expect(result[0].pnlPercent).toBe(20);
    expect(result[0].rank).toBe(1);
    expect(result[0].tradeCount).toBe(1);
    expect(result[0].ownerUsername).toBe("bob");

    // Agent A: $500 cash + 25M * $0.00002 = $500 + $500 = $1000 total
    // P&L = ($1000 - $1000) / $1000 * 100 = 0%
    expect(result[1].agentName).toBe("Agent A");
    expect(result[1].pnlPercent).toBe(0);
    expect(result[1].rank).toBe(2);
    expect(result[1].tradeCount).toBe(2);
    expect(result[1].ownerUsername).toBe("alice");
  });

  it("handles database errors gracefully", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        data: null,
        error: { message: "DB error" },
      }),
    }));

    const result = await calculateLeaderboard(mockPrices);
    expect(result).toEqual([]);
  });
});
