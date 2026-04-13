import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { SUPPORTED_TOKENS } from "@/lib/tokens";
import { fetchTokenPrices } from "@/lib/market";
import { analyzeSentiment } from "@/lib/sentiment";
import { evaluateAgent } from "@/lib/agent-engine";
import { executeTrades } from "@/lib/trade-executor";
import type { Agent, Holding, Trade, SentimentData } from "@/lib/types";

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a constant-time compare to avoid timing leaks on length
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b.padEnd(a.length, "\0").slice(0, a.length));
    require("crypto").timingSafeEqual(bufA, bufB);
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return require("crypto").timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  try {
    // Validate CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }

    // Check Authorization header or body for secret
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "") || "";

    if (!providedSecret || !timingSafeCompare(providedSecret, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch ALL active agents
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("*")
      .eq("is_active", true);

    if (agentsError) {
      console.error("Cron: failed to fetch agents:", agentsError);
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

    // Fetch market data ONCE for all tokens
    const prices = await fetchTokenPrices(SUPPORTED_TOKENS);

    // Analyze sentiment for all tokens ONCE
    const sentimentMap = new Map<string, SentimentData>();
    for (const token of SUPPORTED_TOKENS) {
      const marketData = prices.get(token.symbol);
      if (marketData) {
        const sentiment = await analyzeSentiment(token, marketData);
        sentimentMap.set(token.symbol, sentiment);
      }
    }

    const results = [];

    // Process each agent
    for (const agent of agents as Agent[]) {
      try {
        // Fetch holdings
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

        // Build filtered data for this agent's tokens
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

        // Store decision
        await supabase.from("decisions").insert({
          agent_id: agent.id,
          should_trade: decision.should_trade,
          reasoning: decision.reasoning,
          market_analysis: decision.market_analysis,
          raw_json: decision,
        });

        // Execute trades
        let executedTrades: Trade[] = [];
        if (decision.should_trade && decision.actions.length > 0) {
          executedTrades = await executeTrades(agent, decision.actions, prices);
        }

        results.push({
          agentId: agent.id,
          agentName: agent.name,
          shouldTrade: decision.should_trade,
          tradesExecuted: executedTrades.length,
        });
      } catch (agentError) {
        console.error(`Cron: failed to evaluate agent ${agent.id}:`, agentError);
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          error: "Evaluation failed",
          tradesExecuted: 0,
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${agents.length} agents`,
      results,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
