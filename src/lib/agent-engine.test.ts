import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Agent, Holding, Trade, MarketData, SentimentData } from "./types";

// Mock OpenAI (Groq) SDK
const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

const { evaluateAgent } = await import("./agent-engine");

const mockAgent: Agent = {
  id: "agent-1",
  user_id: "user-1",
  name: "Test Agent",
  risk_level: "balanced",
  initial_budget: 1000,
  current_balance: 800,
  tokens: ["PEPE", "WIF"],
  is_active: true,
  personality: null,
  created_at: "2024-01-01",
};

const mockHoldings: Holding[] = [
  {
    id: "h1",
    agent_id: "agent-1",
    token: "PEPE",
    amount: 5000000,
    avg_buy_price: 0.000008,
  },
];

const mockTrades: Trade[] = [
  {
    id: "t1",
    agent_id: "agent-1",
    action: "BUY",
    token: "PEPE",
    amount_usd: 40,
    price: 0.000008,
    token_amount: 5000000,
    confidence: 0.6,
    reasoning: "momentum",
    created_at: "2024-01-01",
  },
];

const mockMarketData = new Map<string, MarketData>([
  [
    "PEPE",
    {
      symbol: "PEPE",
      name: "Pepe",
      price: 0.00001,
      priceChange5m: 2,
      priceChange1h: 5,
      priceChange6h: -1,
      priceChange24h: 15,
      volume24h: 2000000,
      liquidity: 5000000,
      marketCap: 500000000,
      fdv: 600000000,
    },
  ],
  [
    "WIF",
    {
      symbol: "WIF",
      name: "dogwifhat",
      price: 2.5,
      priceChange5m: -1,
      priceChange1h: 0.5,
      priceChange6h: 3,
      priceChange24h: -5,
      volume24h: 1000000,
      liquidity: 3000000,
      marketCap: 400000000,
      fdv: 500000000,
    },
  ],
]);

const mockSentiment = new Map<string, SentimentData>([
  [
    "PEPE",
    {
      token: "PEPE",
      sentimentScore: 0.7,
      buzzLevel: 8,
      keyThemes: ["bullish"],
      summary: "Strong bullish momentum",
    },
  ],
  [
    "WIF",
    {
      token: "WIF",
      sentimentScore: -0.2,
      buzzLevel: 4,
      keyThemes: ["bearish"],
      summary: "Slight bearish pressure",
    },
  ],
]);

beforeEach(() => {
  mockCreate.mockReset();
});

describe("evaluateAgent", () => {
  it("returns a valid AI decision response on success", async () => {
    const mockResponse = {
      should_trade: true,
      reasoning: "Strong momentum on PEPE",
      market_analysis: "PEPE showing bullish signals",
      actions: [
        {
          action: "BUY",
          token: "PEPE",
          amount_usd: 100,
          confidence: 0.75,
          urgency: "medium",
          reason: "Momentum play",
        },
      ],
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResponse) } }],
    });

    const result = await evaluateAgent(
      mockAgent,
      mockHoldings,
      mockTrades,
      mockMarketData,
      mockSentiment
    );

    expect(result.should_trade).toBe(true);
    expect(result.reasoning).toContain("PEPE");
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].action).toBe("BUY");
    expect(result.actions[0].token).toBe("PEPE");
    expect(result.actions[0].confidence).toBe(0.75);
  });

  it("returns no-trade fallback on AI error", async () => {
    mockCreate.mockRejectedValue(new Error("API error"));

    const result = await evaluateAgent(
      mockAgent,
      mockHoldings,
      mockTrades,
      mockMarketData,
      mockSentiment
    );

    expect(result.should_trade).toBe(false);
    expect(result.reasoning).toContain("Failed to parse");
    expect(result.actions).toEqual([]);
  });

  it("returns no-trade fallback on invalid JSON response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "not valid json" } }],
    });

    const result = await evaluateAgent(
      mockAgent,
      mockHoldings,
      mockTrades,
      mockMarketData,
      mockSentiment
    );

    expect(result.should_trade).toBe(false);
    expect(result.actions).toEqual([]);
  });

  it("handles empty response from AI", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });

    const result = await evaluateAgent(
      mockAgent,
      mockHoldings,
      mockTrades,
      mockMarketData,
      mockSentiment
    );

    expect(result.should_trade).toBe(false);
  });

  it("handles markdown-wrapped JSON response", async () => {
    const mockResponse = {
      should_trade: false,
      reasoning: "Market is flat",
      market_analysis: "No significant signals",
      actions: [],
    };

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "```json\n" + JSON.stringify(mockResponse) + "\n```",
          },
        },
      ],
    });

    const result = await evaluateAgent(
      mockAgent,
      mockHoldings,
      mockTrades,
      mockMarketData,
      mockSentiment
    );

    expect(result.should_trade).toBe(false);
    expect(result.reasoning).toBe("Market is flat");
  });

  it("uses custom personality when provided", async () => {
    const agentWithPersonality = {
      ...mockAgent,
      personality: "Only trade when volume spikes above 2x average",
    };

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              should_trade: false,
              reasoning: "Volume not spiked",
              market_analysis: "Normal volume",
              actions: [],
            }),
          },
        },
      ],
    });

    await evaluateAgent(
      agentWithPersonality,
      mockHoldings,
      mockTrades,
      mockMarketData,
      mockSentiment
    );

    // Verify the system prompt includes personality
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain(
      "Only trade when volume spikes"
    );
  });

  it("validates action schema and rejects invalid actions", async () => {
    // Missing required fields in actions
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              should_trade: true,
              reasoning: "test",
              market_analysis: "test",
              actions: [
                {
                  action: "INVALID_ACTION",
                  token: "PEPE",
                  amount_usd: -100,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await evaluateAgent(
      mockAgent,
      mockHoldings,
      mockTrades,
      mockMarketData,
      mockSentiment
    );

    // Should fall back to no-trade due to Zod validation failure
    expect(result.should_trade).toBe(false);
    expect(result.actions).toEqual([]);
  });
});
