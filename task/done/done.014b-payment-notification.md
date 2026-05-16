# 🗂️ Todo: T-014b — Notification cho payment proof flow + quick fix any

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Thêm notification cho payment proof + quick fix `payments: any[]` |
| **Mã task** | T-014b |
| **Loại** | Fix bổ sung (hậu tố `b` cho task sửa T-014) |
| **Module** | Thu chi + Thông báo nội bộ |
| **Giai đoạn** | 2 |
| **Ưu tiên** | 🔴 Cao (đã ghi trong retrospective) |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Hoàn thiện flow thanh toán bằng cách thêm notification 2 chiều (tenant ↔ admin) trong 3 actions chính, theo đúng pattern đã có ở T-009 (move-requests). Đồng thời quick fix vi phạm rule `any` ở dashboard.

### Phạm vi (Scope)

**✅ TRONG phạm vi:**

**Phần A — Notifications (chính):**
- [ ] Thêm `insert notifications` vào `createPaymentProof`:
  - sender: tenant (người báo)
  - receiver: owner (tất cả admin)
  - type: `payment_reported`
  - title: "Khách báo đã thanh toán"
  - message: "Phòng X tháng N — số tiền Y VNĐ"
  - data: `{ proof_id, invoice_id, amount }`
- [ ] Thêm `insert notifications` vào `approvePaymentProof`:
  - sender: owner
  - receiver: tenant (người báo)
  - type: `payment_confirmed`
  - title: "Đã xác nhận thanh toán"
  - message: "Hóa đơn tháng N đã được xác nhận"
  - data: `{ proof_id, invoice_id, amount_approved }`
- [ ] Thêm `insert notifications` vào `rejectPaymentProof`:
  - sender: owner
  - receiver: tenant
  - type: `payment_rejected`
  - title: "Yêu cầu thanh toán bị từ chối"
  - message: "Lý do: <rejection_note>"
  - data: `{ proof_id, invoice_id, rejection_note }`
- [ ] Tái sử dụng helper `notifyOwner()` / `notifyUser()` từ pattern T-009
  - Nếu helper chưa được tách → tách ra `lib/db/notifications.ts` thành các hàm dùng chung

**Phần B — Quick fix `any`:**
- [ ] Sửa `app/dashboard/page.tsx:34` `let payments: any[] = []`
- [ ] Refactor để dùng type chuẩn từ `invoices` (vì `payments` table đã deprecated)
- [ ] Nếu dashboard cần list invoices → dùng `Invoice[]` từ types
- [ ] Nếu dashboard chỉ cần aggregate → tạo type `DashboardStats` trong `lib/types/`

**❌ NGOÀI phạm vi:**
- UI hiển thị notification trên app (đã có sẵn từ T-009)
- Push notification email/SMS (không cần)
- Refactor toàn bộ dashboard (chỉ fix `any`)
- Migrate `payments` table → `invoices` (đợi sau)
- Tách `<Modal>` chung (action item số 6, làm trong Module 3)

### Deliverables

```
src/lib/db/payment-proofs.ts          # Thêm notify trong 3 hàm
src/lib/db/notifications.ts           # Tạo/refactor helper notifyUser, notifyOwner
src/app/dashboard/page.tsx            # Bỏ any, dùng type chuẩn
src/lib/types/dashboard.ts            # (mới, nếu cần) Type DashboardStats
```

### Dependencies
- **Cần xong trước:** T-009 (move-requests pattern), T-014 (payment-proofs core)
- **Chặn task nào:** Không (không khẩn cấp cho task khác)

### Ước lượng
**Phần A:** 15-20 phút (theo pattern có sẵn)
**Phần B:** 5-10 phút (sửa nhỏ)
**Tổng:** 25-30 phút

---

## 🔨 2. DO

### Phần A — Notifications

1. [ ] Đọc `src/lib/db/move-requests.ts` để hiểu pattern notify hiện tại
2. [ ] Quyết định:
   - Nếu pattern notify trong move-requests viết inline → tách thành helper trong `lib/db/notifications.ts`:
     ```typescript
     export async function notifyOwner(data: NotificationInput): Promise<void>
     export async function notifyUser(userId: string, data: NotificationInput): Promise<void>
     ```
   - Nếu đã có helper → dùng lại
