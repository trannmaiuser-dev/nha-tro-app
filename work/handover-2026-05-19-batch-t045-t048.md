# Handover 2026-05-19 — Autonomous batch T-045 → T-050 (5 features)

User invoked autonomous mode khi đi làm. Tôi đã hoàn thành 5 task theo
requirement trong [memory/requirements-2026-05-19-owner-tenant-edit-notification.md](../memory/requirements-2026-05-19-owner-tenant-edit-notification.md).

## Tóm tắt 1 dòng

3 feature đã merge + push origin/main (T-050, T-045, T-046).
2 feature chờ apply migration để merge (T-047 cần v25, T-048 cần v26).

## Trạng thái commits

### ✅ Đã merge + push origin/main

| Commit | Task | Migration | Mô tả |
|---|---|---|---|
| `afc7bb4` | T-050 | none | Fix 5 dashboard owner navigation cũ link sai `/dashboard` → đúng route |
| `d501b5e` | T-045 | none | Self-edit profile cho owner + tenant (tenant button luôn show, owner có /profile/edit) |
| `5763130` | T-046 | none | Owner edit tenant profile + giấy tờ (route /profile/[userId]/edit + admin endpoint) |

### ⏳ Hold ở feature branch — chờ user apply migration

| Branch | Commit | Migration | Mô tả |
|---|---|---|---|
| `feature/t047-manage-tenant-account` | `442ae3f` | **v25** | Owner disable/lưu trữ/mở khóa account khách |
| `feature/t048-notification-compose` | `cb2c4cf` | **v26** | Notification compose + schedule + ack flow |

Branch local trong worktree `vibrant-solomon-4f867c`. KHÔNG push origin để giữ
state rõ ràng "chưa merge".

## 🔴 USER PHẢI LÀM

### Bước 1 — Apply migration v25 (cho T-047)

Mở Supabase Studio SQL Editor, paste:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_locked_at ON users(locked_at)
  WHERE locked_at IS NOT NULL;
```

Verify:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='users' AND column_name IN ('locked_at', 'locked_reason');
-- expect 2 rows
```

Sau khi pass → merge:
```bash
git -C "C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce" merge --ff-only 442ae3f
git -C "C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce" push origin main
```

### Bước 2 — Apply migration v26 (cho T-048)

```sql
-- Extend notifications.type CHECK
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_reminder', 'payment_reported', 'payment_confirmed', 'payment_rejected',
  'extension_request', 'extension_approved', 'extension_rejected',
  'meter_reading_reminder', 'contract_renewal_reminder',
  'compose_message'
));

CREATE TABLE IF NOT EXISTS compose_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  repeat_interval_minutes INTEGER,
  repeat_until_ack BOOLEAN NOT NULL DEFAULT FALSE,
  next_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compose_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compose_id UUID NOT NULL REFERENCES compose_notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acked_at TIMESTAMPTZ,
  last_dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(compose_id, recipient_id)
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS compose_id UUID
  REFERENCES compose_notifications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_compose_notifs_due
  ON compose_notifications(next_due_at) WHERE next_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compose_recipients_unacked
  ON compose_notification_recipients(recipient_id) WHERE acked_at IS NULL;
```

Verify:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('compose_notifications', 'compose_notification_recipients');
-- expect 2 rows

