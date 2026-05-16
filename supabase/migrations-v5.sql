-- ── migrations-v5.sql ────────────────────────────────────────
-- Add theme and font customization to community posts

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS theme_id   INTEGER     NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS font_style VARCHAR(20) NOT NULL DEFAULT 'normal';
