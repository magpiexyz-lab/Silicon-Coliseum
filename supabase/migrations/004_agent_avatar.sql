-- ============================================================================
-- Migration 004: Agent Avatar URL
-- Adds optional avatar_url column to agents table for profile pictures
-- ============================================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS avatar_url TEXT;
