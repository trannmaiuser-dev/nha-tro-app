-- ============================================================
-- Migration v23: T-043 Chat nhóm (Group chat)
--
-- Requirements §3.6: "Chat nhóm: giữa chủ trọ và tất cả khách thuê"
--
-- (1) chat_groups — nhóm chat do owner tạo
-- (2) chat_group_members — thành viên (user_id) trong từng nhóm
--     left_at NULL = đang trong nhóm
-- (3) messages.group_id — FK to chat_groups, NULL cho tin nhắn 1-1
--     (giữ pattern receiver_id cho 1-1; group_id cho group)
-- (4) Indexes cho list + lookup
-- ============================================================

-- (1) chat_groups
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

-- (2) chat_group_members
CREATE TABLE IF NOT EXISTS chat_group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at    TIMESTAMPTZ,
  UNIQUE (group_id, user_id, joined_at)  -- cho phép re-join sau khi left
);
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_group_members_user ON chat_group_members(user_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_group ON chat_group_members(group_id) WHERE left_at IS NULL;

-- (3) messages.group_id
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE;

-- (3a) receiver_id giờ optional (NULL khi là group message)
ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;

-- (3b) Constraint: phải có EITHER receiver_id (1-1) OR group_id (group), không cả 2
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_target_check;
ALTER TABLE messages ADD CONSTRAINT messages_target_check CHECK (
  (receiver_id IS NOT NULL AND group_id IS NULL) OR
  (receiver_id IS NULL AND group_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id, created_at) WHERE group_id IS NOT NULL;
