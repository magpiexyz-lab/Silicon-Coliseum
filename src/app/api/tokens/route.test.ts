import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  createServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: "t1", symbol: "ALPHA", name: "Alpha Token", image_url: null, description: null, created_by: null, created_at: "2024-01-01" },
            { id: "t2", symbol: "USDC", name: "USD Coin", image_url: null, description: null, created_by: null, created_at: "2024-01-01" },
          ],
          error: null,
        }),
      }),
    }),
  }),
}));

import { GET } from "./route";

describe("GET /api/tokens", () => {
  it("returns platform tokens from database", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokens).toBeDefined();
    expect(data.tokens).toHaveLength(2);
  });

  it("each token has id, symbol, and name", async () => {
    const response = await GET();
    const data = await response.json();

    for (const token of data.tokens) {
      expect(token.id).toBeDefined();
      expect(token.symbol).toBeDefined();
      expect(token.name).toBeDefined();
    }
  });

  it("returns tokens in order", async () => {
    const response = await GET();
    const data = await response.json();
    const symbols = data.tokens.map((t: { symbol: string }) => t.symbol);

    expect(symbols).toContain("ALPHA");
    expect(symbols).toContain("USDC");
  });
});
