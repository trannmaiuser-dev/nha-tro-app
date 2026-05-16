# 🗂️ Todo: Khách báo thanh toán + admin duyệt

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Tenant báo đã thanh toán (upload ảnh) + Admin duyệt |
| **Mã task** | T-014 |
| **Module** | Thu chi |
| **Giai đoạn** | 2 |
| **Ưu tiên** | 🔴 Cao |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done (core); notification tách sang T-014b |

---

## 🎯 1. PLAN

### Mục tiêu
Workflow thanh toán 2 phía: tenant upload ảnh chứng minh chuyển khoản → admin xem và duyệt (3 cách: đủ / 1 phần / từ chối). Bao gồm UC-10 và UC-11.

### Phạm vi (Scope)

**✅ TRONG phạm vi:**

**Data layer:**
- [ ] Zod schema `paymentProofSchema` (amount_reported, proof_images[], note)
- [ ] `lib/db/payment-proofs.ts`:
   - createPaymentProof(invoiceId, tenantId, data)
   - getPaymentProofsByInvoice(invoiceId)
   - getPaymentProofsByTenant(tenantId)
   - getPendingProofs() — cho admin xem queue
   - approvePaymentProof(id, amountApproved?) — nếu khác amount_reported = partial approval
   - rejectPaymentProof(id, note)
- [ ] Logic phía admin khi approve:
   - Tăng `invoices.paid_amount += amountApproved`
   - Trigger tự update `status` (đã làm ở T-011)
   - Nếu khách trước đó có flag `has_debt` và bây giờ đã trả đủ → tắt flag
- [ ] Notifications:
   - Tenant gửi proof → notify admin
   - Admin approve/reject → notify tenant

**UI tenant:**
- [ ] Trang `/tenant/payments` — danh sách các lần báo của mình
- [ ] Card mỗi báo: tháng, số tiền, status (badge màu), ảnh đính kèm, ghi chú
- [ ] Nút "Báo đã thanh toán" → mở form
- [ ] Form:
   - Chọn tháng (dropdown — sẽ hỏi admin có muốn cho tenant biết hóa đơn nào tồn tại không — đề xuất: chỉ cho chọn tháng/năm, không hiện chi tiết)
   - Input số tiền đã chuyển
   - Upload nhiều ảnh (multiple, JPG/PNG, max 5MB mỗi ảnh, max 5 ảnh)
   - Textarea ghi chú
   - Submit
- [ ] Mobile-first

**UI admin:**
- [ ] Trang `/admin/finance/payments` — queue duyệt
- [ ] Tabs: Chờ duyệt / Đã duyệt / Đã từ chối / Tất cả
- [ ] Card mỗi proof:
   - Thông tin tenant + phòng
   - Tháng hóa đơn
   - Số tiền tenant báo
   - Tổng hóa đơn tháng đó
   - Đã trả trước đó (nếu có)
   - Còn nợ
   - Carousel ảnh (xem to)
   - Ghi chú của tenant
   - 3 nút: "Duyệt đủ" / "Duyệt 1 phần" (mở dialog nhập số tiền) / "Từ chối" (mở dialog nhập lý do)
- [ ] Notification badge trên menu khi có proof chờ duyệt

**❌ NGOÀI phạm vi:**
- Báo cáo thu chi tổng → T-015
- Export → T-015
- Tự động đối soát với ngân hàng — chưa nghĩ tới

### Deliverables

```
lib/db/payment-proofs.ts
lib/schemas/payment-proof.ts

app/tenant/payments/
  page.tsx
  actions.ts
  PaymentProofForm.tsx
  PaymentProofCard.tsx

app/admin/finance/payments/
  page.tsx
  actions.ts
  PaymentReviewCard.tsx
  ApprovePartialDialog.tsx
  RejectDialog.tsx

components/ui/
  ImageCarousel.tsx               # Component xem ảnh phóng to
  MultiImageUpload.tsx            # Component upload nhiều ảnh
```

