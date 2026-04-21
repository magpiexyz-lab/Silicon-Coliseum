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
  tokens: string[]; // Legacy — kept for backward compat
  is_active: boolean;
  personality: string | null;
  strategy_description: string | null;
  is_npc: boolean;
  created_at: string;
  // Joined fields
  username?: string;
}

// Holding from holdings table (unique agent_id + token) — legacy
export interface Holding {
  id: string;
  agent_id: string;
  token: string;
  amount: number;
  avg_buy_price: number;
}

// Trade from trades table — legacy
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
  raw_json: unknown;
  created_at: string;
}

// Share token from share_tokens table
export interface ShareToken {
  id: string;
  agent_id: string;
  token: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arena V2 Types
// ─────────────────────────────────────────────────────────────────────────────

// Virtual token on the platform
export interface PlatformToken {
  id: string;
  symbol: string;
  name: string;
  image_url: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

// Arena lifecycle phases
export type ArenaPhase = "prep" | "competition" | "challenge" | "rewards" | "closed";

// Arena status
export type ArenaStatus = "draft" | "active" | "completed" | "cancelled";

// Arena — competition instance
export interface Arena {
  id: string;
  name: string;
  description: string | null;
  status: ArenaStatus;
  phase: ArenaPhase;
  entry_fee: number;
  prize_pool: number;
  starting_balance: number;
  max_agents_per_user: number;
  competition_start: string | null;
  competition_end: string | null;
  challenge_end: string | null;
  decay_rate: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// AMM pool for token pair in an arena
export interface Pool {
  id: string;
  arena_id: string;
  token_a: string; // platform_token id
  token_b: string; // platform_token id
  reserve_a: number;
  reserve_b: number;
  fee_rate: number;
  total_volume: number;
  created_at: string;
  updated_at: string;
  // Joined
  token_a_symbol?: string;
  token_b_symbol?: string;
  token_a_name?: string;
  token_b_name?: string;
}

// Pool snapshot for price history
export interface PoolSnapshot {
  id: string;
  pool_id: string;
  price: number;
  reserve_a: number;
  reserve_b: number;
  volume: number;
  created_at: string;
}

// Agent registered in an arena
export interface ArenaEntry {
  id: string;
  arena_id: string;
  agent_id: string;
  user_id: string;
  is_npc: boolean;
  status: "registered" | "active" | "eliminated" | "finished";
  created_at: string;
}

// Per-agent per-token balance within an arena
export interface ArenaBalance {
  id: string;
  arena_id: string;
  agent_id: string;
  token_id: string; // platform_token id
  amount: number;
  updated_at: string;
  // Joined
  token_symbol?: string;
}

// Swap record in an arena
export interface ArenaTrade {
  id: string;
  arena_id: string;
  pool_id: string;
  agent_id: string;
  token_in: string; // platform_token id
  token_out: string; // platform_token id
  amount_in: number;
  amount_out: number;
  price: number;
  fee: number;
  reasoning: string | null;
  created_at: string;
  // Joined
  token_in_symbol?: string;
  token_out_symbol?: string;
}

// Final rankings per arena
export interface ArenaResult {
  id: string;
  arena_id: string;
  agent_id: string;
  user_id: string;
  final_rank: number;
  final_value: number;
  pnl_percent: number;
  reward_amount: number;
  trade_count: number;
  created_at: string;
  // Joined
  agent_name?: string;
  username?: string;
}

// Aggregated user stats
export interface UserProfile {
  id: string;
  user_id: string;
  total_arenas: number;
  wins: number;
  top3_finishes: number;
  best_pnl: number;
  total_trades: number;
  reputation: number;
  updated_at: string;
}

// AMM swap result
export interface SwapResult {
  amountOut: number;
  fee: number;
  priceImpact: number;
  executionPrice: number;
  newReserveIn: number;
  newReserveOut: number;
}

// NPC bot configuration
export interface NpcConfig {
  strategy: "random_walk" | "mean_reversion" | "volume_injection";
  tradeFrequency: number; // 0-1, probability of trading each tick
  maxTradeSize: number; // max % of balance to trade
  volatilityTarget: number; // target volatility for mean reversion
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Response types (updated for arena model)
// ─────────────────────────────────────────────────────────────────────────────

export interface ArenaTradeAction {
  pool_id: string;
  token_in: string; // token symbol
  token_out: string; // token symbol
  amount_in: number;
  reason: string;
}

export interface ArenaAIDecisionResponse {
  should_trade: boolean;
  reasoning: string;
  market_analysis: string;
  actions: ArenaTradeAction[];
}

// Leaderboard entry (arena-scoped)
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
  isNpc?: boolean;
}

// Pool analysis for AI context
export interface PoolAnalysis {
  poolId: string;
  tokenA: string;
  tokenB: string;
  currentPrice: number;
  priceChange1h: number;
  priceChange24h: number;
  momentum: number; // -1 to 1
  volatility: number;
  volume24h: number;
  liquidityDepth: number;
  narrative: string;
}

// Token info for the 12 supported meme tokens (legacy)
export interface TokenInfo {
  symbol: string;
  name: string;
  chain: string;
  searchQuery: string;
  icon?: string;
}

// Market data from DexScreener (legacy)
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

// Sentiment analysis result (legacy)
export interface SentimentData {
  token: string;
  sentimentScore: number;
  buzzLevel: number;
  keyThemes: string[];
  summary: string;
}

// AI decision response (legacy)
export interface AITradeAction {
  action: "BUY" | "SELL";
  token: string;
  amount_usd: number;
  confidence: number;
  urgency: "low" | "medium" | "high";
  reason: string;
}

export interface AIDecisionResponse {
  should_trade: boolean;
  reasoning: string;
  market_analysis: string;
  actions: AITradeAction[];
}
