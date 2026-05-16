-- ============================================================
-- Migration v2: Quản lý hồ sơ khách thuê
-- Chạy file này trong Supabase SQL Editor
-- ============================================================

-- ─── Thêm cột vào bảng users ────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_login_token    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS first_login_expires  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_profile_complete  BOOLEAN DEFAULT FALSE;

-- ─── Tenant Profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name      TEXT,
  dob            DATE,
  gender         TEXT CHECK (gender IN ('male', 'female', 'other')),
  cccd_number    TEXT,
  address        TEXT,
  occupation     TEXT,
  avatar_url     TEXT,
  profile_status TEXT NOT NULL DEFAULT 'draft'
                   CHECK (profile_status IN ('draft', 'pending', 'confirmed')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tenant_profiles DISABLE ROW LEVEL SECURITY;

-- ─── Emergency Contacts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  gender       TEXT CHECK (gender IN ('male', 'female', 'other')),
  dob          DATE,
  phone        TEXT NOT NULL,
  address      TEXT NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE emergency_contacts DISABLE ROW LEVEL SECURITY;

-- ─── Related Persons ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS related_persons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL,
  avatar_url   TEXT,
  gender       TEXT,
  dob          DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE related_persons DISABLE ROW LEVEL SECURITY;

-- ─── Tenant Documents ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('cccd_front','cccd_back','contract','custom')),
  custom_name TEXT,
  file_url    TEXT NOT NULL,
  file_type   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tenant_documents DISABLE ROW LEVEL SECURITY;

-- ─── Owner Settings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS owner_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_related_persons INTEGER NOT NULL DEFAULT 5,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE owner_settings DISABLE ROW LEVEL SECURITY;

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_user ON tenant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_tenant     ON emergency_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_related_tenant       ON related_persons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant     ON tenant_documents(tenant_id);
