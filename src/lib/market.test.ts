import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TokenInfo } from "./types";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
const { fetchTokenPrices } = await import("./market");

const mockTokens: TokenInfo[] = [
  { symbol: "PEPE", name: "Pepe", chain: "ethereum", searchQuery: "PEPE ethereum" },
  { symbol: "WIF", name: "dogwifhat", chain: "solana", searchQuery: "WIF solana dogwifhat" },
];

function makeDexScreenerResponse(symbol: string, price: string, liquidity: number) {
  return {
    pairs: [
      {
        baseToken: { symbol, name: symbol },
        priceUsd: price,
        priceChange: { m5: 1.5, h1: 3.2, h6: -0.5, h24: 10.0 },
        volume: { h24: 1000000 },
        liquidity: { usd: liquidity },
        marketCap: 500000000,
        fdv: 600000000,
      },
    ],
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("fetchTokenPrices", () => {
  it("returns a Map of market data keyed by symbol", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeDexScreenerResponse("PEPE", "0.00001234", 5000000)),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeDexScreenerResponse("WIF", "2.50", 3000000)),
      });

    const prices = await fetchTokenPrices(mockTokens);

    expect(prices).toBeInstanceOf(Map);
    expect(prices.size).toBe(2);
    expect(prices.has("PEPE")).toBe(true);
    expect(prices.has("WIF")).toBe(true);
  });

  it("parses price and market data correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeDexScreenerResponse("PEPE", "0.00001234", 5000000)),
    });

    const prices = await fetchTokenPrices([mockTokens[0]]);
    const pepe = prices.get("PEPE");

    expect(pepe).toBeDefined();
    expect(pepe!.price).toBe(0.00001234);
    expect(pepe!.priceChange5m).toBe(1.5);
    expect(pepe!.priceChange1h).toBe(3.2);
    expect(pepe!.priceChange6h).toBe(-0.5);
    expect(pepe!.priceChange24h).toBe(10.0);
    expect(pepe!.volume24h).toBe(1000000);
    expect(pepe!.liquidity).toBe(5000000);
    expect(pepe!.marketCap).toBe(500000000);
  });

  it("selects the pair with highest liquidity", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          pairs: [
            {
              baseToken: { symbol: "PEPE", name: "Pepe" },
              priceUsd: "0.00001000",
              priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 },
              volume: { h24: 100 },
              liquidity: { usd: 1000 },
              marketCap: 100,
              fdv: 200,
            },
            {
              baseToken: { symbol: "PEPE", name: "Pepe" },
              priceUsd: "0.00001234",
              priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 },
              volume: { h24: 500000 },
              liquidity: { usd: 9999999 },
              marketCap: 500000000,
              fdv: 600000000,
            },
          ],
        }),
    });

    const prices = await fetchTokenPrices([mockTokens[0]]);
    const pepe = prices.get("PEPE");

    expect(pepe!.price).toBe(0.00001234);
    expect(pepe!.liquidity).toBe(9999999);
  });

  it("handles API errors gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const prices = await fetchTokenPrices([mockTokens[0]]);
    expect(prices.size).toBe(0);
  });

  it("handles empty pairs array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ pairs: [] }),
    });

    const prices = await fetchTokenPrices([mockTokens[0]]);
    expect(prices.size).toBe(0);
  });

  it("handles null pairs", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ pairs: null }),
    });

    const prices = await fetchTokenPrices([mockTokens[0]]);
    expect(prices.size).toBe(0);
  });

  it("handles network errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const prices = await fetchTokenPrices([mockTokens[0]]);
    expect(prices.size).toBe(0);
  });
});
