import OpenAI from "openai";
import { createServiceClient } from "./supabase-server";
import { calculatePrice } from "./amm";
import type { Pool, PoolAnalysis, PoolSnapshot } from "./types";

const cerebras = new OpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY || "",
});

/**
 * Pool Analyzer — replaces sentiment.ts.
 * Analyzes pool data for AI agent context: momentum, volume, volatility.
 */

/**
 * Analyze a single pool and generate market narrative.
 */
export async function analyzePool(pool: Pool): Promise<PoolAnalysis> {
  const supabase = createServiceClient();

  // Fetch recent snapshots for momentum/volatility
  const { data: snapshots } = await supabase
    .from("pool_snapshots")
    .select("*")
    .eq("pool_id", pool.id)
    .order("created_at", { ascending: false })
    .limit(48); // ~48 hours of hourly snapshots

  const snapshotList = (snapshots || []) as PoolSnapshot[];

  const currentPrice = calculatePrice(pool.reserve_a, pool.reserve_b);

  // Calculate price changes from snapshots
  const priceChange1h = calculatePriceChange(snapshotList, 1);
  const priceChange24h = calculatePriceChange(snapshotList, 24);

  // Calculate momentum (-1 to 1)
  const momentum = calculateMomentum(snapshotList);

  // Calculate volatility
  const volatility = calculateVolatility(snapshotList);

  // Calculate recent volume
  const volume24h = calculateRecentVolume(snapshotList, 24);

  // Liquidity depth (geometric mean of reserves)
  const liquidityDepth = Math.sqrt(pool.reserve_a * pool.reserve_b);

  // Generate narrative via Cerebras
  const narrative = await generateNarrative(
    pool,
    currentPrice,
    priceChange1h,
    priceChange24h,
    momentum,
    volatility,
    volume24h
  );

  return {
    poolId: pool.id,
    tokenA: pool.token_a_symbol || pool.token_a,
    tokenB: pool.token_b_symbol || pool.token_b,
    currentPrice,
    priceChange1h,
    priceChange24h,
    momentum,
    volatility,
    volume24h,
    liquidityDepth,
    narrative,
  };
}

/**
 * Analyze all pools in an arena.
 */
export async function analyzeArenaPools(arenaId: string): Promise<PoolAnalysis[]> {
  const supabase = createServiceClient();

  const { data: pools } = await supabase
    .from("pools")
    .select(`
      *,
      token_a_ref:platform_tokens!pools_token_a_fkey(symbol, name),
      token_b_ref:platform_tokens!pools_token_b_fkey(symbol, name)
    `)
    .eq("arena_id", arenaId);

  if (!pools || pools.length === 0) return [];

  const analyses: PoolAnalysis[] = [];
  for (const p of pools) {
    const pool: Pool = {
      ...p,
      token_a_symbol: (p.token_a_ref as { symbol: string } | null)?.symbol,
      token_b_symbol: (p.token_b_ref as { symbol: string } | null)?.symbol,
      token_a_name: (p.token_a_ref as { name: string } | null)?.name,
      token_b_name: (p.token_b_ref as { name: string } | null)?.name,
    } as Pool;
    analyses.push(await analyzePool(pool));
  }

  return analyses;
}

function calculatePriceChange(snapshots: PoolSnapshot[], hoursAgo: number): number {
  if (snapshots.length < 2) return 0;

  const current = snapshots[0];
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  // Find closest snapshot to the cutoff
  const past = snapshots.find((s) => new Date(s.created_at) <= cutoff);
  if (!past || past.price === 0) return 0;

  return ((current.price - past.price) / past.price) * 100;
}

function calculateMomentum(snapshots: PoolSnapshot[]): number {
  if (snapshots.length < 3) return 0;

  // Simple momentum: weighted average of recent price changes
  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < Math.min(snapshots.length - 1, 12); i++) {
    const change = (snapshots[i].price - snapshots[i + 1].price) / snapshots[i + 1].price;
    const weight = 1 / (i + 1); // More recent = higher weight
    weightedSum += change * weight;
    weightTotal += weight;
  }

  // Normalize to [-1, 1]
  const raw = weightTotal > 0 ? weightedSum / weightTotal : 0;
  return Math.max(-1, Math.min(1, raw * 10)); // Scale up for sensitivity
}

function calculateVolatility(snapshots: PoolSnapshot[]): number {
  if (snapshots.length < 3) return 0;

  const returns: number[] = [];
  for (let i = 0; i < snapshots.length - 1; i++) {
    if (snapshots[i + 1].price > 0) {
      returns.push(
        Math.log(snapshots[i].price / snapshots[i + 1].price)
      );
    }
  }

  if (returns.length === 0) return 0;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance);
}

function calculateRecentVolume(snapshots: PoolSnapshot[], hoursAgo: number): number {
  if (snapshots.length < 2) return 0;

  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const recent = snapshots.filter((s) => new Date(s.created_at) >= cutoff);

  if (recent.length < 2) return 0;

  // Volume is cumulative in snapshots, so take difference between first and last
  const latest = recent[0];
  const earliest = recent[recent.length - 1];

  return Math.max(0, latest.volume - earliest.volume);
}

async function generateNarrative(
  pool: Pool,
  price: number,
  change1h: number,
  change24h: number,
  momentum: number,
  volatility: number,
  volume24h: number
): Promise<string> {
  try {
    const response = await cerebras.chat.completions.create({
      model: "llama-3.3-70b",
      temperature: 0.5,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            "You are a DeFi market analyst. Write a brief 1-2 sentence market narrative for the given pool data. Be concise and actionable.",
        },
        {
          role: "user",
          content: `Pool: ${pool.token_a_symbol}/${pool.token_b_symbol}
Price: ${price.toFixed(6)}
1h Change: ${change1h.toFixed(2)}%
24h Change: ${change24h.toFixed(2)}%
Momentum: ${momentum.toFixed(2)} (-1 bearish to +1 bullish)
Volatility: ${volatility.toFixed(4)}
24h Volume: ${volume24h.toFixed(2)}
Reserves: ${pool.reserve_a.toFixed(2)} / ${pool.reserve_b.toFixed(2)}

Write a brief market narrative.`,
        },
      ],
    });

    return response.choices[0]?.message?.content?.trim() || "No analysis available.";
  } catch {
    return "Market analysis unavailable.";
  }
}
