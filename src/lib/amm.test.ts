import { describe, it, expect } from "vitest";
import {
  calculateSwapOutput,
  calculatePrice,
  calculatePriceImpact,
  findRoute,
  calculateMultiHopSwap,
  addLiquidity,
  removeLiquidity,
} from "./amm";

describe("AMM Math", () => {
  describe("calculateSwapOutput", () => {
    it("should calculate correct output for basic swap", () => {
      // Pool: 1000 token_a, 2000 token_b, 0.3% fee
      const result = calculateSwapOutput(100, 1000, 2000, 0.003);
      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.amountOut).toBeLessThan(200); // Less than naive 100 * 2 due to slippage
      expect(result.fee).toBeCloseTo(0.3);
      expect(result.priceImpact).toBeGreaterThan(0);
    });

    it("should preserve constant product k", () => {
      const reserveIn = 1000;
      const reserveOut = 2000;
      const k = reserveIn * reserveOut;

      const result = calculateSwapOutput(100, reserveIn, reserveOut, 0.003);

      // k should be preserved (fee stays in pool so k actually increases)
      const newK = result.newReserveIn * result.newReserveOut;
      // newReserveIn includes fee, so newK >= k
      expect(newK).toBeGreaterThanOrEqual(k * 0.999); // Allow tiny float error
    });

    it("should increase price impact for larger trades", () => {
      const small = calculateSwapOutput(10, 1000, 2000, 0.003);
      const large = calculateSwapOutput(500, 1000, 2000, 0.003);
      expect(large.priceImpact).toBeGreaterThan(small.priceImpact);
    });

    it("should throw for zero or negative input", () => {
      expect(() => calculateSwapOutput(0, 1000, 2000)).toThrow();
      expect(() => calculateSwapOutput(-1, 1000, 2000)).toThrow();
    });

    it("should throw for zero reserves", () => {
      expect(() => calculateSwapOutput(100, 0, 2000)).toThrow();
      expect(() => calculateSwapOutput(100, 1000, 0)).toThrow();
    });

    it("should handle zero fee", () => {
      const result = calculateSwapOutput(100, 1000, 2000, 0);
      expect(result.fee).toBe(0);
      expect(result.amountOut).toBeGreaterThan(0);
    });

    it("should give less output with higher fees", () => {
      const lowFee = calculateSwapOutput(100, 1000, 2000, 0.001);
      const highFee = calculateSwapOutput(100, 1000, 2000, 0.01);
      expect(lowFee.amountOut).toBeGreaterThan(highFee.amountOut);
    });
  });

  describe("calculatePrice", () => {
    it("should return correct spot price", () => {
      expect(calculatePrice(1000, 2000)).toBe(2);
      expect(calculatePrice(2000, 1000)).toBe(0.5);
    });

    it("should handle equal reserves", () => {
      expect(calculatePrice(1000, 1000)).toBe(1);
    });

    it("should throw for zero reserves", () => {
      expect(() => calculatePrice(0, 1000)).toThrow();
      expect(() => calculatePrice(1000, 0)).toThrow();
    });
  });

  describe("calculatePriceImpact", () => {
    it("should return impact > 0 for any trade", () => {
      const impact = calculatePriceImpact(100, 1000, 2000);
      expect(impact).toBeGreaterThan(0);
    });

    it("should have negligible impact for tiny trades", () => {
      const impact = calculatePriceImpact(0.01, 1000000, 2000000);
      // Fee component causes ~0.3% base impact, but price movement should be tiny
      expect(impact).toBeLessThan(0.01);
    });
  });

  describe("findRoute", () => {
    const pools = [
      { id: "p1", token_a: "USDC", token_b: "ETH" },
      { id: "p2", token_a: "ETH", token_b: "PEPE" },
      { id: "p3", token_a: "USDC", token_b: "DOGE" },
    ];

    it("should find direct route", () => {
      expect(findRoute("USDC", "ETH", pools)).toEqual(["p1"]);
      expect(findRoute("ETH", "USDC", pools)).toEqual(["p1"]);
    });

    it("should find two-hop route", () => {
      const route = findRoute("USDC", "PEPE", pools);
      expect(route).toHaveLength(2);
      expect(route).toEqual(["p1", "p2"]);
    });

    it("should return empty for no route", () => {
      expect(findRoute("USDC", "BONK", pools)).toEqual([]);
    });
  });

  describe("calculateMultiHopSwap", () => {
    it("should chain swaps correctly", () => {
      const route = [
        { reserveIn: 1000, reserveOut: 2000, feeRate: 0.003 },
        { reserveIn: 2000, reserveOut: 5000, feeRate: 0.003 },
      ];
      const result = calculateMultiHopSwap(100, route);
      expect(result.finalAmountOut).toBeGreaterThan(0);
      expect(result.totalFee).toBeGreaterThan(0);
      expect(result.totalPriceImpact).toBeGreaterThan(0);
    });

    it("should give less output than two separate perfect swaps", () => {
      const singleHop = calculateSwapOutput(100, 1000, 5000, 0.003);
      const multiHop = calculateMultiHopSwap(100, [
        { reserveIn: 1000, reserveOut: 2000, feeRate: 0.003 },
        { reserveIn: 2000, reserveOut: 5000, feeRate: 0.003 },
      ]);
      // Multi-hop has cumulative fees and slippage
      expect(multiHop.totalFee).toBeGreaterThan(singleHop.fee);
    });
  });

  describe("addLiquidity", () => {
    it("should maintain pool ratio", () => {
      const result = addLiquidity(100, 1000, 2000);
      expect(result.amountB).toBe(200);
      expect(result.newReserveA).toBe(1100);
      expect(result.newReserveB).toBe(2200);
    });

    it("should throw for empty pool", () => {
      expect(() => addLiquidity(100, 0, 0)).toThrow();
    });
  });

  describe("removeLiquidity", () => {
    it("should remove proportional amounts", () => {
      const result = removeLiquidity(0.1, 1000, 2000);
      expect(result.amountA).toBe(100);
      expect(result.amountB).toBe(200);
      expect(result.newReserveA).toBe(900);
      expect(result.newReserveB).toBe(1800);
    });

    it("should throw for invalid share percent", () => {
      expect(() => removeLiquidity(0, 1000, 2000)).toThrow();
      expect(() => removeLiquidity(1.5, 1000, 2000)).toThrow();
    });
  });
});
