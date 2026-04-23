-- ============================================================================
-- Migration 003: Persistent Agents
-- Makes agents reusable across arenas via a separate arena_entries table
-- ============================================================================

-- 1. Create arena_entries table (junction between agents and arenas)
CREATE TABLE IF NOT EXISTS arena_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  cash_balance NUMERIC NOT NULL DEFAULT 10000,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'finished')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(arena_id, agent_id)
);

CREATE INDEX idx_arena_entries_arena ON arena_entries(arena_id);
CREATE INDEX idx_arena_entries_agent ON arena_entries(agent_id);

-- Partial unique index: an agent can only be in ONE active arena at a time
CREATE UNIQUE INDEX idx_agent_one_active_arena
  ON arena_entries(agent_id)
  WHERE status = 'active';

-- 2. Migrate existing data from agents to arena_entries
INSERT INTO arena_entries (arena_id, agent_id, cash_balance, status)
SELECT arena_id, id, cash_balance, status
FROM agents
WHERE arena_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Alter agents table for persistent agents
ALTER TABLE agents
  ALTER COLUMN arena_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS total_arenas INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_pnl NUMERIC NOT NULL DEFAULT 0;

-- Drop the old unique constraint (user can have one agent per arena)
-- and add new one (user can't have duplicate agent names)
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_arena_id_user_id_key;

-- Add unique constraint on user_id + name (can't have two agents with the same name)
-- Use a conditional approach since the constraint might already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_user_id_name_key'
  ) THEN
    ALTER TABLE agents ADD CONSTRAINT agents_user_id_name_key UNIQUE(user_id, name);
  END IF;
END $$;

-- 4. RLS policies for arena_entries
ALTER TABLE arena_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_entries_public_read"
  ON arena_entries FOR SELECT
  USING (true);

CREATE POLICY "arena_entries_insert_own"
  ON arena_entries FOR INSERT
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY "arena_entries_service_update"
  ON arena_entries FOR UPDATE
  USING (current_setting('role', true) = 'service_role');

-- 5. Update agent stats from existing arena_results
UPDATE agents a SET
  total_arenas = COALESCE(sub.cnt, 0),
  total_wins = COALESCE(sub.wins, 0),
  best_pnl = COALESCE(sub.best, 0)
FROM (
  SELECT
    agent_id,
    COUNT(*) as cnt,
    COUNT(*) FILTER (WHERE final_rank = 1) as wins,
    MAX(pnl_percent) as best
  FROM arena_results
  GROUP BY agent_id
) sub
WHERE a.id = sub.agent_id;
