import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TokenInfo, MarketData } from "./types";

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

const { analyzeSentiment } = await import("./sentiment");

const mockToken: TokenInfo = {
  symbol: "PEPE",
  name: "Pepe",
  chain: "ethereum",
  searchQuery: "PEPE ethereum",
};

const mockMarketData: MarketData = {
  symbol: "PEPE",
  name: "Pepe",
  price: 0.00001234,
  priceChange5m: 1.5,
  priceChange1h: 3.2,
  priceChange6h: -0.5,
  priceChange24h: 10.0,
  volume24h: 1000000,
  liquidity: 5000000,
  marketCap: 500000000,
  fdv: 600000000,
};

beforeEach(() => {
  mockCreate.mockReset();
});

describe("analyzeSentiment", () => {
  it("returns parsed sentiment data on successful AI response", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sentimentScore: 0.7,
              buzzLevel: 8,
              keyThemes: ["bullish momentum", "meme culture", "volume surge"],
              summary: "PEPE shows strong bullish sentiment driven by meme culture.",
            }),
          },
        },
      ],
    });

    const result = await analyzeSentiment(mockToken, mockMarketData);

    expect(result.token).toBe("PEPE");
    expect(result.sentimentScore).toBe(0.7);
    expect(result.buzzLevel).toBe(8);
    expect(result.keyThemes).toEqual(["bullish momentum", "meme culture", "volume surge"]);
    expect(result.summary).toContain("PEPE");
  });

  it("clamps sentimentScore to [-1, 1] range", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sentimentScore: 5.0,
              buzzLevel: 15,
              keyThemes: ["test"],
              summary: "Test summary",
            }),
          },
        },
      ],
    });

    const result = await analyzeSentiment(mockToken, mockMarketData);

    expect(result.sentimentScore).toBe(1);
    expect(result.buzzLevel).toBe(10);
  });

  it("returns neutral fallback on AI error", async () => {
    mockCreate.mockRejectedValue(new Error("API error"));

    const result = await analyzeSentiment(mockToken, mockMarketData);

    expect(result.token).toBe("PEPE");
    expect(result.sentimentScore).toBe(0);
    expect(result.buzzLevel).toBe(5);
    expect(result.keyThemes).toEqual(["neutral"]);
    expect(result.summary).toContain("Unable to analyze");
  });

  it("returns neutral fallback on invalid JSON response", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "This is not JSON at all",
          },
        },
      ],
    });

    const result = await analyzeSentiment(mockToken, mockMarketData);

    expect(result.sentimentScore).toBe(0);
    expect(result.buzzLevel).toBe(5);
    expect(result.keyThemes).toEqual(["neutral"]);
  });

  it("handles markdown-wrapped JSON response", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '```json\n{"sentimentScore": 0.5, "buzzLevel": 6, "keyThemes": ["test"], "summary": "Test"}\n```',
          },
        },
      ],
    });

    const result = await analyzeSentiment(mockToken, mockMarketData);

    expect(result.sentimentScore).toBe(0.5);
    expect(result.buzzLevel).toBe(6);
  });

  it("returns neutral fallback on empty response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });

    const result = await analyzeSentiment(mockToken, mockMarketData);

    expect(result.sentimentScore).toBe(0);
    expect(result.buzzLevel).toBe(5);
  });
});
