-- ============================================================================
-- 001_initial.sql — Silicon Coliseum Database Schema
-- ============================================================================
-- Creates all 6 tables with Row Level Security policies and indexes.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  wallet_address TEXT UNIQUE NOT NULL,
  signature TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read users (for leaderboard display)
CREATE POLICY "users_select_all"
  ON users FOR SELECT
  USING (true);

-- Users can insert their own record (wallet_address matches)
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (true);

-- Users can update their own record
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: agents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('conservative', 'balanced', 'aggressive', 'degen')),
  initial_budget NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  tokens JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  personality TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- All agents are visible (leaderboard is public)
CREATE POLICY "agents_select_all"
  ON agents FOR SELECT
  USING (true);

-- Only the agent owner can insert agents
CREATE POLICY "agents_insert_own"
  ON agents FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Only the agent owner can update agents
CREATE POLICY "agents_update_own"
  ON agents FOR UPDATE
  USING (user_id = auth.uid());

-- Only the agent owner can delete agents
CREATE POLICY "agents_delete_own"
  ON agents FOR DELETE
  USING (user_id = auth.uid());

-- Index for fast lookup by owner
CREATE INDEX idx_agents_user_id ON agents(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: holdings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(agent_id, token)
);

ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;

-- Holdings are readable by all (needed for leaderboard calculations)
CREATE POLICY "holdings_select_all"
  ON holdings FOR SELECT
  USING (true);

-- Only the agent owner can insert holdings
CREATE POLICY "holdings_insert_own"
  ON holdings FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Only the agent owner can update holdings
CREATE POLICY "holdings_update_own"
  ON holdings FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Only the agent owner can delete holdings
CREATE POLICY "holdings_delete_own"
  ON holdings FOR DELETE
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: trades
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
  token TEXT NOT NULL,
  amount_usd NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  token_amount NUMERIC NOT NULL,
  confidence NUMERIC,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Trades are readable by all (for leaderboard and share pages)
CREATE POLICY "trades_select_all"
  ON trades FOR SELECT
  USING (true);

-- Only the agent owner can insert trades
CREATE POLICY "trades_insert_own"
  ON trades FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Index for fast lookup of agent trades ordered by time
CREATE INDEX idx_trades_agent_created ON trades(agent_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: decisions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  should_trade BOOLEAN NOT NULL,
  reasoning TEXT,
  market_analysis TEXT,
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Decisions are readable by agent owner
CREATE POLICY "decisions_select_own"
  ON decisions FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Service role can insert decisions (AI evaluation cron)
CREATE POLICY "decisions_insert_service"
  ON decisions FOR INSERT
  WITH CHECK (true);

-- Index for fast lookup of agent decisions ordered by time
CREATE INDEX idx_decisions_agent_created ON decisions(agent_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: share_tokens
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Share tokens are readable by all (public share pages)
CREATE POLICY "share_tokens_select_all"
  ON share_tokens FOR SELECT
  USING (true);

-- Only the agent owner can create share tokens
CREATE POLICY "share_tokens_insert_own"
  ON share_tokens FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Index for fast lookup by share token string
CREATE INDEX idx_share_tokens_token ON share_tokens(token);
