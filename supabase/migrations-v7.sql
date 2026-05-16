-- ── migrations-v7.sql ────────────────────────────────────────
-- Maintenance replies, marketplace replies + soft delete

-- Replies for maintenance requests
CREATE TABLE IF NOT EXISTS maintenance_replies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  author_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maint_replies_request ON maintenance_replies(request_id, created_at);
ALTER TABLE maintenance_replies DISABLE ROW LEVEL SECURITY;

-- Replies for marketplace posts
CREATE TABLE IF NOT EXISTS marketplace_replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES marketplace_posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_market_replies_post ON marketplace_replies(post_id, created_at);
ALTER TABLE marketplace_replies DISABLE ROW LEVEL SECURITY;

-- Soft delete for marketplace posts
ALTER TABLE marketplace_posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_marketplace_deleted_at
  ON marketplace_posts(deleted_at)
  WHERE deleted_at IS NULL;
