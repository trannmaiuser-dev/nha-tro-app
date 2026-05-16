-- ── migrations-v4.sql ────────────────────────────────────────
-- Add status tracking + reply threads to community board

-- 1. Status columns on community_posts
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done')),
  ADD COLUMN IF NOT EXISTS done_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hidden_at  TIMESTAMPTZ;

-- 2. Reply threads
CREATE TABLE IF NOT EXISTS post_replies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES users(id),
  content    TEXT        NOT NULL,
  image_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_replies_post_id ON post_replies(post_id);