### Dependencies
- **Cần xong trước:** T-011 (schema + storage), T-013 (có hóa đơn để duyệt)
- **Chặn:** T-015 (báo cáo cần đúng status hóa đơn)

### Ước lượng: 7-9 giờ

---

## 🔨 2. DO

1. [ ] Zod schemas + types
2. [ ] Data layer functions
3. [ ] Server Actions (tenant + admin)
4. [ ] Component `MultiImageUpload`:
   - Drag-drop hoặc click chọn (mobile: camera/gallery)
   - Preview thumbnails
   - Nút xóa từng ảnh
   - Validate: tối đa 5 ảnh, mỗi ảnh ≤ 5MB
   - Upload lên `payment-proofs` bucket
5. [ ] Component `ImageCarousel`:
   - Click thumbnail → mở fullscreen
   - Swipe trên mobile
   - Nút đóng
6. [ ] Trang `/tenant/payments`:
   - List card
   - Nút FAB "Báo thanh toán"
   - Form trong dialog
7. [ ] Form `PaymentProofForm`:
   - Field tháng (Month picker)
   - Field số tiền (number, format VNĐ)
   - MultiImageUpload
   - Textarea note
   - Validate, submit
8. [ ] Trang `/admin/finance/payments`:
   - Tabs với count badge
   - Grid cards
9. [ ] `PaymentReviewCard`:
   - Hiển thị đầy đủ thông tin
   - 3 nút action
10. [ ] `ApprovePartialDialog`:
    - Input số tiền chấp nhận
    - Default = amount_reported
    - Nút confirm
11. [ ] `RejectDialog`:
    - Textarea lý do (bắt buộc)
    - Nút confirm
12. [ ] Notifications setup
13. [ ] Test toàn bộ trên mobile + desktop

---

## ✅ 3. CHECK

