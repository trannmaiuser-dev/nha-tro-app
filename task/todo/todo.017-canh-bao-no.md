# T-017 — Cảnh báo nợ quá hạn (UC-05)

## Trạng thái: 🔲 Chưa làm
## Ngày tạo: 2026-05-16
## Ước lượng: 1 ngày
## Áp dụng Phase E: ✅ Yes
## Branch: feature/t017-debt-warning

---

## Mục tiêu

Implement UC-05 từ usecase-thu-chi.md — hệ thống cảnh báo khi tenant nợ tiền quá hạn.

---

## Quyết định nghiệp vụ (đã chốt)

1. **has_debt ở invoice level**, KHÔNG user level
   - `invoices.has_debt` = true khi quá hạn + chưa paid
   - `users.has_debt` sẽ XÓA sau task này (column legacy)

2. **Cảnh báo theo PHÒNG**, không user
   - Phòng có debt = có ít nhất 1 invoice quá hạn chưa paid
   - Tất cả khách trong phòng (kể cả non-primary) đều nhận warning

3. **Threshold "quá hạn"** = configurable trong app_settings
   - Key mới: `debt_warning_threshold_days` (default: 0 — quá 1 giây là quá hạn)
   - Owner có thể đổi qua settings (vd: cho phép trễ 3 ngày trước khi cảnh báo)
   - **Note:** trang admin/settings chưa làm — sẽ update sau khi T-021 done

4. **UI cảnh báo:**
   - Owner: KHÔNG cần (đã có "Nhắc tiền" button)
   - Tenant: **Auto push notification** trên điện thoại
   - Banner đỏ trong app (tenant home + invoice page)

5. **Action button:**
   - Owner: giữ "Nhắc tiền" hiện có
   - Tenant: thêm button **"Báo đã chuyển khoản"** trên banner debt
     - Tạo notification cho chủ với attached proof (optional upload ảnh)

---

## Trong scope

### Phase A — Schema + helpers

1. **Migration v16:**
   - Add column `invoices.has_debt` (boolean, default false)
   - Add setting `debt_warning_threshold_days` (json '0')
   - KHÔNG drop `users.has_debt` ở task này (đợi stable)

2. **Helper functions trong `lib/db/invoices.ts`:**
   - `isInvoiceOverdue(invoice, thresholdDays): boolean`
   - `markInvoiceAsOverdue(invoiceId): Promise<void>`
   - `getOverdueInvoicesByRoom(roomId): Promise<Invoice[]>`
   - `hasRoomDebt(roomId): Promise<boolean>`

3. **Cron / background job** (Vercel cron hoặc on-page check):
   - Mỗi page load tenant home → check has_debt và sync
   - Hoặc dùng Vercel Cron daily check toàn bộ invoices
   - Decision: dùng **on-page check** đơn giản trước, cron sau

### Phase B — Notification system

1. **Logic auto-send notification khi invoice quá hạn:**
   - Trigger: khi tenant login, check has_debt
   - Nếu có debt mới (chưa được notify) → tạo notification + push
   - Tránh spam: notification table có `last_notified_at` cho debt warnings
   - Pattern: notify mỗi 24h cho mỗi debt invoice

2. **Push notification:**
   - Tái dụng infrastructure WebPush đã có (T-019 trước đó? Verify)
   - Type mới: 'debt_warning'
   - Message format: "Phòng {room.name} có hóa đơn {invoice.month}/{invoice.year} quá hạn {N} ngày"

3. **In-app banner:**
   - Component mới: `<DebtBanner room={...} />`
   - Render đầu trang tenant home + invoice list
   - Hiện total amount nợ + danh sách invoice quá hạn
   - Button "Báo đã chuyển khoản" → mở modal upload proof

### Phase C — UI tenant action

1. **Component `<DebtBanner />`:**
   - Đỏ background
   - Hiện invoice quá hạn (số tháng + amount)
   - Button "Báo đã chuyển khoản"

2. **Modal `<ReportPaymentModal />`:**
   - Field: payment_method (cash/bank_transfer)
   - Field: amount (auto-fill từ invoice)
   - Field: note (optional)
   - Upload: ảnh proof (optional)
   - Submit → tạo `payment_proofs` row + notification cho owner

3. **Server action `reportPaymentAction`:**
   - Insert payment_proofs
   - Insert notification type='payment_reported' cho owner
   - revalidatePath('/dashboard', '/home')

### Phase D — Verify + Phase E smoke test

(Theo workflow v3.1)

---

## Ngoài scope

- Cron job tự động (đợi sau, dùng on-page check trước)
- Trang admin/settings để config threshold (đợi T-021 fix UI + làm settings UI)
- Xóa `users.has_debt` column (đợi T-017b sau 1-2 tuần stable)
- Auto-reconcile khi owner mark paid (đã có ở T-013/T-014, chỉ verify còn work)

---

## Phase E — Runtime Smoke Test

| # | Test | Pass criteria |
|---|---|---|
| E1 | Tạo invoice + để quá hạn | invoices.has_debt=true sau check; getOverdueInvoicesByRoom return >= 1 |
| E2 | Tenant login → nhận push + banner | Push notification arrive; banner đỏ render với amount đúng |
| E3 | Tenant click "Báo đã chuyển khoản" → upload proof | payment_proofs có row mới; notification 'payment_reported' tạo cho owner |
| E4 | Owner confirm payment → debt clear | invoices.has_debt=false; banner biến mất; push notification 'payment_confirmed' |
| E5 | Re-verify T-013/T-014 không break | Tạo invoice + render PDF + payment proof flow vẫn work |

---

## Schema thay đổi

**Migration v16:**
```sql
ALTER TABLE invoices ADD COLUMN has_debt BOOLEAN DEFAULT false;

-- Backfill cho invoices quá hạn hiện tại
UPDATE invoices
SET has_debt = true
WHERE status != 'paid' AND due_date < CURRENT_DATE;

-- Setting threshold
INSERT INTO app_settings (key, value)
VALUES ('debt_warning_threshold_days', '0')
ON CONFLICT (key) DO NOTHING;
```

**Migration rollback v16:**
```sql
ALTER TABLE invoices DROP COLUMN has_debt;
DELETE FROM app_settings WHERE key = 'debt_warning_threshold_days';
```

---

## Câu hỏi nghiệp vụ tồn đọng (cần user duyệt trước khi start Phase B)

1. **Notification frequency:** notify lại mỗi 24h hay 1 lần duy nhất?
2. **Multi-tenant in same room:** cả 2 tenant đều nhận push, hay chỉ primary?
3. **Payment proof khi báo đã chuyển khoản:** bắt buộc upload ảnh hay optional?

---

## Ghi chú khi làm

(Fill khi chạy task)

---

## ACT

(Fill cuối session)
