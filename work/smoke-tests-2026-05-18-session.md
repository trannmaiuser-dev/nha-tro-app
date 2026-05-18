# Smoke tests sau session 2026-05-18 (autonomous)

> Tổng hợp tất cả smoke tests cần chạy khi user về để verify 7 tasks merged trong session này.
> Đã chạy ở DB layer qua Claude-for-Google. Còn thiếu: runtime UI verify.

## Trạng thái migrations

| Migration | Task | Applied | Smoke ở DB |
|---|---|---|---|
| v16 | T-026 (RPC wrap) | ✅ | ✅ Pass (E1/E2/E4, E3 skip no data) |
| v17 | T-029 (audit_logs) | ✅ | ✅ Pass 4 steps |
| v18 | T-016b (drop tenant_id + recreate funcs) | ✅ | ✅ Pass 6 steps |
| v19 | T-017 (debt warning) | ✅ | ✅ Pass 6 steps (backfill=0) |
| **v20** | **T-020 (transfer)** | **⏳ pending** | — chạy [work/t020-apply-migration-prompt.md](work/t020-apply-migration-prompt.md) trước khi smoke UI |

## Setup

### 1. Apply migration v20 (T-020) trước
Paste [work/t020-apply-migration-prompt.md](work/t020-apply-migration-prompt.md) vào Claude-for-Google → Supabase Studio.

### 2. Start dev server local
```bash
npm run dev
# port 3000 hoặc 3002 (nếu 3000 stale build, T-021b lesson)
```

### 3. Generate test data nếu cần
Một số test cần seed. Tham khảo [task/done/021/seed.sql](task/done/021/seed.sql) hoặc tạo manual qua Supabase Studio:
- 1 owner active
- 2-3 tenants active (cho test multi-tenant)
- 1+ vacant rooms (cho test transfer)
- 1 invoice overdue (cho test debt banner)

---

## 🔷 T-028 — impersonate `?force_complete=true`

### S1: Bypass redirect /profile/setup
**Pre**: 1 tenant có `is_profile_complete=false` trong DB (vd seed E1 user 999001).
```bash
curl -i "http://localhost:3000/api/dev/impersonate?token=$DEV_IMPERSONATE_TOKEN&user_id=00000000-0000-0000-0000-000000999001&force_complete=true"
```
**Expect**: HTTP 302 → /dashboard (KHÔNG redirect /profile/setup).
Decode cookie JWT → `isProfileComplete: true`.

### S2: Default behavior unchanged
```bash
curl -i "http://localhost:3000/api/dev/impersonate?token=$DEV_IMPERSONATE_TOKEN&user_id=00000000-0000-0000-0000-000000999001"
```
**Expect**: HTTP 302 → /dashboard cookie set. Reload /dashboard → middleware redirect /profile/setup (vì JWT vẫn `false`).

---

## 🔷 T-026 — RPC transactional wrap

### S3: approveMoveRequest atomic
**Pre**: Tạo 1 move_request pending (move-out, không phải transfer):
```sql
INSERT INTO move_requests (user_id, room_id, requested_date, reason, status)
SELECT u.id, rt.room_id, CURRENT_DATE + 7, 'Smoke test T-026', 'pending'
FROM users u
JOIN room_tenants rt ON rt.user_id = u.id AND rt.left_at IS NULL
WHERE u.role='tenant'
LIMIT 1
RETURNING id, user_id, room_id;
```

**Action**: Login owner → /admin/move-requests → click Duyệt.

**Verify SQL**:
```sql
-- Move request approved
SELECT status, reviewed_at FROM move_requests WHERE reason='Smoke test T-026';
-- → approved, timestamp

-- User moved_out
SELECT tenant_status FROM users WHERE id = <user_id from above>;
-- → moved_out

-- Room status updated
SELECT name, status FROM rooms WHERE id = <room_id from above>;
-- → status=vacant (nếu chỉ user đó ở), occupied (nếu còn người)

-- Notification gửi
SELECT type, message FROM notifications
WHERE type='extension_approved'
ORDER BY created_at DESC LIMIT 1;
```

