import { describe, it, expect } from "vitest";
import {
  applyDecay,
  calculateDecayLoss,
  periodsUntilThreshold,
  applyDecayToBalances,
} from "./decay";

describe("Decay", () => {
  describe("applyDecay", () => {
    it("should reduce balance by decay rate", () => {
      const result = applyDecay(1000, 0.001, 1);
      expect(result).toBeCloseTo(999);
    });

    it("should compound over multiple periods", () => {
      const result = applyDecay(1000, 0.001, 10);
      expect(result).toBeCloseTo(1000 * Math.pow(0.999, 10));
    });

    it("should return 0 for zero balance", () => {
      expect(applyDecay(0, 0.001)).toBe(0);
    });

    it("should return balance for zero decay rate", () => {
      expect(applyDecay(1000, 0)).toBe(1000);
    });

    it("should return 0 for 100% decay rate", () => {
      expect(applyDecay(1000, 1)).toBe(0);
    });

    it("should return balance for zero periods", () => {
      expect(applyDecay(1000, 0.001, 0)).toBe(1000);
    });
  });

  describe("calculateDecayLoss", () => {
    it("should calculate correct loss", () => {
      const loss = calculateDecayLoss(1000, 0.001, 1);
      expect(loss).toBeCloseTo(1);
    });

    it("should equal balance minus decayed balance", () => {
      const loss = calculateDecayLoss(1000, 0.01, 5);
      const decayed = applyDecay(1000, 0.01, 5);
      expect(loss).toBeCloseTo(1000 - decayed);
    });
  });

  describe("periodsUntilThreshold", () => {
    it("should calculate correct periods", () => {
      // 1000 * 0.999^n < 500 → n > ln(0.5)/ln(0.999) ≈ 693
      const periods = periodsUntilThreshold(1000, 0.001, 500);
      expect(periods).toBe(693); // ceil of ln(0.5)/ln(0.999)
    });

    it("should return 0 if balance already below threshold", () => {
      expect(periodsUntilThreshold(100, 0.001, 500)).toBe(0);
    });

    it("should return Infinity for zero decay", () => {
      expect(periodsUntilThreshold(1000, 0, 500)).toBe(Infinity);
    });
  });

  describe("applyDecayToBalances", () => {
    it("should skip recently active agents", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      const recentTrade = new Date("2024-01-01T11:30:00Z"); // 30 min ago

      const result = applyDecayToBalances(
        [
          { agent_id: "a1", token_id: "t1", amount: 1000, lastTradeAt: recentTrade },
        ],
        0.001,
        now,
        60 // period = 60 min
      );

      expect(result[0].newAmount).toBe(1000); // No decay
      expect(result[0].decayLoss).toBe(0);
    });

    it("should apply decay to inactive agents", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      const oldTrade = new Date("2024-01-01T09:00:00Z"); // 3 hours ago

      const result = applyDecayToBalances(
        [
          { agent_id: "a1", token_id: "t1", amount: 1000, lastTradeAt: oldTrade },
        ],
        0.001,
        now,
        60
      );

      // 3 hours = 3 periods
      expect(result[0].newAmount).toBeCloseTo(applyDecay(1000, 0.001, 3));
      expect(result[0].decayLoss).toBeGreaterThan(0);
    });

    it("should apply 1 period of decay when no trade history", () => {
      const result = applyDecayToBalances(
        [{ agent_id: "a1", token_id: "t1", amount: 1000, lastTradeAt: null }],
        0.001
      );

      expect(result[0].newAmount).toBeCloseTo(999);
    });
  });
});
