import type { TokenInfo, MarketData } from "./types";

const DEXSCREENER_SEARCH_URL = "https://api.dexscreener.com/latest/dex/search";
const STAGGER_MS = 200;

interface DexScreenerPair {
  baseToken: {
    symbol: string;
    name: string;
  };
  priceUsd: string;
  priceChange: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  volume: {
    h24?: number;
  };
  liquidity: {
    usd?: number;
  };
  marketCap?: number;
  fdv?: number;
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[] | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSingleToken(token: TokenInfo): Promise<MarketData | null> {
  try {
    const url = `${DEXSCREENER_SEARCH_URL}?q=${encodeURIComponent(token.searchQuery)}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `DexScreener error for ${token.symbol}: ${response.status}`
      );
      return null;
    }

    const data: DexScreenerResponse = await response.json();

    if (!data.pairs || data.pairs.length === 0) {
      console.warn(`No pairs found for ${token.symbol}`);
      return null;
    }

    // Filter by highest liquidity pair
    const bestPair = data.pairs.reduce((best, pair) => {
      const bestLiq = best.liquidity?.usd ?? 0;
      const pairLiq = pair.liquidity?.usd ?? 0;
      return pairLiq > bestLiq ? pair : best;
    }, data.pairs[0]);

    return {
      symbol: token.symbol,
      name: token.name,
      price: parseFloat(bestPair.priceUsd) || 0,
      priceChange5m: bestPair.priceChange?.m5 ?? 0,
      priceChange1h: bestPair.priceChange?.h1 ?? 0,
      priceChange6h: bestPair.priceChange?.h6 ?? 0,
      priceChange24h: bestPair.priceChange?.h24 ?? 0,
      volume24h: bestPair.volume?.h24 ?? 0,
      liquidity: bestPair.liquidity?.usd ?? 0,
      marketCap: bestPair.marketCap ?? 0,
      fdv: bestPair.fdv ?? 0,
    };
  } catch (error) {
    console.error(`Failed to fetch price for ${token.symbol}:`, error);
    return null;
  }
}

export async function fetchTokenPrices(
  tokens: TokenInfo[]
): Promise<Map<string, MarketData>> {
  const prices = new Map<string, MarketData>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const marketData = await fetchSingleToken(token);

    if (marketData) {
      prices.set(token.symbol, marketData);
    }

    // Stagger requests to avoid throttling (skip delay after last request)
    if (i < tokens.length - 1) {
      await sleep(STAGGER_MS);
    }
  }

  return prices;
}
