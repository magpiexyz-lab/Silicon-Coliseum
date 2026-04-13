import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/tokens", () => {
  it("returns the list of 12 supported tokens", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokens).toBeDefined();
    expect(data.tokens).toHaveLength(12);
  });

  it("each token has symbol, name, chain, and searchQuery", async () => {
    const response = await GET();
    const data = await response.json();

    for (const token of data.tokens) {
      expect(token.symbol).toBeDefined();
      expect(token.name).toBeDefined();
      expect(token.chain).toBeDefined();
      expect(token.searchQuery).toBeDefined();
    }
  });

  it("includes PEPE, WIF, BONK, DOGE in the token list", async () => {
    const response = await GET();
    const data = await response.json();
    const symbols = data.tokens.map((t: { symbol: string }) => t.symbol);

    expect(symbols).toContain("PEPE");
    expect(symbols).toContain("WIF");
    expect(symbols).toContain("BONK");
    expect(symbols).toContain("DOGE");
  });
});