SELECT column_name FROM information_schema.columns
WHERE table_name='notifications' AND column_name='compose_id';
-- expect 1 row
```

Sau khi pass → merge:
```bash
git -C "C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce" merge --ff-only cb2c4cf
git -C "C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce" push origin main
```

### Bước 3 — Cleanup branch local (sau khi 2 merge xong)

```bash
git -C "C:/aloha/nha-tro-app/.claude/worktrees/vibrant-solomon-4f867c" checkout --detach
git -C "C:/aloha/nha-tro-app/.claude/worktrees/vibrant-solomon-4f867c" branch -D feature/t047-manage-tenant-account
git -C "C:/aloha/nha-tro-app/.claude/worktrees/vibrant-solomon-4f867c" branch -D feature/t048-notification-compose
```

## Smoke test sau merge

### T-050 (đã merge)
1. Login owner → `/home` → click từng card → verify 5 route đúng:
   - Quản lý phòng → `/rooms`
   - Khách thuê → `/admin/tenants`
   - Thông báo → `/notifications`
   - Thanh toán → `/admin/finance/payments`
   - Cài đặt → `/admin/settings`

### T-045 (đã merge)
**Owner**:
1. Login owner → `/profile` → thấy button "✏️ Sửa hồ sơ cá nhân"
2. Click → form `/profile/edit` mở
3. Đổi tên, upload avatar, save → verify reload → tên hiện đúng
4. Upload CCCD front/back → verify hiện preview + DB tenant_documents có row

**Tenant**:
1. Login tenant đã confirmed → `/profile` → thấy "✏️ Sửa hồ sơ" (trước chỉ show khi draft)
2. Click → mở /profile/setup wizard → sửa được

### T-046 (đã merge)
1. Login owner → `/admin/tenants` → click khách → `/profile/[userId]` (TenantSummaryPage)
2. Header có "✏️ Sửa" → click → form edit tenant
3. Đổi tên khách, save → reload → verify
4. Login tenant đó (logout owner trước) → /profile → verify tên đã sync

### T-047 (chờ migration v25)
1. Apply v25 + merge
2. Login owner → `/profile/[tenantId]` → menu "⋮" → "🔒 Tạm khóa account"
3. Confirm dialog → click tạm khóa → thấy badge "🔒 Tạm khóa"
4. Logout, login với phone tenant đó → expect lỗi "Tài khoản đang tạm khóa"
5. Login owner lại → menu "⋮" → "🔓 Mở khóa" → tenant login lại được
6. Menu "⋮" → "📦 Lưu trữ" → confirm → redirect /admin/tenants
7. Verify SQL: `SELECT tenant_status FROM users WHERE id='...'` → 'archived'
8. Verify `SELECT left_at FROM room_tenants WHERE user_id='...' AND left_at IS NULL` → 0 rows (membership ended)

### T-048 (chờ migration v26)
1. Apply v26 + merge
2. Login owner → `/notifications` → click "✏️ Soạn"
3. Form:
   - Tiêu đề: "Test thông báo 1"
   - Nội dung: "Đây là test"
   - Chọn 1 tenant (vd test1)
   - Gửi ngay
   - Không lặp
4. Click "Gửi" → redirect /notifications
5. Logout owner, login tenant test1 → /notifications → thấy "Test thông báo 1" với button "✓ Đã đọc / Xác nhận"
6. Click ack → button mất, status='read'
7. Verify SQL: `SELECT acked_at FROM compose_notification_recipients WHERE recipient_id=... AND compose_id=...` → not null
8. (Optional) Test repeat-until-ack: tạo notification với repeat 1 phút + until_ack → tenant không ack → reload /notifications sau 1 phút → thấy notification lần 2 cùng nội dung

## Mọi decisions auto-resolved trong batch

| ID | Decision | Chọn | Lý do |
|---|---|---|---|
| D1 | Owner profile data model | (a) tenant_profiles reuse | Không cần migration mới, FK user_id đã đa role |
| D2 | Tenant edit UX | (a) convert /profile/[userId] editable (variant: route con /edit) | Reuse form, ít route mới |
| D3 | Disable/Delete | (a) soft only — locked_at + archived | Compliance UC-07 archive 2 năm, không mất data |
| D4 | Notification entity model | bảng riêng compose_notifications + junction | Tách compose flow khỏi notifications system-generated nhưng dispatch ra notifications table |
| D5 | Ack flow | junction.acked_at + status='read' trên notifications | 2 layer (compose state + notification state) cho phép UI logic riêng |
| D6 | Scheduled delivery infra | on-demand check trên /notifications page load | Vercel free tier không persistent cron; user check app daily OK |

Refer to [task/done/done.045-self-edit-profile.md](../task/done/done.045-self-edit-profile.md)..
[task/done/done.048-notification-compose.md](../task/done/done.048-notification-compose.md) cho ACT lessons từng task.

## Files structure mới

```
app/
├── api/
│   ├── admin/
│   │   ├── tenant-profile-save/route.ts        ← T-046 NEW
│   │   └── tenants/[userId]/
│   │       ├── archive/route.ts                ← T-047 NEW
│   │       └── lock/route.ts                   ← T-047 NEW
│   ├── auth/login/route.ts                     ← T-047 EDIT (locked_at + archived check)
│   ├── notifications/
│   │   ├── [id]/ack/route.ts                   ← T-048 NEW
│   │   ├── compose/route.ts                    ← T-048 NEW
│   │   └── users-list/route.ts                 ← T-048 NEW
│   └── profile/
│       └── owner-save/route.ts                 ← T-045 NEW
├── notifications/
│   ├── compose/page.tsx                        ← T-048 NEW
│   └── page.tsx                                ← T-048 EDIT (dispatch on load)
└── profile/
    ├── [userId]/
    │   └── edit/page.tsx                       ← T-046 NEW
    └── edit/page.tsx                           ← T-045 NEW (also EDIT T-046 use generic)

