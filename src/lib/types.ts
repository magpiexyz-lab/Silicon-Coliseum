// User from Supabase users table
export interface User {
  id: string;
  username: string;
  wallet_address: string;
  signature: string;
  message: string;
  created_at: string;
}

// Agent from agents table
export interface Agent {
  id: string;
  user_id: string;
  name: string;
  risk_level: "conservative" | "balanced" | "aggressive" | "degen";
  initial_budget: number;
  current_balance: number;
  tokens: string[]; // JSON array of token symbols
  is_active: boolean;
  personality: string | null;
  created_at: string;
  // Joined fields
  username?: string;
}

// Holding from holdings table (unique agent_id + token)
export interface Holding {
  id: string;
  agent_id: string;
  token: string;
  amount: number;
  avg_buy_price: number;
}

// Trade from trades table
export interface Trade {
  id: string;
  agent_id: string;
  action: "BUY" | "SELL";
  token: string;
  amount_usd: number;
  price: number;
  token_amount: number;
  confidence: number;
  reasoning: string;
  created_at: string;
}

// AI Decision from decisions table
export interface Decision {
  id: string;
  agent_id: string;
  should_trade: boolean;
  reasoning: string;
  market_analysis: string;
  raw_json: any;
  created_at: string;
}

// Share token from share_tokens table
export interface ShareToken {
  id: string;
  agent_id: string;
  token: string;
  created_at: string;
}

// Token info for the 12 supported meme tokens
export interface TokenInfo {
  symbol: string;
  name: string;
  chain: string;
  searchQuery: string; // DexScreener search query
  icon?: string;
}

// Market data from DexScreener
export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
}

// Sentiment analysis result
export interface SentimentData {
  token: string;
  sentimentScore: number; // -1.0 to 1.0
  buzzLevel: number; // 0-10
  keyThemes: string[];
  summary: string;
}

// AI decision response
export interface AITradeAction {
  action: "BUY" | "SELL";
  token: string;
  amount_usd: number;
  confidence: number; // 0-1
  urgency: "low" | "medium" | "high";
  reason: string;
}

export interface AIDecisionResponse {
  should_trade: boolean;
  reasoning: string;
  market_analysis: string;
  actions: AITradeAction[];
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  ownerUsername: string;
  riskLevel: Agent["risk_level"];
  initialBudget: number;
  totalValue: number;
  pnlPercent: number;
  tradeCount: number;
}
