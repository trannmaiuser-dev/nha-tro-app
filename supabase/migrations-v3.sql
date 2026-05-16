-- ============================================================
-- Migration v3: Community features
-- ============================================================

CREATE TABLE IF NOT EXISTS community_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  image_url   TEXT,
  visibility  TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_author   ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_pinned   ON community_posts(is_pinned, created_at);
ALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS post_reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('👍','❤️','😂','😮')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON post_reactions(post_id);
ALTER TABLE post_reactions DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS post_tags (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, tagged_user_id)
);
ALTER TABLE post_tags DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  image_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done')),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance_requests(status, created_at);
ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS marketplace_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('give','roommate','borrow')),
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE marketplace_posts DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS community_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE community_events DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS event_responses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response   TEXT NOT NULL CHECK (response IN ('yes','no')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE event_responses DISABLE ROW LEVEL SECURITY;
