import type { MarketData, LeaderboardEntry } from "./types";
import { createServiceClient } from "./supabase-server";

export async function calculateLeaderboard(
  prices: Map<string, MarketData>
): Promise<LeaderboardEntry[]> {
  const supabase = createServiceClient();

  // Fetch all agents joined with users for username
  const { data: agents, error: agentsError } = await supabase
    .from("agents")
    .select("*, users!inner(username)");

  if (agentsError || !agents) {
    console.error("Failed to fetch agents for leaderboard:", agentsError);
    return [];
  }

  // Fetch all holdings
  const { data: holdings, error: holdingsError } = await supabase
    .from("holdings")
    .select("*");

  if (holdingsError) {
    console.error("Failed to fetch holdings for leaderboard:", holdingsError);
    return [];
  }

  // Fetch trade counts per agent
  const { data: tradeCounts, error: tradeCountsError } = await supabase
    .from("trades")
    .select("agent_id");

  if (tradeCountsError) {
    console.error("Failed to fetch trade counts:", tradeCountsError);
    return [];
  }

  // Build trade count map
  const tradeCountMap = new Map<string, number>();
  if (tradeCounts) {
    for (const trade of tradeCounts) {
      const count = tradeCountMap.get(trade.agent_id) || 0;
      tradeCountMap.set(trade.agent_id, count + 1);
    }
  }

  // Build holdings map: agent_id -> holdings[]
  const holdingsMap = new Map<string, typeof holdings>();
  if (holdings) {
    for (const holding of holdings) {
      const agentHoldings = holdingsMap.get(holding.agent_id) || [];
      agentHoldings.push(holding);
      holdingsMap.set(holding.agent_id, agentHoldings);
    }
  }

  // Calculate leaderboard entries
  const entries: LeaderboardEntry[] = agents.map((agent) => {
    const agentHoldings = holdingsMap.get(agent.id) || [];

    // Calculate holdings value using live prices
    const holdingsValue = agentHoldings.reduce((sum, holding) => {
      const marketData = prices.get(holding.token);
      const currentPrice = marketData?.price ?? 0;
      return sum + holding.amount * currentPrice;
    }, 0);

    const totalValue = holdingsValue + agent.current_balance;
    const pnlPercent =
      agent.initial_budget > 0
        ? ((totalValue - agent.initial_budget) / agent.initial_budget) * 100
        : 0;

    // Extract username from joined users table
    const username =
      (agent.users as unknown as { username: string })?.username ?? "Unknown";

    return {
      rank: 0, // Will be set after sorting
      agentId: agent.id,
      agentName: agent.name,
      ownerUsername: username,
      riskLevel: agent.risk_level,
      initialBudget: agent.initial_budget,
      totalValue,
      pnlPercent,
      tradeCount: tradeCountMap.get(agent.id) || 0,
    };
  });

  // Sort by P&L% descending
  entries.sort((a, b) => b.pnlPercent - a.pnlPercent);

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}