### S4: createTenantAccount atomic via UI
**Action**: Login owner → /dashboard → phòng vacant → "+ Tạo tài khoản khách" → fill SĐT mới → Submit.

**Verify**: Success screen render với login link + temp password. `users` có row mới, `room_tenants` có membership, `tenant_profiles` có draft, `rooms.status='occupied'`.

---

## 🔷 T-029 — impersonate audit_logs

### S5: Audit row insert sau impersonate
**Action**: 
```bash
curl -i "http://localhost:3000/api/dev/impersonate?token=$DEV_IMPERSONATE_TOKEN&user_id=<UUID>"
```

**Verify**:
```sql
SELECT event_type, target_user_id, ip, metadata, created_at
FROM audit_logs
WHERE event_type='dev_impersonate'
ORDER BY created_at DESC LIMIT 5;
```
**Expect**: 1 row mới mỗi lần curl, metadata `{"role":"...","full_name":"...","force_complete":false}`, ip set, target_user_id = UUID truyền vào.

### S6: Fail-open khi audit fail (optional, advanced)
**Action**: Tạm DROP TABLE audit_logs → curl impersonate → expect 302 redirect (không 500).
```sql
-- Tạm drop:
DROP TABLE audit_logs;
```
Curl impersonate → expect 302 OK + console.error trong dev server log.
**Restore**: Re-run migration v17.

---

## 🔷 T-016b — Drop rooms.tenant_id

### S7: OwnerDashboard render đúng multi-tenant
**Action**: Login owner → /dashboard.
**Expect**: Phòng occupied hiển thị tất cả tenants (1+ avatar), badge "Đại diện" trên primary. Không lỗi.

### S8: Tenant flow qua room_tenants
**Action**: Login tenant active → /dashboard → click "Báo chuyển đi".
**Expect**: Page /tenant/move-out render OK, form hiện đầy đủ.

### S9: Owner bulk-remind qua room_tenants primary
**Action**: Đảm bảo có ≥1 phòng occupied + có push subscription đăng ký. Trigger bulk-remind (qua UI nếu có button hoặc curl):
```bash
curl -X POST http://localhost:3000/api/owner/bulk-remind -H "Cookie: auth-token=<owner_jwt>"
```
**Expect**: `{sent: N}` với N = số phòng occupied có primary. Mỗi primary tenant nhận 1 notification.

---

## 🔷 T-017 — Debt warning system

### S10: DebtBanner render khi có overdue
**Pre**: Tạo invoice quá hạn cho 1 phòng occupied:
```sql
INSERT INTO invoices (
  room_id, month, year, total, paid_amount, due_date, status, has_debt
)
SELECT
  rt.room_id, 1, 2025, 5000000, 0, '2025-01-31', 'unpaid', TRUE
FROM room_tenants rt
JOIN users u ON u.id = rt.user_id
WHERE u.role='tenant' AND rt.left_at IS NULL
LIMIT 1
RETURNING id, room_id;
```

**Action**: Impersonate tenant trong phòng đó → /dashboard.
**Expect**:
- DebtBanner đỏ render TOP page (above tabs)
- Hiện "1 hóa đơn quá hạn, tổng 5.000.000đ (trễ N ngày)"
- Button "Báo đã chuyển khoản →" link /tenant/payments

### S11: DebtBanner ở /tenant/payments không pay button
**Action**: Tenant ở S10 vào /tenant/payments.
**Expect**: Banner render top, KHÔNG có button "Báo đã chuyển khoản" (vì đã ở trang này — showPayButton=false).

### S12: Push notification arrive (nếu có subscription)
**Pre**: Tenant ở S10 đã subscribe push (qua PushNotificationSetup component).
**Action**: Load /dashboard lần đầu sau khi invoice tạo.
**Expect**: Push notification arrive on device "🔴 Hóa đơn quá hạn — Phòng X - 1/2025: 5.000.000đ".

