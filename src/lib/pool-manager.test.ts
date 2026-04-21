import { describe, it, expect, vi } from "vitest";

// Build chain-able mock that tracks calls
function mockChain(finalResult: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "insert", "update", "delete", "eq", "lte", "order", "limit", "single", "maybeSingle"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Terminal methods return the result
  chain["single"] = vi.fn().mockResolvedValue(finalResult);
  chain["maybeSingle"] = vi.fn().mockResolvedValue(finalResult);
  // select after insert also needs chaining
  const selectAfterInsert = { ...chain, single: vi.fn().mockResolvedValue(finalResult) };
  chain["select"] = vi.fn().mockReturnValue(selectAfterInsert);
  return chain;
}

const mockPool = {
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
};

vi.mock("./supabase-server", () => {
  // Create a dynamic mock that returns appropriate results
  const mockClient = {
    from: vi.fn().mockImplementation(() => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {};
      const self = chain;
      chain.select = vi.fn().mockReturnValue(self);
      chain.insert = vi.fn().mockReturnValue(self);
      chain.update = vi.fn().mockReturnValue(self);
      chain.eq = vi.fn().mockReturnValue(self);
      chain.lte = vi.fn().mockReturnValue(self);
      chain.order = vi.fn().mockReturnValue(self);
      chain.limit = vi.fn().mockReturnValue(self);
      chain.single = vi.fn().mockResolvedValue({
        data: {
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
        error: null,
      });
      chain.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: "bal-1", arena_id: "arena-1", agent_id: "agent-1", token_id: "token-usdc", amount: 5000 },
        error: null,
      });
      return chain;
    }),
  };

  return {
    createServiceClient: vi.fn().mockReturnValue(mockClient),
  };
});

import { calculateSwapOutput, calculatePrice, calculatePriceImpact } from "./amm";

describe("Pool Manager (AMM integration)", () => {
  describe("swap calculation via AMM", () => {
    it("should calculate correct swap output", () => {
      const result = calculateSwapOutput(100, 10000, 50000, 0.003);

      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.amountOut).toBeLessThan(50000);
      expect(result.fee).toBeCloseTo(0.3, 2);
      expect(result.executionPrice).toBeGreaterThan(0);
      expect(result.newReserveIn).toBe(10100);
      expect(result.newReserveOut).toBeLessThan(50000);
    });

    it("should maintain k invariant (minus fees)", () => {
      const reserveIn = 10000;
      const reserveOut = 50000;
      const k = reserveIn * reserveOut;

      const result = calculateSwapOutput(100, reserveIn, reserveOut, 0.003);

      // After fee, k should be preserved
      const amountInAfterFee = 100 - result.fee;
      const newK = (reserveIn + amountInAfterFee) * result.newReserveOut;
      expect(newK).toBeCloseTo(k, 0);
    });

    it("should reject zero or negative input", () => {
      expect(() => calculateSwapOutput(0, 10000, 50000, 0.003)).toThrow("Amount in must be positive");
      expect(() => calculateSwapOutput(-100, 10000, 50000, 0.003)).toThrow("Amount in must be positive");
    });

    it("should handle small swaps", () => {
      const result = calculateSwapOutput(0.01, 10000, 50000, 0.003);
      expect(result.amountOut).toBeGreaterThan(0);
    });
  });

  describe("price calculation", () => {
    it("should calculate spot price correctly", () => {
      const price = calculatePrice(10000, 50000);
      expect(price).toBe(5);
    });

    it("should update price after swap", () => {
      const result = calculateSwapOutput(1000, 10000, 50000, 0.003);
      const newPrice = calculatePrice(result.newReserveIn, result.newReserveOut);
      // Price should increase (selling token_b for token_a pushes price up relative to token_a)
      expect(newPrice).toBeLessThan(5); // Less token_b per token_a = token_a got more expensive
    });
  });

  describe("price impact", () => {
    it("should increase with trade size", () => {
      const smallImpact = calculatePriceImpact(100, 10000, 50000, 0.003);
      const largeImpact = calculatePriceImpact(5000, 10000, 50000, 0.003);
      expect(largeImpact).toBeGreaterThan(smallImpact);
    });
  });
});
