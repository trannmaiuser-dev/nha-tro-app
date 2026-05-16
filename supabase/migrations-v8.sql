-- ── migrations-v8.sql ────────────────────────────────────────
-- Fix RLS on post_replies + Events upgrade + Comment threads

-- ① FIX: post_replies was missing RLS disable (blocked all inserts)
ALTER TABLE post_replies DISABLE ROW LEVEL SECURITY;

-- ② Events: response options + soft delete
ALTER TABLE community_events
  ADD COLUMN IF NOT EXISTS response_option_yes VARCHAR DEFAULT 'Tham gia',
  ADD COLUMN IF NOT EXISTS response_option_no  VARCHAR DEFAULT 'Không tham gia',
  ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS creator_id_ref      UUID; -- already exists as creator_id, skip if error

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON community_events(deleted_at) WHERE deleted_at IS NULL;

-- ③ Event comments
CREATE TABLE IF NOT EXISTS event_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  image_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_comments_event ON event_comments(event_id, created_at);
ALTER TABLE event_comments DISABLE ROW LEVEL SECURITY;

-- ④ Event tags (tag specific users)
CREATE TABLE IF NOT EXISTS event_tags (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(event_id, user_id)
);
ALTER TABLE event_tags DISABLE ROW LEVEL SECURITY;

-- ⑤ maintenance_replies + marketplace_replies RLS (in case missed)
ALTER TABLE maintenance_replies  DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_replies  DISABLE ROW LEVEL SECURITY;
