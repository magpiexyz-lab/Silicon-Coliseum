-- Add payout_wallet to agents table for SOL reward distribution
ALTER TABLE agents ADD COLUMN IF NOT EXISTS payout_wallet TEXT;

-- Allow RLS: users can read payout_wallet on any agent (leaderboard display)
-- but only update their own agent's payout_wallet