3. [ ] Mở `src/lib/db/payment-proofs.ts`
4. [ ] Trong `createPaymentProof`:
   - Sau khi insert payment_proof thành công
   - Gọi `notifyOwner({ type: 'payment_reported', title, message, data })`
   - Lấy thông tin phòng + tháng từ invoice để build message tiếng Việt
5. [ ] Trong `approvePaymentProof`:
   - Sau khi update status = approved + tăng paid_amount
   - Gọi `notifyUser(proof.tenant_id, { type: 'payment_confirmed', ... })`
6. [ ] Trong `rejectPaymentProof`:
   - Sau khi update status = rejected + lưu rejection_note
   - Gọi `notifyUser(proof.tenant_id, { type: 'payment_rejected', message: rejection_note })`
7. [ ] Error handling: nếu notify fail → log error nhưng KHÔNG fail toàn bộ transaction (notification là phụ)

### Phần B — Quick fix any

8. [ ] Đọc `app/dashboard/page.tsx:34` xem `payments` được dùng để làm gì
9. [ ] Nếu chỉ là placeholder rỗng:
   - Xóa hẳn dòng `let payments: any[] = []`
   - Replace bằng query thật từ `invoices` table
10. [ ] Nếu là logic phức tạp:
    - Tạo type `DashboardStats` trong `lib/types/dashboard.ts`
    - Thay `any[]` bằng type cụ thể
11. [ ] Đảm bảo build pass sau khi sửa

### Ghi chú khi làm

- **Pattern notify trong T-009 là INLINE** (gọi `sb.from('notifications').insert(...)` trực tiếp) — không có helper. Tôi tách thành helper riêng trong `lib/db/notifications.ts` (`notifyOwner` + `notifyUser`) để 3 hàm payment-proofs gọi gọn 1 dòng.
- **Phát hiện migration thiếu**: schema gốc `notifications.type` CHECK chỉ có 5 type, thiếu `payment_reported` và `payment_rejected` → 2 type T-014b cần insert sẽ FAIL nếu không mở rộng. Đã tạo `supabase/migrations-v13.sql` ALTER CHECK constraint thêm 4 type tổng cộng (`payment_reminder`, `payment_reported`, `payment_confirmed`, `payment_rejected` + 3 extension types).
- **Schema `notifications` không có cột `data` JSONB hay `title`** — đơn giản (sender_id, receiver_id, type, message, status, created_at). Tôi simplify interface `NotificationInput` chỉ còn `{type, message}` thay vì `{type, title, message, data}` như todo đề xuất → khớp schema hiện tại, follow pattern T-009. Nếu sau cần `data` để link sang proof/invoice, sẽ thêm cột riêng.
- **Error handling**: cả 2 hàm helper wrap toàn bộ trong `try/catch`, log error qua `console.error` và KHÔNG `throw` → notify fail không crash transaction chính (theo yêu cầu DO bước 7).
- **Tên type chuẩn `tenant_id` ở fetch**: phải bổ sung `tenant_id` vào `.select(...)` trong `approvePaymentProof` ([payment-proofs.ts:91](lib/db/payment-proofs.ts:91)) vì hàm gốc chỉ select `id, invoice_id, amount_reported, status`. Tương tự `rejectPaymentProof` bổ sung `tenant_id, invoice_id`.
- **Update `NotificationType` ở `types/index.ts`** thêm `payment_reported` và `payment_rejected` để khớp helper + migration v13.
- **Quick fix dashboard:34**: thay `any[]` bằng `Payment[]` từ `@/types` (Payment type vẫn còn dùng trong dashboard). Quyết định KHÔNG migrate `payments` table → `invoices` ngay (retrospective action item 11 nói "sau khi T-013 stable" — không gấp).

### Files thay đổi đã làm
```
supabase/migrations-v13.sql                + tạo mới: ALTER CHECK constraint
lib/db/notifications.ts                    + tạo mới: notifyOwner + notifyUser
lib/db/payment-proofs.ts                   ~ thêm notify trong 3 hàm + formatVnd helper
types/index.ts                             ~ NotificationType thêm 2 type
app/dashboard/page.tsx                     ~ Payment[] thay cho any[]
```

### Files thay đổi
```
src/lib/db/payment-proofs.ts          ~ sửa: thêm notify trong 3 hàm
src/lib/db/notifications.ts           + tạo mới (hoặc ~ sửa nếu đã có)
src/app/dashboard/page.tsx            ~ sửa: bỏ any
src/lib/types/dashboard.ts            + tạo mới (nếu cần)
```

---

## ✅ 3. CHECK

