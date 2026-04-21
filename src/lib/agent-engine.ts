import OpenAI from "openai";
import { z } from "zod";
import type {
  Agent,
  ArenaBalance,
  Pool,
  PoolAnalysis,
  ArenaTrade,
  ArenaAIDecisionResponse,
} from "./types";
import { calculatePrice } from "./amm";

const cerebras = new OpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY || "",
});

const RISK_PROFILES: Record<Agent["risk_level"], string> = {
  conservative:
    "Focus on established pools, smaller positions (5-15% of balance), high confidence threshold. Only trade when signals are very strong. Prefer preservation of capital.",
  balanced:
    "Mix of pools, moderate positions (10-25% of balance), medium confidence threshold. Balance risk and reward across multiple pools.",
  aggressive:
    "Trend-chasing strategy, larger positions (15-40% of balance), lower confidence threshold. Trade frequently on momentum signals.",
  degen:
    "Maximum risk tolerance, massive positions (up to 50% of balance), trade on any signal. YOLO mentality. Chase the biggest movers.",
};

const ArenaTradeActionSchema = z.object({
  pool_id: z.string(),
  token_in: z.string(),
  token_out: z.string(),
  amount_in: z.number().positive(),
  reason: z.string(),
});

const ArenaAIDecisionSchema = z.object({
  should_trade: z.boolean(),
  reasoning: z.string(),
  market_analysis: z.string(),
  actions: z.array(ArenaTradeActionSchema),
});

function buildArenaPrompt(
  agent: Agent,
  balances: ArenaBalance[],
  pools: Pool[],
  poolAnalyses: PoolAnalysis[],
  recentTrades: ArenaTrade[],
  tokenSymbolMap: Map<string, string>
): string {
  // Format balances
  const balancesText = balances
    .filter((b) => b.amount > 0)
    .map((b) => {
      const symbol = tokenSymbolMap.get(b.token_id) || b.token_id;
      return `  - ${symbol}: ${b.amount.toFixed(4)}`;
    })
    .join("\n");

  // Format pools with prices
  const poolsText = pools
    .map((p) => {
      const price = calculatePrice(p.reserve_a, p.reserve_b);
      const symbolA = p.token_a_symbol || tokenSymbolMap.get(p.token_a) || "?";
      const symbolB = p.token_b_symbol || tokenSymbolMap.get(p.token_b) || "?";
      const analysis = poolAnalyses.find((a) => a.poolId === p.id);
      return `  - Pool ${p.id.slice(0, 8)}: ${symbolA}/${symbolB} | Price: ${price.toFixed(6)} | Reserves: ${p.reserve_a.toFixed(2)}/${p.reserve_b.toFixed(2)} | Fee: ${(p.fee_rate * 100).toFixed(1)}%${
        analysis
          ? ` | 1h: ${analysis.priceChange1h.toFixed(2)}% | 24h: ${analysis.priceChange24h.toFixed(2)}% | Momentum: ${analysis.momentum.toFixed(2)} | Vol: ${analysis.volume24h.toFixed(2)}`
          : ""
      }${analysis?.narrative ? `\n    Narrative: ${analysis.narrative}` : ""}`;
    })
    .join("\n");

  // Format recent trades
  const tradesText =
    recentTrades.length > 0
      ? recentTrades
          .slice(0, 10)
          .map((t) => {
            const inSym = tokenSymbolMap.get(t.token_in) || "?";
            const outSym = tokenSymbolMap.get(t.token_out) || "?";
            return `  - Swapped ${t.amount_in.toFixed(4)} ${inSym} -> ${t.amount_out.toFixed(4)} ${outSym} (price: ${t.price.toFixed(6)})`;
          })
          .join("\n")
      : "  None";

  // Build pool ID -> token info map for the AI
  const poolRef = pools
    .map((p) => {
      const symbolA = p.token_a_symbol || tokenSymbolMap.get(p.token_a) || "?";
      const symbolB = p.token_b_symbol || tokenSymbolMap.get(p.token_b) || "?";
      return `  ${p.id}: ${symbolA}(${p.token_a}) / ${symbolB}(${p.token_b})`;
    })
    .join("\n");

  return `You are an AI trading agent named "${agent.name}" competing in a virtual DeFi arena.
You trade in AMM liquidity pools using a constant product formula (x*y=k).

RISK PROFILE: ${agent.risk_level.toUpperCase()}
${RISK_PROFILES[agent.risk_level]}
${agent.personality ? `\nCUSTOM STRATEGY: ${agent.personality}` : ""}
${agent.strategy_description ? `\nSTRATEGY DESCRIPTION: ${agent.strategy_description}` : ""}

YOUR CURRENT BALANCES:
${balancesText || "  No balances"}

AVAILABLE POOLS:
${poolsText}

POOL REFERENCE (pool_id: tokenA(id) / tokenB(id)):
${poolRef}

RECENT TRADES (last 10):
${tradesText}

Based on the above data, decide whether to make any swaps. Consider:
1. Your risk profile and position sizing rules
2. Current balance allocation across tokens
3. Pool momentum and price trends
4. Volatility and trading volume
5. Recent trade history to avoid overtrading
6. Price impact — larger trades have more slippage in AMM pools
7. Diversification across multiple pools

Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "should_trade": <boolean>,
  "reasoning": "<your overall reasoning>",
  "market_analysis": "<brief market analysis>",
  "actions": [
    {
      "pool_id": "<pool UUID>",
      "token_in": "<token symbol you are selling>",
      "token_out": "<token symbol you are buying>",
      "amount_in": <amount of token_in to swap>,
      "reason": "<why this specific trade>"
    }
  ]
}

If you decide not to trade, set should_trade to false and actions to an empty array.
Only use pool IDs and token symbols from the data above.
Do not swap more than your current balance of any token.`;
}

export async function evaluateArenaAgent(
  agent: Agent,
  balances: ArenaBalance[],
  pools: Pool[],
  poolAnalyses: PoolAnalysis[],
  recentTrades: ArenaTrade[],
  tokenSymbolMap: Map<string, string>
): Promise<ArenaAIDecisionResponse> {
  try {
    const prompt = buildArenaPrompt(
      agent,
      balances,
      pools,
      poolAnalyses,
      recentTrades,
      tokenSymbolMap
    );

    const systemPrompt = agent.personality
      ? `You are an AI DeFi trading agent in a virtual arena. You make trading decisions by swapping tokens in AMM pools. ${agent.personality}`
      : "You are an AI DeFi trading agent in a virtual arena. You make trading decisions by swapping tokens in AMM pools. Respond only with valid JSON.";

    const response = await cerebras.chat.completions.create({
      model: "llama-3.3-70b",
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

    // Parse JSON response — handle potential markdown code blocks
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const validated = ArenaAIDecisionSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error(`Arena agent evaluation failed for ${agent.name}:`, error);
    return {
      should_trade: false,
      reasoning: "Failed to parse AI response",
      market_analysis: "",
      actions: [],
    };
  }
}
