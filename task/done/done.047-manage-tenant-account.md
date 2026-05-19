# T-047 — Owner manage tenant account: disable / delete / reactivate

## P — Plan

**Why**: User feedback EOD 2026-05-19:
> "cần chức năng để chủ quản lý account, có thể disable, xóa, reactive account của khách"

D3 quyết định: **soft-only**.
- **Disable** = `users.locked_at TIMESTAMPTZ` IS NOT NULL → block login, giữ data
- **Reactivate** = `users.locked_at = NULL`
- **Delete** = `tenant_status = 'archived'` (giá trị enum đã có từ v11) — giữ data 2 năm theo UC-07

**Scope**:
- Migration v25: thêm `users.locked_at` + `users.locked_reason`
- Login check: nếu locked_at IS NOT NULL → reject với thông báo "Tài khoản đang tạm khóa"
- UI: dropdown menu 3 action trong header TenantSummaryPage (owner only)
- Confirm modal trước khi disable/archive (destructive)
- Hiển thị badge "🔒 Tạm khóa" / "📦 Đã lưu trữ" trên TenantSummaryPage nếu locked

**Out of scope**:
- Hard delete (D3 chốt soft-only)
- Filter tenant list — defer cho T-047b nếu cần
- Email/SMS notify khách khi disable — defer

## D — Do

1. `supabase/migrations-v25.sql` — ALTER TABLE users ADD locked_at + locked_reason
2. `lib/db/tenants.ts` — helpers `lockTenant`, `unlockTenant`, `archiveTenant`
3. `app/api/admin/tenants/[userId]/lock/route.ts` — POST { locked: bool, reason?: string }
4. `app/api/admin/tenants/[userId]/archive/route.ts` — POST archive
5. `app/api/auth/login/route.ts` — sau verify password check `user.locked_at`
6. `components/TenantSummaryPage.tsx` — thêm "⋮" menu + ConfirmDialog + badge locked
7. tsc + build

## C — Check

- tsc + build pass
- Audit:
  - SA1: revalidatePath /profile/[userId], /admin/tenants
  - SA2: paths exist
  - SC1: page có force-dynamic (existing)

## E — Phase E

⚠️ Migration v25 PENDING APPLY. Phase E manual sau khi user apply migration:
1. Apply v25 SQL qua Supabase Studio
2. Login owner → /profile/[tenantId] → menu ⋮ → "Tạm khóa"
3. Logout, login với phone tenant đó → expect "Tài khoản đang tạm khóa"
4. Owner reactivate → tenant login lại được
5. Owner archive → tenant_status='archived' (verify SQL)

## A — Act

### Bài học rút ra

- **[CODE]** Khi code cần column mới (locked_at), DELIVER cả migration file + login check + UI cùng commit. KHÔNG split — risk runtime bug khi merge một phần.
- **[CODE]** Login check thứ tự: (1) phone exists, (2) password valid, (3) locked_at NULL, (4) tenant_status không 'archived'. Sai thứ tự lộ thông tin (vd check lock trước password → leak ai bị khóa).
- **[CODE]** "Disable" dùng TIMESTAMPTZ thay BOOLEAN — cho audit "khóa từ bao giờ" tự nhiên qua data type, không cần column timestamp riêng.
- **[CODE]** Soft delete = `tenant_status='archived'` + end `room_tenants.left_at` cùng transaction — tránh ghost membership rooms khi archive.

(Tất cả CODE, auto-approve.)

### Files

- `supabase/migrations-v25.sql` (new — ALTER users + index)
- `app/api/admin/tenants/[userId]/lock/route.ts` (new — POST lock/unlock)
- `app/api/admin/tenants/[userId]/archive/route.ts` (new — POST archive)
- `app/api/auth/login/route.ts` (edit — check locked_at + archived)
- `app/profile/[userId]/page.tsx` (edit — fetch locked_at + locked_reason)
- `components/TenantSummaryPage.tsx` (edit — menu ⋮ + ConfirmDialog + badges)

### ⚠️ KHÔNG MERGE TRƯỚC KHI APPLY MIGRATION V25

Code reference `users.locked_at` + `users.locked_reason` — chưa apply v25 sẽ
crash `/profile/[userId]` page với column-not-found. Pattern T-017b: commit
trên feature branch, user apply migration → manually merge + push.

## Auto-decisions

- [Tier LOW] 2026-05-19 — Dùng `locked_at TIMESTAMPTZ` thay vì `is_locked BOOLEAN` — Lý do: cho phép truy vấn "khóa bao lâu rồi" + audit trail tự nhiên
- [Tier LOW] 2026-05-19 — Thêm `locked_reason TEXT` optional — Lý do: cần ghi lý do để owner nhớ + có audit trail
- [Tier LOW] 2026-05-19 — Archive = `tenant_status='archived'`, không tạo column mới — Lý do: enum đã có, không cần migration thêm
- [Tier LOW] 2026-05-19 — Login error message "Tài khoản đang tạm khóa, liên hệ chủ trọ" — Lý do: ngắn gọn, không leak lý do (security)
- [Tier LOW] 2026-05-19 — Confirm modal cho disable + archive (destructive), không cần cho reactivate (additive) — Lý do: UX pattern chuẩn

## ⚠️ Migration v25 — USER MUST APPLY BEFORE MERGING

```sql
[SQL-V25-START]
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_locked_at ON users(locked_at)
  WHERE locked_at IS NOT NULL;
[SQL-V25-END]
```

Verify:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='users' AND column_name IN ('locked_at', 'locked_reason');
-- expect 2 rows
```
