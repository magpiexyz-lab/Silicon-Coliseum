-- ============================================================================
-- 005_solana_integration.sql — Solana blockchain integration
-- ============================================================================
-- Adds wallet addresses, SOL betting, dual-currency bets, arena betting phases,
-- CP purchasing, and reward tracking for Solana testnet integration.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Users: add wallet address
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address TEXT;
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address) WHERE wallet_address IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Arenas: add bet type lock and betting phase end
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE arenas ADD COLUMN IF NOT EXISTS bet_type TEXT NOT NULL DEFAULT 'both'
  CHECK (bet_type IN ('cp_only', 'sol_only', 'both'));
ALTER TABLE arenas ADD COLUMN IF NOT EXISTS betting_phase_end TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- Bets: add dual currency support
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE bets ADD COLUMN IF NOT EXISTS bet_currency TEXT NOT NULL DEFAULT 'cp'
  CHECK (bet_currency IN ('cp', 'sol'));
ALTER TABLE bets ADD COLUMN IF NOT EXISTS sol_amount BIGINT DEFAULT 0;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS tx_signature TEXT;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Make cp_amount nullable for SOL-only bets
ALTER TABLE bets ALTER COLUMN cp_amount DROP NOT NULL;
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_cp_amount_check;
ALTER TABLE bets ADD CONSTRAINT bets_amount_check
  CHECK (
    (bet_currency = 'cp' AND cp_amount > 0) OR
    (bet_currency = 'sol' AND sol_amount > 0)
  );

CREATE INDEX IF NOT EXISTS idx_bets_currency ON bets(arena_id, bet_currency);
CREATE INDEX IF NOT EXISTS idx_bets_tx ON bets(tx_signature) WHERE tx_signature IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- SOL Rewards: track on-chain reward distribution and claims
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sol_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  wallet_address TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('performer', 'bettor')),
  sol_amount BIGINT NOT NULL CHECK (sol_amount > 0), -- lamports
  is_claimed BOOLEAN DEFAULT false,
  claim_tx TEXT, -- on-chain claim transaction signature
  set_reward_tx TEXT, -- admin set_reward transaction signature
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ
);

ALTER TABLE sol_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sol_rewards_select_all" ON sol_rewards FOR SELECT USING (true);
CREATE POLICY "sol_rewards_insert_service" ON sol_rewards FOR INSERT WITH CHECK (true);
CREATE POLICY "sol_rewards_update_service" ON sol_rewards FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_sol_rewards_arena ON sol_rewards(arena_id);
CREATE INDEX IF NOT EXISTS idx_sol_rewards_user ON sol_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_sol_rewards_wallet ON sol_rewards(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sol_rewards_unclaimed ON sol_rewards(is_claimed) WHERE is_claimed = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- SOL Transactions: track all Solana transactions for verification
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sol_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  wallet_address TEXT NOT NULL,
  tx_signature TEXT UNIQUE NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('buy_cp', 'place_bet', 'cancel_bet', 'claim_reward')),
  sol_amount BIGINT NOT NULL, -- lamports
  cp_amount INTEGER, -- for buy_cp transactions
  arena_id UUID REFERENCES arenas(id),
  agent_id UUID REFERENCES agents(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sol_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sol_transactions_select_own" ON sol_transactions FOR SELECT USING (true);
CREATE POLICY "sol_transactions_insert_service" ON sol_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "sol_transactions_update_service" ON sol_transactions FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_sol_transactions_user ON sol_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sol_transactions_tx ON sol_transactions(tx_signature);
CREATE INDEX IF NOT EXISTS idx_sol_transactions_type ON sol_transactions(tx_type, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- CP Transactions: add new sources for SOL purchases and agent creation
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE cp_transactions DROP CONSTRAINT IF EXISTS cp_transactions_source_check;
ALTER TABLE cp_transactions ADD CONSTRAINT cp_transactions_source_check
  CHECK (source IN (
    'signup_bonus', 'arena_participation', 'arena_reward',
    'bet_placed', 'bet_payout', 'bet_refund', 'arena_owner_share',
    'sol_purchase', 'agent_creation'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- Arena Escrows: track on-chain escrow state
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arena_escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE UNIQUE NOT NULL,
  escrow_address TEXT NOT NULL, -- on-chain PDA address
  total_sol BIGINT NOT NULL DEFAULT 0, -- lamports in escrow
  bet_count INTEGER NOT NULL DEFAULT 0,
  is_betting_open BOOLEAN NOT NULL DEFAULT true,
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  fee_collected BIGINT NOT NULL DEFAULT 0,
  total_distributed BIGINT NOT NULL DEFAULT 0,
  create_tx TEXT, -- create_arena_escrow tx signature
  finalize_tx TEXT, -- finalize_arena tx signature
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE arena_escrows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_escrows_select_all" ON arena_escrows FOR SELECT USING (true);
CREATE POLICY "arena_escrows_insert_service" ON arena_escrows FOR INSERT WITH CHECK (true);
CREATE POLICY "arena_escrows_update_service" ON arena_escrows FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_arena_escrows_arena ON arena_escrows(arena_id);
