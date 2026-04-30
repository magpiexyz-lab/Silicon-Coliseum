import { describe, it, expect } from "vitest";
import { transformBetsResponse } from "./my-bets";

describe("transformBetsResponse", () => {
  it("transforms raw bet rows with agent join into MyBet format", () => {
    const rawBets = [
      {
        id: "bet-1",
        agent_id: "agent-1",
        agents: { name: "Warren Buffett AI" },
        cp_amount: 500,
        sol_amount: 0,
        bet_currency: "cp",
        status: "pending",
        created_at: "2026-04-29T10:00:00Z",
      },
    ];

    const result = transformBetsResponse(rawBets);

    expect(result).toEqual([
      {
        id: "bet-1",
        agentId: "agent-1",
        agentName: "Warren Buffett AI",
        cpAmount: 500,
        solAmount: 0,
        betCurrency: "cp",
        status: "pending",
        createdAt: "2026-04-29T10:00:00Z",
      },
    ]);
  });

  it("handles SOL bets with null cp_amount", () => {
    const rawBets = [
      {
        id: "bet-2",
        agent_id: "agent-2",
        agents: { name: "Elon Musk AI" },
        cp_amount: null,
        sol_amount: 100000000,
        bet_currency: "sol",
        status: "won",
        created_at: "2026-04-29T11:00:00Z",
      },
    ];

    const result = transformBetsResponse(rawBets);

    expect(result).toEqual([
      {
        id: "bet-2",
        agentId: "agent-2",
        agentName: "Elon Musk AI",
        cpAmount: 0,
        solAmount: 100000000,
        betCurrency: "sol",
        status: "won",
        createdAt: "2026-04-29T11:00:00Z",
      },
    ]);
  });

  it("returns empty array for empty input", () => {
    const result = transformBetsResponse([]);
    expect(result).toEqual([]);
  });

  it("handles missing agents join gracefully (fallback name)", () => {
    const rawBets = [
      {
        id: "bet-3",
        agent_id: "agent-3",
        agents: null,
        cp_amount: 100,
        sol_amount: 0,
        bet_currency: "cp",
        status: "lost",
        created_at: "2026-04-29T12:00:00Z",
      },
    ];

    const result = transformBetsResponse(rawBets);

    expect(result[0].agentName).toBe("Unknown Agent");
  });

  it("transforms multiple bets", () => {
    const rawBets = [
      {
        id: "bet-1",
        agent_id: "agent-1",
        agents: { name: "Agent A" },
        cp_amount: 200,
        sol_amount: 0,
        bet_currency: "cp",
        status: "pending",
        created_at: "2026-04-29T10:00:00Z",
      },
      {
        id: "bet-2",
        agent_id: "agent-2",
        agents: { name: "Agent B" },
        cp_amount: null,
        sol_amount: 50000000,
        bet_currency: "sol",
        status: "pending",
        created_at: "2026-04-29T10:30:00Z",
      },
    ];

    const result = transformBetsResponse(rawBets);

    expect(result).toHaveLength(2);
    expect(result[0].agentName).toBe("Agent A");
    expect(result[1].agentName).toBe("Agent B");
    expect(result[0].betCurrency).toBe("cp");
    expect(result[1].betCurrency).toBe("sol");
  });
});
