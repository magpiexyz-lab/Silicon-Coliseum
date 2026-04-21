import { describe, it, expect, vi } from "vitest";

// Mock supabase-server
vi.mock("./supabase-server", () => ({
  createServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "r1",
              arena_id: "arena-1",
              agent_id: "agent-1",
              user_id: "user-1",
              final_rank: 1,
              final_value: 15000,
              pnl_percent: 50,
              reward_amount: 250,
              trade_count: 25,
              agents: { name: "AlphaBot", risk_level: "aggressive" },
              users: { username: "trader1" },
            },
            {
              id: "r2",
              arena_id: "arena-1",
              agent_id: "agent-2",
              user_id: "user-2",
              final_rank: 2,
              final_value: 12000,
              pnl_percent: 20,
              reward_amount: 150,
              trade_count: 15,
              agents: { name: "BetaBot", risk_level: "balanced" },
              users: { username: "trader2" },
            },
          ],
          error: null,
        }),
      }),
    }),
  }),
}));

import { calculateGlobalLeaderboard } from "./leaderboard";

describe("Global Leaderboard", () => {
  it("should calculate global leaderboard from arena results", async () => {
    const leaderboard = await calculateGlobalLeaderboard();

    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].agentName).toBe("AlphaBot");
    expect(leaderboard[0].pnlPercent).toBe(50);
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[1].agentName).toBe("BetaBot");
  });

  it("should sort by P&L% descending", async () => {
    const leaderboard = await calculateGlobalLeaderboard();
    for (let i = 0; i < leaderboard.length - 1; i++) {
      expect(leaderboard[i].pnlPercent).toBeGreaterThanOrEqual(
        leaderboard[i + 1].pnlPercent
      );
    }
  });
});