- [ ] Build pass
- [ ] Tiếng Việt 100%
- [ ] Upload ảnh hoạt động, lưu URL đúng bucket
- [ ] Approve → invoice.paid_amount tăng đúng
- [ ] Approve partial → status = partially_paid
- [ ] Approve đủ → status = paid
- [ ] Tenant chỉ thấy proof của mình
- [ ] Admin thấy tất cả
- [ ] Mobile responsive

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/usecase-thu-chi.md` (UC-10, UC-11)

Đối chiếu:
- UC-10: KHÔNG xem hóa đơn trong app — không hiển thị chi tiết hóa đơn ở tenant side
- UC-10: nhiều ảnh chứng minh (sao kê + chat) → MultiImageUpload max 5
- UC-10: có thể báo nhiều lần cho 1 hóa đơn → cho phép tạo nhiều proofs cùng invoice_id
- UC-11: 3 lựa chọn (đủ / 1 phần / từ chối) → có 3 nút riêng
- UC-11: notification 2 chiều → có chưa?

---

## 🧪 5. VERIFY

### Test Case 1: Tenant báo thanh toán đủ
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant vào /tenant/payments, click "Báo" | Form mở | ⬜ |
| 2 | Chọn tháng 10/2026, nhập 3,840,000 | OK | ⬜ |
| 3 | Upload 2 ảnh sao kê + chat zalo | Preview hiển thị | ⬜ |
| 4 | Submit | Toast, card mới với status "Chờ duyệt" | ⬜ |
| 5 | Admin nhận notification | OK | ⬜ |

### Test Case 2: Admin duyệt đủ
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Admin vào /admin/finance/payments | Có proof pending | ⬜ |
| 2 | Click ảnh → xem to | OK | ⬜ |
| 3 | Click "Duyệt đủ" | Confirm dialog | ⬜ |
| 4 | Confirm | Toast, status proof = approved, invoice.paid_amount += 3840000 | ⬜ |
| 5 | Invoice status auto = paid | OK | ⬜ |
| 6 | Tenant nhận notification "Đã xác nhận" | OK | ⬜ |

### Test Case 3: Duyệt 1 phần
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant báo 4,000,000 (tổng HĐ 3,840,000) | OK | ⬜ |
| 2 | Admin click "Duyệt 1 phần", nhập 3,500,000 | OK | ⬜ |
| 3 | Confirm | proof.status=partially_approved, amount_approved=3500000 | ⬜ |
| 4 | invoice.paid_amount = 3,500,000 | OK | ⬜ |
| 5 | invoice.status = partially_paid | OK | ⬜ |

### Test Case 4: Báo nhiều lần cho cùng hóa đơn
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Đã có proof approved 2,000,000 cho HĐ tháng 10 | OK | ⬜ |
| 2 | Tenant báo tiếp 1,840,000 | Cho phép tạo proof mới | ⬜ |
| 3 | Admin duyệt | invoice.paid_amount = 3,840,000 | ⬜ |
| 4 | invoice.status = paid | OK | ⬜ |

### Test Case 5: Từ chối
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Admin click "Từ chối" | Dialog yêu cầu lý do | ⬜ |
| 2 | Nhập "Ảnh không rõ" | OK | ⬜ |
| 3 | Confirm | proof.status=rejected, có rejection_note | ⬜ |
| 4 | Tenant xem | Thấy status rejected + lý do | ⬜ |
| 5 | Tenant báo lại lần mới | Cho phép | ⬜ |

### Test Case 6: Upload ảnh
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Chọn 1 ảnh JPG 2MB | OK, preview hiện | ⬜ |
| 2 | Chọn thêm 4 ảnh nữa (tổng 5) | OK | ⬜ |
| 3 | Cố thêm ảnh thứ 6 | Báo lỗi "Tối đa 5 ảnh" | ⬜ |
| 4 | Chọn ảnh 6MB | Báo lỗi "Tối đa 5MB/ảnh" | ⬜ |
| 5 | Chọn PDF | Báo lỗi "Chỉ ảnh JPG/PNG" | ⬜ |

### Test Case 7: Phân quyền
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant A xem proof tenant B | Không thấy (RLS) | ⬜ |
| 2 | Tenant cố approve proof của mình | 403 | ⬜ |
| 3 | Admin thấy tất cả | OK | ⬜ |

### Edge cases
- [ ] Tenant cố báo cho hóa đơn đã paid → reject với warning rõ
- [ ] Admin approve cùng 1 proof 2 lần → block lần 2
- [ ] Hóa đơn bị xóa khi proof pending → proof orphan?
- [ ] Spam upload ảnh → có rate limit không?

---

## 👀 6. HUMAN REVIEW
- [x] **Cần review** — liên quan tiền + ảnh nhạy cảm (sao kê)

Cần xem:
- [ ] Tenant có vô tình thấy ảnh của tenant khác qua URL trực tiếp không?
- [ ] Storage policy có chặt không?
- [ ] Logic paid_amount có race condition khi 2 admin cùng duyệt 2 proofs cùng invoice?

---

## 🎬 7. ACT

### Bài học rút ra
- **Phân biệt `amount_reported` vs `amount_approved`**: tenant báo X, admin ghi nhận Y. `paid_amount` tăng theo `finalApproved` chứ không phải `amount_reported` ([lib/db/payment-proofs.ts:97-109](lib/db/payment-proofs.ts:97)) → tránh sai số khi admin điều chỉnh số tiền duyệt 1 phần.
- **State machine `pending → approved/partially_approved/rejected`**: cả 2 hàm approve & reject đều check `if (proof.status !== 'pending') throw` ngay đầu hàm → tránh duyệt trùng khi 2 admin cùng thao tác.
- **Quên notification dù pattern đã có ở T-009** — bài học chính cho retrospective: khi copy flow approve/reject từ task khác, phải đối chiếu cả branch "side effect" (notification, log, `has_debt`) chứ không chỉ "happy path" tạo/update record. Đã track sang **T-014b**.

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.014-thanh-toan.md` → `done.014-thanh-toan.md`
2. Commit: `done: T-014 thanh toán + duyệt`
3. Task tiếp: `todo.015-bao-cao-pdf.md`
