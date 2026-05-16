-- ── migrations-v6.sql ────────────────────────────────────────
-- Soft delete + decoration id for community posts

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decoration_id INTEGER NOT NULL DEFAULT 12;

-- Index for fast filtering of non-deleted posts
CREATE INDEX IF NOT EXISTS idx_community_posts_deleted_at
  ON community_posts(deleted_at)
  WHERE deleted_at IS NULL;