### S13: Dedup 24h
**Action**: Reload /dashboard lần 2 trong 24h.
**Expect**: KHÔNG có push thứ 2. Verify SQL: `SELECT last_debt_notified_at FROM invoices WHERE id=...` — timestamp unchanged.

### S14: Multi-tenant phòng — cả 2 nhận push
**Pre**: 2 tenants cùng phòng overdue.
**Action**: 1 tenant load /dashboard.
**Expect**: CẢ 2 tenants nhận push (cùng invoice notify slot acquired 1 lần).

### S15: Sync clear khi paid
**Action**: Owner approve full payment_proof cho invoice S10 → invoice.status='paid' (auto trigger v12 invoice_status_from_paid).
**Reload**: Tenant /dashboard.
**Expect**: Banner biến mất. `has_debt=false` sau syncDebtForRoom trigger next render.

### Cleanup
```sql
DELETE FROM invoices WHERE month=1 AND year=2025 AND total=5000000;
```

---

## 🔷 T-019 — Multi-tenant add (UC-02b)

### S16: Button "+ Thêm khách" trên phòng occupied
**Action**: Login owner → /dashboard.
**Expect**: Phòng occupied có button gray "+ Thêm khách" dưới 2 button Nhắc tiền + Hồ sơ. Phòng vacant vẫn có button primary cũ "+ Tạo tài khoản khách".

### S17: Pre-select roomId khi mở modal
**Action**: Click "+ Thêm khách" trên phòng P201 (occupied).
**Expect**: Modal mở, dropdown phòng pre-selected P201, label "Phòng P201 — Tầng 2 (đang N người)".

### S18: Create tenant 2nd in occupied room
**Action**: Submit modal với SĐT mới (vd 0911234567).
**Expect**: Success screen. Login link work cho user mới. Verify SQL:
```sql
SELECT room_id, user_id, is_primary, joined_at FROM room_tenants
WHERE user_id=(SELECT id FROM users WHERE phone='0911234567');
```
**Expect**: 1 row, `is_primary=false` (vì phòng đã có primary cũ).

### S19: Note "không phải đại diện" hiện cho occupied
**Action**: Mở modal, chọn phòng occupied.
**Expect**: Text gray "Phòng đang có N người. Khách mới sẽ là thành viên thêm (không phải đại diện)."

### S20: Capacity warning ≥6
**Pre**: Phòng có ≥6 active tenants (cần seed).
**Expect**: Modal hiện ⚠️ warning màu cam.

---

## 🔷 T-020 — Internal transfer (UC-08)

### S21: Mode selector hiện
**Action**: Tenant active → /tenant/move-out.
**Expect**: 2 tab "🚪 Chuyển đi hẳn" + "🔄 Chuyển phòng khác".

### S22: Transfer mode show dropdown + warning
**Action**: Click "🔄 Chuyển phòng khác".
**Expect**:
- Dropdown "Phòng muốn chuyển sang" hiện
- Warning "⚠️ Chỉ chuyển được ngày 1-5 hàng tháng. Phải chốt hết hóa đơn phòng cũ trước."
- Submit button label "Gửi yêu cầu chuyển phòng"

### S23: Validation fail — ngày 6-31
**Pre**: Hôm nay là ngày > 5 (KHÔNG phải 1-5).
**Action**: Chọn phòng đích + ngày tương lai + submit.
**Expect**: Toast error "Chỉ được chuyển phòng ngày 1-5 hàng tháng. Vui lòng đợi đến DD/MM/YYYY."

### S24: Validation fail — invoice unpaid
**Pre**: Hôm nay 1-5 + phòng tenant có invoice unpaid.
**Action**: Submit transfer.
**Expect**: Toast error "Phòng nguồn còn N hóa đơn chưa thanh toán: ... Vui lòng chốt hết trước khi chuyển phòng."

