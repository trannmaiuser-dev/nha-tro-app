# T-040 — Ops handover sau batch T-038 → T-043

> Phase E auto đã chạy được T-038 + T-039 trong session. T-042 + T-043 cần
> bạn apply migration trước khi smoke runtime UI.

## Pending ops (theo thứ tự)

### 1️⃣ Apply migration v22 — bắt buộc cho T-042 contract renewal

📄 [work/t042-apply-migration-prompt.md](t042-apply-migration-prompt.md)

Quick steps:
1. Mở Supabase Studio → SQL Editor
2. Paste từng block `[SQL-V22-X-START]...[SQL-V22-X-END]` (4 blocks chính + 3 verify)
3. Verify mỗi block return đúng kỳ vọng

**Side effect cleanup**: migration cũng `ALTER notifications.sender_id DROP NOT NULL`
→ fix latent T-017 bug nơi `lib/debt-notify.ts:84` insert NULL sender_id. Sau apply,
push notification cảnh báo nợ sẽ thực sự dispatch (trước đó silent fail vì NOT NULL).

### 2️⃣ Apply migration v23 — bắt buộc cho T-043 chat nhóm

📄 [work/t043-apply-migration-prompt.md](t043-apply-migration-prompt.md)

3 blocks chính (chat_groups + chat_group_members + messages.group_id) + 2 verify.

### 3️⃣ Deploy + schedule Supabase Edge Function `archive-old-tenants`

UC-07 spec: tenant `moved_out` quá `data_retention_years` (default 2) năm → archive.
Code đã có sẵn ở [supabase/functions/archive-old-tenants/index.ts](../supabase/functions/archive-old-tenants/index.ts)
nhưng chưa deploy. **Production gap.**

```bash
# Install supabase CLI nếu chưa có
npm i -g supabase

# Login
supabase login

# Link project (lấy ref từ Supabase Dashboard URL)
supabase link --project-ref <YOUR_PROJECT_REF>

# Deploy
supabase functions deploy archive-old-tenants

# Schedule cron (daily 00:00)
supabase functions schedule create archive-old-tenants --cron "0 0 * * *"
```

Verify trong Supabase Dashboard → Edge Functions → archive-old-tenants → Logs.

### 4️⃣ Runtime smoke T-042 (sau bước 1)

Setup:
```bash
# Restart dev server từ worktree path
npm run dev
```

Browser steps:
1. Impersonate owner: `/api/dev/impersonate?token=$TOKEN&user_id=00000000-0000-0000-0000-000000000001`
2. Navigate `/admin/tenants`
3. Click tenant test1 card → "Đặt ngày hết hạn hợp đồng" → modal mở
4. Pick date = today + 20 days → "Lưu"
5. Verify badge "📅 Hợp đồng còn 20 ngày" hiện ngay
6. Navigate `/dashboard`
7. Verify bell badge +1 với notif "📅 1 hợp đồng sắp hết hạn trong 30 ngày tới"
8. Click vào "Hợp đồng còn 20 ngày" badge — chưa có route detail, defer

SQL verify:
```sql
SELECT contract_end_date FROM room_tenants
WHERE user_id=(SELECT id FROM users WHERE phone='0915817655');
-- Expect: today + 20 days

SELECT type, message FROM notifications
WHERE type='contract_renewal_reminder' ORDER BY created_at DESC LIMIT 1;
-- Expect: "📅 1 hợp đồng sắp hết hạn trong 30 ngày tới:..."
```

Cleanup: mở dialog → "Xóa ngày" → save.

### 5️⃣ Runtime smoke T-043 (sau bước 2)

Setup: restart dev server.

Browser steps:
1. Impersonate owner → `/admin/chat-groups`
2. Click "Tạo nhóm chat mới" → name "Tất cả khách thuê" → "Tạo"
3. Click vào nhóm vừa tạo → đến `/chat-groups/<id>`
4. Test gửi "Chào cả nhà" → tin nhắn hiện bên phải (own)
5. Quay lại `/admin/chat-groups` → click icon Users → modal manage
6. Thêm test1 (tenant) → close modal
7. Impersonate test1: `/api/dev/impersonate?...&user_id=c2bfdb18-6df2-4af2-9828-2d1501a540ab&force_complete=true`
8. Navigate `/chat-groups` → thấy nhóm "Tất cả khách thuê"
9. Click → thấy tin của owner + composer
10. Gửi "Hi anh" → tin hiện bên phải
11. Impersonate lại owner → `/chat-groups/<id>` → polling 5s → thấy reply

SQL verify:
```sql
SELECT id, name, deleted_at FROM chat_groups WHERE deleted_at IS NULL;
SELECT group_id, user_id FROM chat_group_members WHERE left_at IS NULL;
SELECT sender_id, group_id, content FROM messages WHERE group_id IS NOT NULL ORDER BY created_at;
```

Cleanup: `DELETE FROM messages WHERE group_id IN (SELECT id FROM chat_groups WHERE name='Tất cả khách thuê'); DELETE FROM chat_group_members WHERE group_id IN (...); DELETE FROM chat_groups WHERE name='Tất cả khách thuê';`

---

## Summary tasks batch T-038 → T-043

| Task | Status | Smoke E |
|---|---|---|
| T-038 today-tasks widget | 🟢 Merged + PASS | ✅ |
| T-039 meter reading reminder | 🟢 Merged + PASS | ✅ |
| T-040 ops handover (this doc) | 🟢 In review | n/a |
| T-041 cron debt warning | ⏭️ DROPPED | not requirement |
| T-042 contract renewal | 🟢 Merged | ⏳ pending migration v22 |
| T-043 chat nhóm | 🟢 Merged | ⏳ pending migration v23 |

5 requirements gap đã đóng (trừ Module 4 Camera defer).

## Deferred items

- T-041 cron debt warning replace on-page: scaleup task, 4-room scale fine với
  on-page pattern hiện tại
- Supabase Realtime upgrade cho group chat (replace 5s polling): scaleup
- Push notification dispatch cho group message (best-effort tới members): nice-to-have
- Cron job cho contract renewal (replace on-page check): scaleup
- Edge Function deploy CLI auth: cần user `supabase login` (tài khoản)
