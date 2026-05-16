-- ── migrations-v9.sql ─────────────────────────────────────────
-- Hero Teams feature

CREATE TABLE IF NOT EXISTS hero_teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_type  VARCHAR NOT NULL CHECK (team_type IN ('fire','repair','cleaning')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE hero_teams DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS hero_team_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID NOT NULL REFERENCES hero_teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  role      VARCHAR NOT NULL DEFAULT 'member' CHECK (role IN ('leader','member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE hero_team_members DISABLE ROW LEVEL SECURITY;

-- Create the 3 default teams
INSERT INTO hero_teams (team_type) VALUES
  ('fire'), ('repair'), ('cleaning')
ON CONFLICT DO NOTHING;
