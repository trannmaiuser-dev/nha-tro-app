# T-048 — Notification compose: schedule + recipient + repeat-until-ack

## P — Plan

**Why**: User feedback EOD 2026-05-19:
> "cần thêm chức năng soạn thông báo để chủ và khách liên lạc với nhau nhanh
> soạn thông báo cả chủ và khách đều dùng được
> soạn thông báo chỉ định được người nhận thông báo, thời gian nhận thông báo,
> tần suất repeat, có cả option repeat mỗi xxx ngày / giờ cho đến khi đối phương
> nhấn xác nhận"

D4-D6 decisions:
- D4: bảng mới `compose_notifications` + junction `compose_notification_recipients`
- D5: ack qua `compose_notification_recipients.acked_at`
- D6: on-demand dispatch (no cron) — `/notifications` page load trigger dispatch check

**Scope**:
- Migration v26: 2 bảng mới + link `notifications.compose_id`
- Form compose: title + body + recipients (multi) + schedule_at + repeat_interval + repeat_until_ack
- Cả owner và tenant đều dùng được
- Dispatch logic: insert vào `notifications` (table cũ) khi due
- Ack UI: button "✓ Đã đọc" trên notifications page cho compose-type
- Auto-repeat: nếu repeat_until_ack=true và có recipient chưa ack → schedule next_due_at += interval

**Out of scope**:
- Push notification (web push) — defer
- Email/SMS — defer
- Rich text body — plain text only
- Group recipients (vd "tất cả khách phòng A") — defer; v1 list từng user

## D — Do

1. `supabase/migrations-v26.sql` — 2 tables + link column + index
2. `lib/db/compose-notifications.ts` — helpers (create, dispatchDue, ack)
3. `app/api/notifications/compose/route.ts` — POST create
4. `app/api/notifications/[id]/ack/route.ts` — POST ack (mark composer.acked_at)
5. `app/api/notifications/users-list/route.ts` — list users để chọn recipients
6. `app/notifications/compose/page.tsx` — render form
7. `components/ComposeNotificationForm.tsx` — form UI
8. Update `app/notifications/page.tsx` — call dispatchDue() trước list
9. Update `components/NotificationsPage.tsx` — show "Soạn thông báo" button + ack button cho compose notification
10. Update CLAUDE.md type 'compose_message' (v26 check constraint extend)

## C — Check

- tsc + build pass
- Audit:
  - SA1: revalidatePath /notifications, /notifications/compose
  - SC1: page có force-dynamic
  - DL2: createServerSupabaseClient

## E — Phase E

⚠️ Migration v26 PENDING APPLY. Phase E manual:
1. Apply v26 SQL
2. Login owner → /notifications/compose → soạn "Test 1" gửi tenant test1 → send now
3. Login tenant test1 → /notifications → verify thấy + có button "✓ Đã đọc"
4. Click ack → recipient row có acked_at + button mất
5. Login owner → compose lần 2 với repeat_until_ack=true, interval 5min → tenant không ack 5 phút → mở /notifications → nhận lần 2
6. Tenant ack → repeat dừng

## A — Act

### Bài học rút ra

- **[CODE]** "On-demand dispatch" thay vì cron: trigger từ `/notifications` page load. Vercel free tier không có persistent cron worker, pattern này phù hợp Next.js serverless. Trade-off: nếu user không mở app, scheduled notifications chậm — chấp nhận cho domain nhà trọ (user check app daily).
- **[CODE]** Junction `compose_notification_recipients` với `acked_at` per recipient cho phép multi-recipient với ack state riêng biệt. Repeat-until-ack stop khi ALL recipient acked.
- **[CODE]** Link `notifications.compose_id` cho phép tận dụng UI list notifications hiện có (1 list cho cả system noti + compose), distinguish bằng type='compose_message' + button ack render conditional.
- **[CODE]** Try/catch wrap `dispatchDueForUser()` trong /notifications page với "ignore error" — graceful degradation khi migration chưa apply, không crash trang.
- **[CODE]** `repeat_interval_minutes` INTEGER thay vì SQL INTERVAL: dễ parse JS (`new Date(now + minutes * 60_000)`), không phụ thuộc PG-specific syntax.

(Tất cả CODE, auto-approve.)

### Files

- `supabase/migrations-v26.sql` (new — 2 tables + notifications.compose_id + indexes)
- `lib/db/compose-notifications.ts` (new — createCompose / dispatchDueForUser / ackNotification helpers)
- `app/api/notifications/compose/route.ts` (new — POST create)
- `app/api/notifications/[id]/ack/route.ts` (new — POST ack)
- `app/api/notifications/users-list/route.ts` (new — GET recipient picker source)
- `app/notifications/compose/page.tsx` (new — server wrapper)
- `components/ComposeNotificationForm.tsx` (new — full UI form)
- `app/notifications/page.tsx` (edit — call dispatchDueForUser before list, try/catch graceful)
- `components/NotificationsPage.tsx` (edit — "Soạn" button + ack button cho compose_message)
- `types/index.ts` (edit — extend NotificationType + AppNotification.compose_id)

### ⚠️ KHÔNG MERGE TRƯỚC KHI APPLY MIGRATION V26

Code reference 2 bảng mới + cột mới. Apply v26 trước khi merge sau khi user về.

## Auto-decisions

- [Tier LOW] 2026-05-19 — `repeat_interval_minutes INTEGER` thay vì SQL INTERVAL — Lý do: dễ hơn JS, không cần parse `'1 day 2 hours'`
- [Tier LOW] 2026-05-19 — `notifications.compose_id` NULL khi notification system-generated (payment_reminder, etc.), set khi từ compose flow — Lý do: tách rõ 2 nguồn nhưng dùng chung notifications table cho user list view
- [Tier LOW] 2026-05-19 — On-demand dispatch trigger trên /notifications page load — Lý do: D6 chốt no-cron, đơn giản với Vercel free tier
- [Tier LOW] 2026-05-19 — Recipients picker: list tất cả user role tenant (cho owner) hoặc owner + tenant khác (cho tenant) — Lý do: app 1 dãy trọ scale ~50 users, list flat OK; group-by-room defer

## ⚠️ Migration v26 — USER MUST APPLY BEFORE MERGING

```sql
[SQL-V26-START]
-- Extend notifications.type CHECK
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_reminder', 'payment_reported', 'payment_confirmed', 'payment_rejected',
  'extension_request', 'extension_approved', 'extension_rejected',
  'meter_reading_reminder', 'contract_renewal_reminder',
  'compose_message'
));

-- Compose notifications (parent record)
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

-- Recipients junction
CREATE TABLE IF NOT EXISTS compose_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compose_id UUID NOT NULL REFERENCES compose_notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acked_at TIMESTAMPTZ,
  last_dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(compose_id, recipient_id)
);

-- Link back from notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS compose_id UUID
  REFERENCES compose_notifications(id) ON DELETE SET NULL;

-- Index for due check
CREATE INDEX IF NOT EXISTS idx_compose_notifs_due
  ON compose_notifications(next_due_at) WHERE next_due_at IS NOT NULL;

-- Index for unacked recipients lookup
CREATE INDEX IF NOT EXISTS idx_compose_recipients_unacked
  ON compose_notification_recipients(recipient_id) WHERE acked_at IS NULL;
[SQL-V26-END]
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