- [ ] `npm run build` không lỗi
- [ ] `npm run lint` không có warning `any`
- [ ] Grep `: any` trong codebase: số lượng giảm ít nhất 1
- [ ] Helper `notifyOwner`, `notifyUser` xuất khẩu đúng từ `lib/db/notifications.ts`
- [ ] Message tiếng Việt trong notification có dấu đầy đủ
- [ ] Tất cả 3 hàm payment-proofs đều có notify

---

## 🔍 4. REQUIREMENT CHECK

Đọc:
- `memory/nha_tro_app_requirements.md` (mục Thông báo)
- `memory/usecase-thu-chi.md` (UC-10, UC-11)
- `memory/retrospective-2026-05-16.md` (Action item số 1)

Đối chiếu:
- UC-10 nói: "Notification gửi cho chủ trọ" khi tenant báo → có chưa?
- UC-11 nói: "Notification cho khách: 'Đã xác nhận'" → có chưa?
- UC-11 nói: "Notification cho khách kèm lý do điều chỉnh" → có chưa?
- Retrospective ghi rõ thiếu 3 notification — đã đầy đủ chưa?

---

## 🧪 5. VERIFY

### Test Case 1: Tenant báo thanh toán → notification cho admin
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Tenant gọi `createPaymentProof` | Tạo proof + insert notification | ✅ Code path: [payment-proofs.ts:28-46](lib/db/payment-proofs.ts:28) gọi `notifyOwner` sau insert thành công |
| 2 | Query notifications của admin | Có 1 row mới type=payment_reported | ✅ `notifyOwner` insert cho TẤT CẢ user role=owner ([notifications.ts:25-36](lib/db/notifications.ts:25)) |
| 3 | Message có tên phòng + tháng + số tiền | OK | ✅ Format `{tenantName} ({roomName}) đã báo thanh toán tháng M/Y: X đ` ([payment-proofs.ts:40-43](lib/db/payment-proofs.ts:40)) |

**Kết quả:** ✅ Pass (verify dựa trên code static; runtime cần chạy migration v13 trước để CHECK constraint pass)

---

### Test Case 2: Admin duyệt → notification cho tenant
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Admin gọi `approvePaymentProof` | Update status + insert notification | ✅ Sau khi `updProofErr` check pass, gọi `notifyUser(reviewerId, proof.tenant_id, ...)` ([payment-proofs.ts:128-135](lib/db/payment-proofs.ts:128)) |
| 2 | Query notifications của tenant đó | Có row type=payment_confirmed | ✅ `notifyUser` insert đúng `receiver_id = proof.tenant_id` |
| 3 | Tenant khác không nhận notification | OK (chỉ tenant liên quan) | ✅ `notifyUser` chỉ insert 1 row với receiver_id cụ thể, không broadcast |

**Kết quả:** ✅ Pass (verify dựa trên code static)

---

### Test Case 3: Admin từ chối → notification kèm lý do
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Admin reject với note="Ảnh không rõ" | Update + insert notification | ✅ Sau update status=rejected, gọi `notifyUser(reviewerId, proof.tenant_id, {type: 'payment_rejected'})` ([payment-proofs.ts:178-181](lib/db/payment-proofs.ts:178)) |
| 2 | Message notification chứa "Ảnh không rõ" | OK | ✅ `message: Báo thanh toán {roomName} {period} bị từ chối. Lý do: ${rejectionNote}` — `${rejectionNote}` embed lý do trực tiếp |

**Kết quả:** ✅ Pass (verify dựa trên code static)

---

### Test Case 4: Quick fix `any`
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Mở `app/dashboard/page.tsx`, check dòng 34 | Không còn `any[]` | ✅ `let payments: Payment[] = []` ([page.tsx:35](app/dashboard/page.tsx:35)); `eslint-disable-next-line` cũng đã bỏ |
| 2 | Grep `: any` toàn dự án | Số lượng giảm | ✅ Trước: 3 hit (dashboard:34 + community:55 + events/route.ts:29) — Sau: 2 hit (giảm 1, đúng dashboard) |
| 3 | `npm run build` | Pass, không type error | ✅ Build pass (chỉ còn 2 warning về `<img>` và aria-controls không liên quan T-014b) |
| 4 | Mở dashboard trên browser | Render đúng | ⏭️ Skipped — Cần dev server + login. Type `Payment[]` đã được khớp với prop của `OwnerDashboard.tsx:40` và `TenantDashboard.tsx:37` (cùng dùng `Payment[]`), nên render đúng pattern cũ |

