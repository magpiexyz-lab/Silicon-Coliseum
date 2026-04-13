import { describe, it, expect } from "vitest";
import { SUPPORTED_TOKENS, getTokenBySymbol } from "@/lib/tokens";

describe("tokens", () => {
  it("exports exactly 12 supported tokens", () => {
    expect(SUPPORTED_TOKENS).toHaveLength(12);
  });

  it("includes all required token symbols", () => {
    const symbols = SUPPORTED_TOKENS.map((t) => t.symbol);
    expect(symbols).toContain("PEPE");
    expect(symbols).toContain("WIF");
    expect(symbols).toContain("BONK");
    expect(symbols).toContain("DOGE");
    expect(symbols).toContain("SHIB");
    expect(symbols).toContain("FLOKI");
    expect(symbols).toContain("BRETT");
    expect(symbols).toContain("POPCAT");
    expect(symbols).toContain("MEW");
    expect(symbols).toContain("TURBO");
    expect(symbols).toContain("MOG");
    expect(symbols).toContain("PENGU");
  });

  it("each token has symbol, name, chain, and searchQuery", () => {
    for (const token of SUPPORTED_TOKENS) {
      expect(token.symbol).toBeTruthy();
      expect(token.name).toBeTruthy();
      expect(token.chain).toBeTruthy();
      expect(token.searchQuery).toBeTruthy();
    }
  });

  it("getTokenBySymbol returns the correct token", () => {
    const pepe = getTokenBySymbol("PEPE");
    expect(pepe).toBeDefined();
    expect(pepe!.name).toBe("Pepe");
    expect(pepe!.chain).toBe("ethereum");
  });

  it("getTokenBySymbol returns undefined for unknown symbol", () => {
    const result = getTokenBySymbol("UNKNOWN");
    expect(result).toBeUndefined();
  });
});
