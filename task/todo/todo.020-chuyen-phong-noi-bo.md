# T-020 — Chuyển phòng nội bộ (UC-08)

## Trạng thái: 🔲 Chưa làm (chưa start)
## Ngày tạo: 2026-05-16
## Ước lượng: 2 ngày
## Áp dụng Phase E: ✅ Yes
## Branch: feature/t020-internal-transfer
## Dependencies: T-019 (UC-02b) — vì transfer = move-out + UC-02b

---

## Mục tiêu

Implement UC-08 từ usecase-quan-ly-khach-thue.md — khách chuyển phòng trong cùng dãy trọ.

Xem chi tiết UC tại `memory/usecase-quan-ly-khach-thue.md` (UC-08).

---

## Bối cảnh

Khách hiện tại chỉ có 2 lựa chọn:
- Ở lại phòng (mặc định)
- Chuyển đi hẳn (move-out → khỏi dãy trọ)

UC-08 thêm lựa chọn thứ 3: **chuyển sang phòng khác trong cùng dãy**.

Rule chốt:
- Cả chủ và khách đều có thể khởi tạo
- Chỉ được chuyển ngày 1-5 hàng tháng
- Phải chốt hết hóa đơn phòng cũ trước
- Vào phòng mới = khách mới (UC-02b logic)

---

## Trong scope

### Phase A — Schema

**Migration v17:**
- Add column `move_requests.transfer_to_room_id` (uuid nullable)
- Add column `move_requests.initiated_by` ('owner' | 'tenant')
- Update CHECK constraint `move_requests.type` thêm 'transfer'

### Phase B — Validation helpers

- `lib/utils/transfer-validation.ts`:
  - `isWithinFirstFiveDays(): boolean` — check ngày 1-5
  - `hasUnpaidInvoicesForUser(userId, roomId): Promise<boolean>`
  - `validateTransferRequest(): { ok: boolean; reason?: string }`

### Phase C — Server actions

- `lib/db/move-requests.ts`:
  - `createTransferRequest(userId, fromRoomId, toRoomId, initiatedBy, reason)`
  - `approveTransferRequest(requestId, isPrimaryInNewRoom)` — chủ duyệt khi khách request
  - `acceptTransferProposal(notificationId)` — khách accept khi chủ đề xuất
  - `rejectTransferProposal(notificationId)`

Logic chuyển:
```typescript
1. validateTransferRequest()
2. removeTenantFromRoom(oldRoomId, userId)  // auto-promote primary nếu cần
3. addTenantToRoom(newRoomId, userId, isPrimary)
4. Update move_request status='completed'
5. Send notification
```

### Phase D — UI

**Tenant side:**
- /tenant/move-request → thêm option "Chuyển sang phòng khác"
- Dropdown chọn phòng đích
- Nếu validation fail → block + báo lý do (ngày, hóa đơn)

**Owner side (Flow 2):**
- /admin/tenants → context menu trên tenant → "Chuyển phòng"
- Wizard 2 step: chọn phòng đích → chọn primary trong phòng mới
- Submit → tạo notification cho khách type='transfer_proposal'

**Notification:**
- Type mới: 'transfer_proposal' (chủ → khách)
- UI: card với 2 button "Đồng ý" / "Từ chối"
- Type mới: 'transfer_request' (khách → chủ — tái dụng move_request flow)

### Phase E — Runtime Smoke Test

| # | Test | Pass criteria |
|---|---|---|
| E1 | Khách yêu cầu chuyển + chủ duyệt | room_tenants old có left_at, new có row mới |
| E2 | Chủ đề xuất chuyển + khách accept | Same as E1 |
| E3 | Validation fail: ngày 10 trong tháng | UI block + báo lý do |
| E4 | Validation fail: còn hóa đơn unpaid | UI block + báo lý do |
| E5 | Chuyển vào phòng đã có người + đặt primary | primary cũ → non-primary, mới → primary |
| E6 | Re-verify auto-promote khi primary chuyển đi | Old room: người còn lại auto-promote |

---

## Câu hỏi nghiệp vụ cần user duyệt trước start

1. **Validation message** khi fail: format thế nào? Hiện rõ ngày bao giờ cho phép?
2. **Hóa đơn chưa paid:** chỉ check hóa đơn của user đó hay tất cả hóa đơn phòng?
3. **Transfer proposal expire:** notification chủ gửi khách có TTL không? (vd: hết hạn sau 24h tự reject?)
4. **History tracking:** muốn lưu metadata "đã chuyển từ phòng X sang Y" để xem lịch sử không?

---

## Lưu ý

KHÔNG start trước khi T-019 (UC-02b) xong vì transfer dùng logic UC-02b cho phần "vào phòng mới".