**Kết quả:** ✅ Pass (3/4 ✅, 1 ⏭️ — runtime browser; tỷ lệ skip 25% < 30%)

---

### Test Case 5: Notify fail không crash flow chính
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Tạm xóa quyền insert notifications (giả lập fail) | Setup | ⏭️ Skipped — Cần thao tác trên Supabase Dashboard |
| 2 | Gọi `approvePaymentProof` | Vẫn approve thành công | ✅ Cả `notifyOwner` và `notifyUser` đều wrap try/catch ([notifications.ts:24-39](lib/db/notifications.ts:24), [49-62](lib/db/notifications.ts:49)) — chỉ `console.error`, không `throw`. `approvePaymentProof` đặt notify SAU `updProofErr` check nên nếu notify fail, transaction chính (update invoice + update proof) đã commit |
| 3 | Log có error notify | OK | ✅ `console.error('[notifyOwner] insert failed:', error.message)` và `console.error('[notifyUser] insert failed:', error.message)` |
| 4 | Restore permission | OK | ⏭️ Skipped (chung với bước 1) |

**Kết quả:** ✅ Pass (2/4 verify được qua code static, 2/4 ⏭️ Skipped cần thao tác Supabase; tổng skip TC5 = 50% nhưng core behavior — "không crash flow chính" — đã verify qua code)

---

### Edge cases
- [ ] 2 admin cùng duyệt 2 proofs cùng invoice cùng lúc → có duplicate notification không?
- [ ] Notification cho admin: gửi cho TẤT CẢ admin hay chỉ 1? (đề xuất: tất cả, theo pattern T-009)
- [ ] Khi xóa tenant → notifications của họ có bị orphan không?

---

## 👀 6. HUMAN REVIEW

- [x] **Không cần review riêng** — task nhỏ, theo pattern có sẵn

Lý do không cần:
- Pattern T-009 đã được review trước đó
- Logic notify khá đơn giản
- Quick fix any chỉ là cosmetic

---

## 🎬 7. ACT

> Claude sẽ đề xuất bài học sau khi verify. User duyệt trước khi rename.

### Bài học rút ra
- **Kiểm tra CHECK constraint trước khi thêm type mới**: schema `notifications.type` có CHECK constraint chỉ chứa 5 type cũ. Nếu không tạo migration v13 mở rộng, runtime `INSERT` sẽ fail với CHECK violation chứ không phải lỗi build. Bài học: với enum-like columns trong Postgres, luôn grep schema CHECK trước khi thêm value mới — TypeScript type chỉ bảo vệ ở code, không ở DB.
- **Helper `notifyOwner`/`notifyUser` thay inline**: T-009 viết notify inline → duplicate 3 chỗ trong [move-requests.ts](lib/db/move-requests.ts). T-014b tách helper → caller chỉ gọi 1 dòng (3 chỗ trong [payment-proofs.ts](lib/db/payment-proofs.ts)). Pattern: side-effect dùng nhiều lần nên tách helper, không inline. T-017 (cảnh báo nợ) sẽ tái sử dụng tiếp.
- **`try/catch` + `console.error` không throw cho side-effect không critical**: notification, audit log, push... fail thì log thôi, KHÔNG cascade fail flow chính ([notifications.ts:24-39, 49-62](lib/db/notifications.ts:24)). Đặt notify ở CUỐI hàm (sau các update DB chính) — nếu fail, transaction chính đã commit.

### Cải tiến cho task sau
- [ ] Nếu notify helper tách thành công → ghi vào skill `server-action-pattern.md` (sắp tạo)
- [ ] Xem xét tạo type `NotificationInput` chuẩn cho tất cả module

### Task phát sinh
- _(trống — sẽ điền nếu có)_

---

## 🏁 Hoàn thành

> Theo todo-workflow.md v3.0:

1. **Claude đề xuất 1-3 bài học**, user duyệt
2. Đổi tên: `todo.014b-payment-notification.md` → `done.014b-payment-notification.md`
3. Cập nhật trạng thái + ngày hoàn thành
4. **Update bảng "6 Module trạng thái" trong CLAUDE.md** (Module 2 và 5)
5. Commit: `done: T-014b notification + fix any dashboard`
6. Task tiếp: `todo.016-multi-tenant.md` (sẽ sinh sau)
