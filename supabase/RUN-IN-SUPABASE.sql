-- ============================================================
-- Chạy file này trong Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ① FIX COMMENT KHÔNG GỬI ĐƯỢC (quan trọng nhất)
-- post_replies bị thiếu DISABLE RLS từ migrations-v4
ALTER TABLE post_replies DISABLE ROW LEVEL SECURITY;

-- ② Bảng replies cho Xử lý sự cố (maintenance)
CREATE TABLE IF NOT EXISTS maintenance_replies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maint_replies_request ON maintenance_replies(request_id, created_at);
ALTER TABLE maintenance_replies DISABLE ROW LEVEL SECURITY;

-- ③ Bảng replies cho Cộng đồng chia sẻ (marketplace)
CREATE TABLE IF NOT EXISTS marketplace_replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES marketplace_posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_market_replies_post ON marketplace_replies(post_id, created_at);
ALTER TABLE marketplace_replies DISABLE ROW LEVEL SECURITY;

-- ④ Soft delete cho marketplace posts
ALTER TABLE marketplace_posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ⑤ Upgrade Events - response options + delete + tags
ALTER TABLE community_events
  ADD COLUMN IF NOT EXISTS response_option_yes VARCHAR DEFAULT 'Tham gia',
  ADD COLUMN IF NOT EXISTS response_option_no  VARCHAR DEFAULT 'Không tham gia',
  ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ;

-- ⑥ Bảng Event comments
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

-- ⑦ Bảng Event tags
CREATE TABLE IF NOT EXISTS event_tags (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(event_id, user_id)
);
ALTER TABLE event_tags DISABLE ROW LEVEL SECURITY;

-- ⑧ Refresh schema cache (quan trọng sau ALTER TABLE)
NOTIFY pgrst, 'reload schema';