### S25: Validation fail — phòng đích maintenance
**Pre**: 1 phòng status='maintenance'.
**Action**: Submit transfer chọn phòng maintenance.
**Expect**: Toast error "Phòng X đang sửa chữa, không thể nhận khách mới."

### S26: Happy path transfer
**Pre**: Hôm nay 1-5, không invoice unpaid, phòng đích vacant.
**Action**: Submit.
**Expect**: Toast "Đã gửi yêu cầu chuyển phòng". Reload. Verify SQL:
```sql
SELECT user_id, room_id, transfer_to_room_id, status, initiated_by
FROM move_requests
ORDER BY created_at DESC LIMIT 1;
```
**Expect**: `transfer_to_room_id` NOT NULL, `initiated_by='tenant'`, `status='pending'`.

### S27: Owner approve transfer (atomic via transfer_tenant RPC)
**Action**: Login owner → /admin/move-requests → click Duyệt cho transfer request S26.
**Expect**: Success. Verify SQL:
```sql
-- Request approved
SELECT status, reviewed_at FROM move_requests WHERE id=<id from S26>;
-- → approved, timestamp

-- Old membership có left_at
SELECT left_at IS NOT NULL FROM room_tenants
WHERE user_id=<user_id> AND room_id=<from_room>
ORDER BY joined_at DESC LIMIT 1;
-- → true

-- New membership active
SELECT left_at, is_primary FROM room_tenants
WHERE user_id=<user_id> AND room_id=<to_room>
ORDER BY joined_at DESC LIMIT 1;
-- → left_at NULL, is_primary depends on existing count

-- User tenant_status='active' (NOT moved_out)
SELECT tenant_status FROM users WHERE id=<user_id>;
-- → active

-- Old room status updated (vacant nếu chỉ user đó ở)
SELECT name, status FROM rooms WHERE id=<from_room>;

-- New room status='occupied'
SELECT name, status FROM rooms WHERE id=<to_room>;
-- → occupied

-- Notification gửi tenant
SELECT type, message FROM notifications
WHERE receiver_id=<user_id> AND type='extension_approved'
ORDER BY created_at DESC LIMIT 1;
-- → "Yêu cầu chuyển phòng của bạn đã được duyệt..."
```

### S28: Auto-promote primary khi primary transfer đi
**Pre**: Phòng cũ có 2 tenants, primary chuyển đi.
**Expect S27 verify thêm**: Tenant còn lại trong phòng cũ tự động `is_primary=true`.

---

## Báo cáo

Sau khi run hết, paste kết quả format:
```
v20 apply: OK / FAIL <msg>

T-028:
- S1: PASS / FAIL <reason>
- S2: PASS / FAIL

T-026:
- S3: PASS / FAIL
- S4: PASS / FAIL

T-029:
- S5: PASS / FAIL
- S6: SKIPPED / PASS / FAIL

T-016b:
- S7: PASS / FAIL
- S8: PASS / FAIL
- S9: PASS / FAIL

T-017:
- S10: PASS / FAIL
- S11: PASS / FAIL
- S12: PASS / SKIPPED no push sub / FAIL
- S13: PASS / FAIL
- S14: PASS / SKIPPED no 2nd tenant / FAIL
- S15: PASS / FAIL

T-019:
- S16: PASS / FAIL
- S17: PASS / FAIL
- S18: PASS / FAIL
- S19: PASS / FAIL
- S20: PASS / SKIPPED no 6-tenant room / FAIL

T-020:
- S21: PASS / FAIL
- S22: PASS / FAIL
- S23: PASS / SKIPPED today 1-5 / FAIL
- S24: PASS / SKIPPED no unpaid / FAIL
- S25: PASS / SKIPPED no maintenance / FAIL
- S26: PASS / FAIL
- S27: PASS / FAIL
- S28: PASS / SKIPPED no 2-tenant room / FAIL
```

Nếu nhiều FAIL → tôi sẽ debug từng task riêng.
