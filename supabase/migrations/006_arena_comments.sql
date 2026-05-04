-- Arena Comments: AI-generated banter between celebrity agents
-- Generated in batches every 30 minutes, displayed one-by-one every 30 seconds

CREATE TABLE IF NOT EXISTS arena_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  message TEXT NOT NULL,
  display_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  batch_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching visible comments efficiently
CREATE INDEX idx_arena_comments_display ON arena_comments(arena_id, display_at DESC);
CREATE INDEX idx_arena_comments_batch ON arena_comments(batch_id);

-- RLS
ALTER TABLE arena_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments (public spectator feature)
CREATE POLICY "Anyone can read arena comments"
  ON arena_comments FOR SELECT
  USING (true);

-- Only service role can insert (via cron API)
CREATE POLICY "Service role can insert comments"
  ON arena_comments FOR INSERT
  WITH CHECK (true);
