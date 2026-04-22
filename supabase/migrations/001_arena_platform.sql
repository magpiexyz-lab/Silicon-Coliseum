-- ============================================================================
-- 001_arena_platform.sql — Silicon Coliseum Arena Platform
-- ============================================================================
-- Complete schema for the arena-first AI trading platform.
-- Virtual tokens, AMM pools, time-bound arenas, betting, Coliseum Points.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: users — Email/social auth via Supabase Auth
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE, -- Supabase Auth user ID
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  cp_balance INTEGER NOT NULL DEFAULT 100, -- Starting Coliseum Points
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE
  USING (auth_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: platform_tokens — Virtual tokens (including vUSD)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE platform_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  is_base_currency BOOLEAN DEFAULT false, -- true for vUSD
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_tokens_select_all" ON platform_tokens FOR SELECT USING (true);
CREATE POLICY "platform_tokens_insert_admin" ON platform_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "platform_tokens_update_admin" ON platform_tokens FOR UPDATE USING (true);

-- Seed vUSD as base currency
INSERT INTO platform_tokens (symbol, name, description, is_base_currency)
VALUES ('vUSD', 'Virtual USD', 'Platform base stablecoin for all arena pricing', true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: arenas — Competition instances
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE arenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  starting_balance NUMERIC NOT NULL DEFAULT 10000,
  max_agents INTEGER NOT NULL DEFAULT 20,
  decay_rate NUMERIC NOT NULL DEFAULT 0.001, -- 0.1% per cycle
  competition_start TIMESTAMPTZ NOT NULL,
  competition_end TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arenas_select_all" ON arenas FOR SELECT USING (true);
CREATE POLICY "arenas_insert_admin" ON arenas FOR INSERT WITH CHECK (true);
CREATE POLICY "arenas_update_admin" ON arenas FOR UPDATE USING (true);

CREATE INDEX idx_arenas_status ON arenas(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: arena_tokens — Which tokens are in each arena
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE arena_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE NOT NULL,
  token_id UUID REFERENCES platform_tokens(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(arena_id, token_id)
);

ALTER TABLE arena_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_tokens_select_all" ON arena_tokens FOR SELECT USING (true);
CREATE POLICY "arena_tokens_insert_admin" ON arena_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "arena_tokens_delete_admin" ON arena_tokens FOR DELETE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: pools — AMM liquidity pools per arena (TOKEN/vUSD pairs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE NOT NULL,
  token_id UUID REFERENCES platform_tokens(id) NOT NULL, -- The non-vUSD token
  base_token_id UUID REFERENCES platform_tokens(id) NOT NULL, -- vUSD
  reserve_token NUMERIC NOT NULL DEFAULT 0, -- Amount of TOKEN
  reserve_base NUMERIC NOT NULL DEFAULT 0, -- Amount of vUSD
  fee_rate NUMERIC NOT NULL DEFAULT 0.003, -- 0.3%
  total_volume NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(arena_id, token_id)
);

ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pools_select_all" ON pools FOR SELECT USING (true);
CREATE POLICY "pools_insert_admin" ON pools FOR INSERT WITH CHECK (true);
CREATE POLICY "pools_update_service" ON pools FOR UPDATE USING (true);

CREATE INDEX idx_pools_arena ON pools(arena_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: pool_snapshots — Price history for charts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE pool_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES pools(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC NOT NULL,
  reserve_token NUMERIC NOT NULL,
  reserve_base NUMERIC NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pool_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pool_snapshots_select_all" ON pool_snapshots FOR SELECT USING (true);
CREATE POLICY "pool_snapshots_insert_service" ON pool_snapshots FOR INSERT WITH CHECK (true);

CREATE INDEX idx_pool_snapshots_pool_created ON pool_snapshots(pool_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: agents — AI agents scoped to arenas
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('conservative', 'balanced', 'aggressive', 'degen')),
  strategy_description TEXT,
  cash_balance NUMERIC NOT NULL DEFAULT 0, -- vUSD cash (set to arena starting_balance on entry)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'finished')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(arena_id, user_id) -- 1 agent per user per arena
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_select_all" ON agents FOR SELECT USING (true);
CREATE POLICY "agents_insert_own" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "agents_update_service" ON agents FOR UPDATE USING (true);

CREATE INDEX idx_agents_arena ON agents(arena_id);
CREATE INDEX idx_agents_user ON agents(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: arena_balances — Per-agent per-token holdings within an arena
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE arena_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  token_id UUID REFERENCES platform_tokens(id) NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(arena_id, agent_id, token_id)
);

ALTER TABLE arena_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_balances_select_all" ON arena_balances FOR SELECT USING (true);
CREATE POLICY "arena_balances_insert_service" ON arena_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "arena_balances_update_service" ON arena_balances FOR UPDATE USING (true);

CREATE INDEX idx_arena_balances_arena_agent ON arena_balances(arena_id, agent_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: arena_trades — Swap records
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE arena_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE NOT NULL,
  pool_id UUID REFERENCES pools(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
  token_id UUID REFERENCES platform_tokens(id) NOT NULL,
  amount_in NUMERIC NOT NULL,
  amount_out NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE arena_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_trades_select_all" ON arena_trades FOR SELECT USING (true);
CREATE POLICY "arena_trades_insert_service" ON arena_trades FOR INSERT WITH CHECK (true);

CREATE INDEX idx_arena_trades_arena ON arena_trades(arena_id, created_at DESC);
CREATE INDEX idx_arena_trades_agent ON arena_trades(agent_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: arena_results — Final rankings and rewards
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE arena_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  final_rank INTEGER NOT NULL,
  final_value NUMERIC NOT NULL,
  pnl_percent NUMERIC NOT NULL,
  reward_cp INTEGER NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(arena_id, agent_id)
);

ALTER TABLE arena_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_results_select_all" ON arena_results FOR SELECT USING (true);
CREATE POLICY "arena_results_insert_service" ON arena_results FOR INSERT WITH CHECK (true);

CREATE INDEX idx_arena_results_arena ON arena_results(arena_id, final_rank);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: bets — Spectator bets on arena outcomes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  cp_amount INTEGER NOT NULL CHECK (cp_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'won', 'lost')),
  payout INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bets_select_all" ON bets FOR SELECT USING (true);
CREATE POLICY "bets_insert_own" ON bets FOR INSERT WITH CHECK (true);
CREATE POLICY "bets_update_service" ON bets FOR UPDATE USING (true);

CREATE INDEX idx_bets_arena ON bets(arena_id);
CREATE INDEX idx_bets_user ON bets(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: cp_transactions — Coliseum Points ledger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE cp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  amount INTEGER NOT NULL, -- positive = earn, negative = spend
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'payout')),
  source TEXT NOT NULL CHECK (source IN (
    'signup_bonus', 'arena_participation', 'arena_reward',
    'bet_placed', 'bet_payout', 'bet_refund'
  )),
  arena_id UUID REFERENCES arenas(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_transactions_select_own" ON cp_transactions FOR SELECT
  USING (true);
CREATE POLICY "cp_transactions_insert_service" ON cp_transactions FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_cp_transactions_user ON cp_transactions(user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: user_profiles — Aggregated stats
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  total_arenas INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  top3_finishes INTEGER NOT NULL DEFAULT 0,
  best_pnl NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_all" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "user_profiles_insert_service" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "user_profiles_update_service" ON user_profiles FOR UPDATE USING (true);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