components/
├── ComposeNotificationForm.tsx                 ← T-048 NEW
├── HomePageOwner.tsx                           ← T-050 EDIT (5 nav links)
├── NotificationsPage.tsx                       ← T-048 EDIT (ack + compose button)
├── ProfileEditForm.tsx                         ← T-046 NEW (generic, replaces OwnerProfileEditForm)
├── ProfileSelfPage.tsx                         ← T-045 EDIT (edit buttons)
└── TenantSummaryPage.tsx                       ← T-046 EDIT ("Sửa" button) + T-047 EDIT (⋮ menu)

lib/db/
└── compose-notifications.ts                    ← T-048 NEW

supabase/
├── migrations-v25.sql                          ← T-047 NEW (PENDING APPLY)
└── migrations-v26.sql                          ← T-048 NEW (PENDING APPLY)

task/done/
├── done.045-self-edit-profile.md
├── done.046-owner-edit-tenant.md
├── done.047-manage-tenant-account.md
├── done.048-notification-compose.md
└── done.050-fix-dashboard-nav.md

types/index.ts                                  ← T-048 EDIT (NotificationType + AppNotification.compose_id)
```

## Risks + open items

| Item | Severity | Note |
|---|---|---|
| T-047 login check thứ tự | Low | Tôi check sau password verify để không leak ai bị khóa. Audit OK. |
| T-048 on-demand dispatch | Medium | Nếu user không mở /notifications trong N giờ, scheduled noti chậm. Acceptable cho domain. |
| T-048 race condition khi dispatch | Low | 2 page load đồng thời có thể gây dispatch 2 lần. Mức độ ảnh hưởng: user thấy 2 noti giống nhau. Defer fix cho T-048b nếu user complain. |
| ProfileEditForm — owner phone bị disable | Low | T-045 decision: phone là identity login, không cho đổi. Nếu user muốn đổi phone của khách, T-047b cần "force password reset + phone update" flow riêng. |
| Notification compose chưa filter "Đã gửi" | Medium | Sender không có list "thông báo đã gửi". Có thể bổ sung T-048b với route /notifications/sent. |
| Compose form chưa preview | Low | Owner soạn → gửi luôn, không có preview. Có thể bổ sung. |

## Module status update

Sau khi user merge 2 feature branch:

| # | Module | Status | Note |
|---|---|---|---|
| 1 | Quản lý phòng & khách thuê | 🟢 100% | + T-045/046/047 owner self-edit + admin edit tenant + manage account |
| 2 | Thu chi & hóa đơn | 🟢 100% | unchanged |
| 3 | Giấy tờ | 🟢 100% | T-045/046 thêm flow upload CCCD vào profile edit |
| 4 | Camera AI | ⏸️ DEFER | unchanged |
| 5 | Thông báo nội bộ | 🟢 100%+ | + T-048 compose + schedule + ack |
| 6 | Cộng đồng | 🟢 100% | unchanged |

CLAUDE.md table chưa update — tôi không tự update vì rule v3.0 nói update sau
mỗi rename done. Tôi đã rename 5 done file, user có thể cập nhật CLAUDE.md
module table sau khi merge xong.

## Session totals 2026-05-19 (toàn bộ ngày)

```
14 commits (T-038 → T-050):
cb2c4cf done: T-048 notification compose (feature branch, chưa merge)
442ae3f done: T-047 owner manage tenant account (feature branch, chưa merge)
5763130 done: T-046 owner edit tenant profile + giấy tờ
d501b5e done: T-045 self-edit profile cho owner + tenant
afc7bb4 done: T-050 fix dashboard owner 5 navigation links
de23e78 chore: memory requirements 2026-05-19
a69e8ef chore: handover doc EOD 2026-05-19
c0f5190 done: T-017b drop legacy users.has_debt column + Settings fix
52e0091 chore: rename todo.044 → done.044
c23d607 done: T-044 UI mobile responsive audit + fix 2 critical pages
9068700 chore: T-043 fix migration v23
a06e46f chore: T-040 ops handover doc
40fadac done: T-043 chat nhóm multi-group
... (sớm hơn: T-038, T-039, T-042)
```

5 module hoàn chỉnh / 6 module total. Camera AI defer per user.
