-- ============================================================
-- Aloha Tran Home — Database Schema
-- Chạy file này trong Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone                   TEXT UNIQUE NOT NULL,
  password_hash           TEXT NOT NULL,
  role                    TEXT NOT NULL CHECK (role IN ('owner', 'tenant')),
  full_name               TEXT NOT NULL,
  push_subscription       TEXT,           -- JSON string của PushSubscription
  webauthn_credential_id  TEXT,           -- base64url encoded
  webauthn_public_key     TEXT,           -- base64url encoded
  webauthn_counter        INTEGER DEFAULT 0,
  webauthn_challenge      TEXT,           -- temporary, cleared after use
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Rooms ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,              -- e.g. "P101", "P201"
  floor      INTEGER NOT NULL,
  price      INTEGER NOT NULL,           -- VND per month
  status     TEXT NOT NULL DEFAULT 'vacant'
               CHECK (status IN ('vacant', 'occupied', 'maintenance')),
  tenant_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
    'payment_reminder',
    'payment_confirmed',
    'extension_request',
    'extension_approved',
    'extension_rejected'
  )),
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'read', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Push Subscriptions ────────────────────────────────────
-- One row per device (endpoint is unique per device)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- ─── Payments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  due_date   DATE NOT NULL,
  paid_date  DATE,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'overdue', 'extended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Messages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT,
  image_url   TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_recv ON messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(sender_id, receiver_id, created_at);
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rooms_tenant     ON rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifs_receiver  ON notifications(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifs_sender    ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_payments_room    ON payments(room_id);

-- ─── Row Level Security ─────────────────────────────────────
-- Disable RLS on all tables (we use service_role key from API routes)
ALTER TABLE users              DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms              DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments           DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages           DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED DATA — Xóa và tạo lại dữ liệu mẫu
-- Chạy script này SAU KHI đã tạo xong tables
-- Mật khẩu: 123456 cho cả 2 tài khoản
-- ============================================================

-- Xóa dữ liệu cũ (nếu có)
TRUNCATE TABLE payments, notifications, rooms, users CASCADE;

-- Tạo tài khoản chủ nhà: 0901000001 / 123456
INSERT INTO users (id, phone, password_hash, role, full_name) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '0901000001',
  -- bcrypt hash của '123456' với 10 rounds — generated by scripts/seed.ts
  '$2a$10$PLACEHOLDER_RUN_SEED_SCRIPT',
  'owner',
  'Minh Anh'
);

-- Tạo tài khoản khách thuê: 0901000002 / 123456
INSERT INTO users (id, phone, password_hash, role, full_name) VALUES
(
  '00000000-0000-0000-0000-000000000002',
  '0901000002',
  '$2a$10$PLACEHOLDER_RUN_SEED_SCRIPT',
  'tenant',
  'Anh Hùng'
);

-- Tạo 4 phòng (P201 cho Anh Hùng)
INSERT INTO rooms (name, floor, price, status, tenant_id) VALUES
('P101', 1, 3500000, 'vacant',   NULL),
('P102', 1, 3500000, 'vacant',   NULL),
('P201', 2, 4000000, 'occupied', '00000000-0000-0000-0000-000000000002'),
('P202', 2, 4000000, 'vacant',   NULL);

-- Tạo kỳ thanh toán cho P201 (tháng hiện tại)
INSERT INTO payments (room_id, amount, due_date, status)
SELECT id, 4000000,
       DATE_TRUNC('month', NOW()) + INTERVAL '5 days',
       'pending'
FROM rooms WHERE name = 'P201';

-- NOTE: Chạy `npm run seed` để tạo đúng hash mật khẩu!
-- Schema này chỉ tạo cấu trúc bảng. Seed script sẽ insert dữ liệu thật.
