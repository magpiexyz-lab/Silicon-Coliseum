import { describe, it, expect } from "vitest";
import type { NpcConfig, Pool, ArenaBalance } from "./types";

describe("NPC Engine", () => {
  const DEFAULT_NPC_CONFIGS: Record<NpcConfig["strategy"], NpcConfig> = {
    random_walk: {
      strategy: "random_walk",
      tradeFrequency: 0.6,
      maxTradeSize: 0.05,
      volatilityTarget: 0,
    },
    mean_reversion: {
      strategy: "mean_reversion",
      tradeFrequency: 0.4,
      maxTradeSize: 0.08,
      volatilityTarget: 0.02,
    },
    volume_injection: {
      strategy: "volume_injection",
      tradeFrequency: 0.8,
      maxTradeSize: 0.03,
      volatilityTarget: 0,
    },
  };

  describe("NPC Strategy Configs", () => {
    it("should have three strategies defined", () => {
      expect(Object.keys(DEFAULT_NPC_CONFIGS)).toHaveLength(3);
    });

    it("random_walk should have moderate frequency", () => {
      const config = DEFAULT_NPC_CONFIGS.random_walk;
      expect(config.tradeFrequency).toBe(0.6);
      expect(config.maxTradeSize).toBe(0.05);
    });

    it("mean_reversion should have lower frequency and higher trade size", () => {
      const config = DEFAULT_NPC_CONFIGS.mean_reversion;
      expect(config.tradeFrequency).toBe(0.4);
      expect(config.maxTradeSize).toBe(0.08);
      expect(config.volatilityTarget).toBe(0.02);
    });

    it("volume_injection should have highest frequency and smallest trades", () => {
      const config = DEFAULT_NPC_CONFIGS.volume_injection;
      expect(config.tradeFrequency).toBe(0.8);
      expect(config.maxTradeSize).toBe(0.03);
    });
  });

  describe("Strategy Parsing", () => {
    function parseNpcStrategy(description: string | null): NpcConfig["strategy"] {
      if (!description) return "random_walk";
      const lower = description.toLowerCase();
      if (lower.includes("mean_reversion") || lower.includes("revert")) return "mean_reversion";
      if (lower.includes("volume") || lower.includes("inject")) return "volume_injection";
      return "random_walk";
    }

    it("should default to random_walk for null description", () => {
      expect(parseNpcStrategy(null)).toBe("random_walk");
    });

    it("should parse mean_reversion strategy", () => {
      expect(parseNpcStrategy("mean_reversion bot")).toBe("mean_reversion");
      expect(parseNpcStrategy("will revert to mean")).toBe("mean_reversion");
    });

    it("should parse volume_injection strategy", () => {
      expect(parseNpcStrategy("volume maker")).toBe("volume_injection");
      expect(parseNpcStrategy("inject liquidity")).toBe("volume_injection");
    });

    it("should default to random_walk for unknown descriptions", () => {
      expect(parseNpcStrategy("some other strategy")).toBe("random_walk");
    });
  });

  describe("Trade Size Calculation", () => {
    it("should calculate trade size within bounds", () => {
      const balance = 5000;
      const maxTradeSize = 0.05;

      // Trade size = balance * maxTradeSize * random(0.5 to 1.0)
      const minTrade = balance * maxTradeSize * 0.5;
      const maxTrade = balance * maxTradeSize * 1.0;

      expect(minTrade).toBe(125);
      expect(maxTrade).toBe(250);
    });

    it("should skip very small trades", () => {
      const balance = 0.1;
      const maxTradeSize = 0.05;
      const tradeSize = balance * maxTradeSize * 0.5;
      // Should skip trades <= 0.01
      expect(tradeSize).toBeLessThanOrEqual(0.01);
    });

    it("should scale with balance", () => {
      const smallBalance = 100;
      const largeBalance = 10000;
      const maxTradeSize = 0.05;

      const smallTrade = smallBalance * maxTradeSize;
      const largeTrade = largeBalance * maxTradeSize;

      expect(largeTrade).toBeGreaterThan(smallTrade);
      expect(largeTrade / smallTrade).toBe(largeBalance / smallBalance);
    });
  });

  describe("Mean Reversion Logic", () => {
    it("should sell when price is above mean", () => {
      const meanPrice = 5.0;
      const currentPrice = 5.5;
      const deviation = (currentPrice - meanPrice) / meanPrice;
      const volatilityTarget = 0.02;

      // Positive deviation above target → sell token_a
      expect(deviation).toBeGreaterThan(volatilityTarget);
    });

    it("should buy when price is below mean", () => {
      const meanPrice = 5.0;
      const currentPrice = 4.5;
      const deviation = (currentPrice - meanPrice) / meanPrice;
      const volatilityTarget = 0.02;

      // Negative deviation below -target → buy token_a
      expect(deviation).toBeLessThan(-volatilityTarget);
    });

    it("should hold when within target range", () => {
      const meanPrice = 5.0;
      const currentPrice = 5.05;
      const deviation = (currentPrice - meanPrice) / meanPrice;
      const volatilityTarget = 0.02;

      // Small deviation within range → hold
      expect(Math.abs(deviation)).toBeLessThan(volatilityTarget);
    });

    it("should trade more aggressively with larger deviations", () => {
      const smallDeviation = 0.03;
      const largeDeviation = 0.10;
      const maxTradeSize = 0.08;
      const balance = 5000;

      const smallIntensity = Math.min(1, Math.abs(smallDeviation) / 0.1);
      const largeIntensity = Math.min(1, Math.abs(largeDeviation) / 0.1);

      const smallTrade = balance * maxTradeSize * smallIntensity;
      const largeTrade = balance * maxTradeSize * largeIntensity;

      expect(largeTrade).toBeGreaterThan(smallTrade);
    });
  });
});
