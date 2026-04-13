import { describe, it, expect } from "vitest";
import {
  SCT_CONTRACT_ADDRESS,
  USDT_CONTRACT_ADDRESS,
  RPC_URL,
  ARBITRUM_CHAIN_ID,
  SCT_ABI,
  USDT_ABI,
  TIERS,
} from "@/lib/contract";

describe("contract config", () => {
  it("exports USDT_CONTRACT_ADDRESS with correct default", () => {
    expect(USDT_CONTRACT_ADDRESS).toBe(
      "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
    );
  });

  it("exports RPC_URL with correct default", () => {
    expect(RPC_URL).toBe("https://arb1.arbitrum.io/rpc");
  });

  it("exports ARBITRUM_CHAIN_ID as 42161", () => {
    expect(ARBITRUM_CHAIN_ID).toBe(42161);
  });

  it("exports SCT_CONTRACT_ADDRESS as string", () => {
    expect(typeof SCT_CONTRACT_ADDRESS).toBe("string");
  });

  it("SCT_ABI includes balanceOf, wholeTokenBalance, approve, purchaseTokens, decimals", () => {
    const functionNames = SCT_ABI.filter(
      (item: { type: string }) => item.type === "function"
    ).map((item: { name: string }) => item.name);
    expect(functionNames).toContain("balanceOf");
    expect(functionNames).toContain("wholeTokenBalance");
    expect(functionNames).toContain("approve");
    expect(functionNames).toContain("purchaseTokens");
    expect(functionNames).toContain("decimals");
  });

  it("USDT_ABI includes approve, balanceOf, decimals", () => {
    const functionNames = USDT_ABI.filter(
      (item: { type: string }) => item.type === "function"
    ).map((item: { name: string }) => item.name);
    expect(functionNames).toContain("approve");
    expect(functionNames).toContain("balanceOf");
    expect(functionNames).toContain("decimals");
  });

  it("TIERS has exactly 3 purchase tiers", () => {
    expect(TIERS).toHaveLength(3);
  });

  it("TIERS match experiment.yaml purchase tiers", () => {
    expect(TIERS[0]).toMatchObject({
      tier: 1,
      usdtCost: 1,
      sctReceived: 1,
      label: "Starter",
    });
    expect(TIERS[1]).toMatchObject({
      tier: 10,
      usdtCost: 10,
      sctReceived: 20,
      label: "Pro (Popular)",
    });
    expect(TIERS[2]).toMatchObject({
      tier: 100,
      usdtCost: 100,
      sctReceived: 250,
      label: "Whale (Best Value)",
    });
  });
});
