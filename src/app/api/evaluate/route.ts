import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { SUPPORTED_TOKENS, getTokenBySymbol } from "@/lib/tokens";
import { fetchTokenPrices } from "@/lib/market";
import { analyzeSentiment } from "@/lib/sentiment";
import { evaluateAgent } from "@/lib/agent-engine";
import { executeTrades } from "@/lib/trade-executor";
import type { Agent, Holding, Trade, SentimentData } from "@/lib/types";

async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch user's active agents
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", session.userId)
      .eq("is_active", true);

    if (agentsError) {
      console.error("Failed to fetch agents:", agentsError);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        message: "No active agents to evaluate",
        results: [],
      });
    }

    // Fetch market data for all tokens once
    const prices = await fetchTokenPrices(SUPPORTED_TOKENS);

    // Analyze sentiment for all tokens
    const sentimentMap = new Map<string, SentimentData>();
    for (const token of SUPPORTED_TOKENS) {
      const marketData = prices.get(token.symbol);
      if (marketData) {
        const sentiment = await analyzeSentiment(token, marketData);
        sentimentMap.set(token.symbol, sentiment);
      }
    }

    const results = [];

    for (const agent of agents as Agent[]) {
      // Fetch holdings for this agent
      const { data: holdings } = await supabase
        .from("holdings")
        .select("*")
        .eq("agent_id", agent.id);

      // Fetch recent trades
      const { data: recentTrades } = await supabase
        .from("trades")
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Build filtered market and sentiment data for this agent's tokens
      const agentPrices = new Map<string, typeof prices extends Map<string, infer V> ? V : never>();
      const agentSentiment = new Map<string, SentimentData>();

      for (const symbol of agent.tokens) {
        const p = prices.get(symbol);
        if (p) agentPrices.set(symbol, p);
        const s = sentimentMap.get(symbol);
        if (s) agentSentiment.set(symbol, s);
      }

      // Run AI evaluation
      const decision = await evaluateAgent(
        agent,
        (holdings || []) as Holding[],
        (recentTrades || []) as Trade[],
        agentPrices,
        agentSentiment
      );

      // Store the decision
      await supabase.from("decisions").insert({
        agent_id: agent.id,
        should_trade: decision.should_trade,
        reasoning: decision.reasoning,
        market_analysis: decision.market_analysis,
        raw_json: decision,
      });

      // Execute trades if the AI decided to trade
      let executedTrades: Trade[] = [];
      if (decision.should_trade && decision.actions.length > 0) {
        executedTrades = await executeTrades(agent, decision.actions, prices);
      }

      results.push({
        agentId: agent.id,
        agentName: agent.name,
        shouldTrade: decision.should_trade,
        reasoning: decision.reasoning,
        tradesExecuted: executedTrades.length,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Evaluation failed:", error);
    return NextResponse.json(
      { error: "Evaluation failed" },
      { status: 500 }
    );
  }
}
