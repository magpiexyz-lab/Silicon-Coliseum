import OpenAI from "openai";
import { z } from "zod";
import type {
  Agent,
  Holding,
  Trade,
  MarketData,
  SentimentData,
  AIDecisionResponse,
} from "./types";

const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

const RISK_PROFILES: Record<Agent["risk_level"], string> = {
  conservative:
    "Focus on established tokens, smaller positions (5-15% of budget), high confidence threshold (0.7+). Only trade when signals are very strong. Prefer preservation of capital.",
  balanced:
    "Mix of established and trending tokens, moderate positions (10-25% of budget), medium confidence threshold (0.5+). Balance risk and reward.",
  aggressive:
    "Trend-chasing strategy, larger positions (15-40% of budget), lower confidence threshold (0.3+). Trade frequently on momentum signals.",
  degen:
    "Maximum risk tolerance, massive positions (up to 50% of budget), trade on any signal. YOLO mentality. Chase the biggest movers regardless of risk.",
};

const AITradeActionSchema = z.object({
  action: z.enum(["BUY", "SELL"]),
  token: z.string(),
  amount_usd: z.number().positive(),
  confidence: z.number().min(0).max(1),
  urgency: z.enum(["low", "medium", "high"]),
  reason: z.string(),
});

const AIDecisionSchema = z.object({
  should_trade: z.boolean(),
  reasoning: z.string(),
  market_analysis: z.string(),
  actions: z.array(AITradeActionSchema),
});

function buildPrompt(
  agent: Agent,
  holdings: Holding[],
  recentTrades: Trade[],
  marketData: Map<string, MarketData>,
  sentimentData: Map<string, SentimentData>
): string {
  const holdingsText = holdings
    .map((h) => {
      const price = marketData.get(h.token)?.price ?? 0;
      const value = h.amount * price;
      const pnl =
        h.avg_buy_price > 0
          ? ((price - h.avg_buy_price) / h.avg_buy_price) * 100
          : 0;
      return `  - ${h.token}: ${h.amount.toFixed(6)} tokens, avg buy $${h.avg_buy_price.toFixed(6)}, current $${price.toFixed(6)}, value $${value.toFixed(2)}, P&L ${pnl.toFixed(2)}%`;
    })
    .join("\n");

  const marketText = agent.tokens
    .map((symbol) => {
      const md = marketData.get(symbol);
      const sd = sentimentData.get(symbol);
      if (!md) return `  - ${symbol}: No market data available`;
      return `  - ${symbol}: $${md.price.toFixed(6)} | 5m: ${md.priceChange5m}% | 1h: ${md.priceChange1h}% | 6h: ${md.priceChange6h}% | 24h: ${md.priceChange24h}% | Vol: $${md.volume24h.toLocaleString()} | Liq: $${md.liquidity.toLocaleString()} | Sentiment: ${sd?.sentimentScore?.toFixed(2) ?? "N/A"} | Buzz: ${sd?.buzzLevel ?? "N/A"}/10 | Themes: ${sd?.keyThemes?.join(", ") ?? "N/A"}`;
    })
    .join("\n");

  const recentTradesText =
    recentTrades.length > 0
      ? recentTrades
          .slice(0, 10)
          .map(
            (t) =>
              `  - ${t.action} ${t.token}: $${t.amount_usd.toFixed(2)} at $${t.price.toFixed(6)} (confidence: ${t.confidence.toFixed(2)})`
          )
          .join("\n")
      : "  None";

  return `You are an AI trading agent named "${agent.name}" managing a paper trading portfolio.

RISK PROFILE: ${agent.risk_level.toUpperCase()}
${RISK_PROFILES[agent.risk_level]}

CURRENT PORTFOLIO STATE:
- Cash Balance: $${agent.current_balance.toFixed(2)}
- Initial Budget: $${agent.initial_budget.toFixed(2)}
- Watchlist Tokens: ${agent.tokens.join(", ")}

CURRENT HOLDINGS:
${holdingsText || "  None (all cash)"}

MARKET DATA & SENTIMENT:
${marketText}

RECENT TRADES (last 10):
${recentTradesText}

Based on the above data, decide whether to make any trades. Consider:
1. Your risk profile and position sizing rules
2. Current portfolio allocation and diversification
3. Market momentum (price changes across timeframes)
4. Sentiment analysis scores and themes
5. Recent trade history to avoid overtrading
6. Available cash for new positions

Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "should_trade": <boolean>,
  "reasoning": "<your overall reasoning>",
  "market_analysis": "<brief market analysis>",
  "actions": [
    {
      "action": "BUY" or "SELL",
      "token": "<token symbol>",
      "amount_usd": <dollar amount>,
      "confidence": <0 to 1>,
      "urgency": "low" | "medium" | "high",
      "reason": "<why this specific trade>"
    }
  ]
}

If you decide not to trade, set should_trade to false and actions to an empty array.
Only include tokens from the watchlist: ${agent.tokens.join(", ")}.
For SELL actions, only sell tokens you currently hold.
For BUY actions, do not exceed the available cash balance of $${agent.current_balance.toFixed(2)}.`;
}

export async function evaluateAgent(
  agent: Agent,
  holdings: Holding[],
  recentTrades: Trade[],
  marketData: Map<string, MarketData>,
  sentimentData: Map<string, SentimentData>
): Promise<AIDecisionResponse> {
  try {
    const prompt = buildPrompt(
      agent,
      holdings,
      recentTrades,
      marketData,
      sentimentData
    );

    const systemPrompt = agent.personality
      ? `You are an AI crypto trading agent. You make paper trading decisions based on market data and sentiment. ${agent.personality}`
      : "You are an AI crypto trading agent. You make paper trading decisions based on market data and sentiment. Respond only with valid JSON.";

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Try to parse JSON response - handle potential markdown code blocks
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const validated = AIDecisionSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error(`Agent evaluation failed for ${agent.name}:`, error);
    return {
      should_trade: false,
      reasoning: "Failed to parse AI response",
      market_analysis: "",
      actions: [],
    };
  }
}
