Migration v23 (T-043 chat nhóm) — apply qua Claude-for-Google.

Mở Supabase Studio → SQL Editor → paste từng block → Run.

[SQL-V23-1-START]
CREATE TABLE IF NOT EXISTS chat_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chat_groups_created_by ON chat_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_groups_active ON chat_groups(deleted_at) WHERE deleted_at IS NULL;
[SQL-V23-1-END]

[SQL-V23-2-START]
CREATE TABLE IF NOT EXISTS chat_group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at    TIMESTAMPTZ,
  UNIQUE (group_id, user_id, joined_at)
);
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_group_members_user ON chat_group_members(user_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_group ON chat_group_members(group_id) WHERE left_at IS NULL;
[SQL-V23-2-END]

[SQL-V23-3-START]
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE;
ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_target_check;
ALTER TABLE messages ADD CONSTRAINT messages_target_check CHECK (
  (receiver_id IS NOT NULL AND group_id IS NULL) OR
  (receiver_id IS NULL AND group_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id, created_at) WHERE group_id IS NOT NULL;
[SQL-V23-3-END]

Verify:

[SQL-V23-VERIFY-1-START]
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('chat_groups', 'chat_group_members') AND table_schema='public';
[SQL-V23-VERIFY-1-END]
-- Expect: 2 rows

[SQL-V23-VERIFY-2-START]
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name='messages' AND column_name IN ('receiver_id', 'group_id');
[SQL-V23-VERIFY-2-END]
-- Expect: receiver_id YES, group_id YES
