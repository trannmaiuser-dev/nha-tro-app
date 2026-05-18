# T-020 — Chuyển phòng nội bộ (UC-08)

## Trạng thái: 🟢 Done (chờ user apply migration v20)
## Ngày tạo: 2026-05-16
## Ngày hoàn thành: 2026-05-18
## Ước lượng thực tế: ~2 giờ (spec 2 ngày — giảm vì atomic PG function pattern proven T-026)
## Áp dụng Phase E: 🟡 Manual (user apply migration + 6 smoke tests)
## Phase E mode: manual
## Branch: feature/t020-internal-transfer
## Dependencies: T-019 (UC-02b) — đã done cùng session

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

---

## Implementation (2026-05-18 autonomous mode)

### Scope decisions (autonomous Tier LOW — user authorized)

- **D1:** Chỉ implement Flow 1 (tenant request → owner approve). Defer Flow 2 (owner proposes → tenant accepts). Lý do: MVP đủ 1 happy path, Flow 2 phức tạp hơn (notification CHECK constraint cần thêm 'transfer_proposal' type). Defer task riêng nếu user cần.
- **D2:** Atomic PG function `transfer_tenant` (migrations-v20.sql) — replicate remove + add logic trong 1 transaction. Pattern proven T-026.
- **D3:** Validation phía server action (TS), KHÔNG trong PG function. Lý do: TS dễ test, error message format. PG function chỉ làm pure DB ops.
- **D4:** Validation rules: ngày 1-5 + invoice unpaid phòng nguồn (tất cả tenants, không chỉ user request) + room đích tồn tại + không maintenance + khác phòng nguồn.
- **D5:** SKIP TTL cho transfer proposal (Flow 2 deferred anyway).
- **D6:** SKIP history tracking metadata. `move_requests.transfer_to_room_id` + `requested_date` + `reviewed_at` đủ để query lịch sử.
- **D7:** Migration v20 (KHÔNG v17 như spec gốc). Lý do: v16-v19 đã dùng.
- **D8:** `extension_approved` notification type reuse (CHECK constraint v13 đã có). Lý do: tránh ALTER constraint cho semantic gần.
- **D9:** Approval branch tự động: `approveMoveRequestAction` kiểm tra `transfer_to_room_id` để call đúng RPC (approve_move_request vs transfer_tenant). Không cần UI distinction cho owner.
- **D10:** Validate ngày 1-5 trong `isWithinFirstFiveDays` function dùng `today.getDate()`. Lý do: simple + clear.
- **D11:** Đề xuất next available date trong reason message: "Vui lòng đợi đến DD/MM/YYYY". UX clearer.

### Files thay đổi

```
supabase/migrations-v20.sql                       # NEW — schema + transfer_tenant PG function
lib/utils/transfer-validation.ts                  # NEW — isWithinFirstFiveDays + hasUnpaidInvoicesForRoom + validateTransferRequest
lib/db/move-requests.ts                           # +createTransferRequest + approveTransferRequest
lib/schemas/move-request.ts                       # +transferRequestSchema (zod)
app/tenant/move-out/actions.ts                    # +createTransferRequestAction
app/tenant/move-out/page.tsx                      # mode selector + transfer dropdown + branching submit
app/admin/move-requests/actions.ts                # approveMoveRequestAction branch transfer vs move-out
app/api/tenant/move-request/route.ts              # +transferableRooms in response + force-dynamic
types/index.ts                                    # MoveRequest +transfer_to_room_id + initiated_by
task/done/done.020-chuyen-phong-noi-bo.md         # this file
work/t020-apply-migration-prompt.md               # Claude-for-Google migration prompt
```

### Phase C v3.3 12-pattern audit

| Pattern | Result | Note |
|---|---|---|
| SA1 [HIGH/CODE] revalidatePath | ✅ PASS | createTransferRequestAction: /tenant/move-out + /admin/move-requests + /notifications; approveMoveRequestAction unchanged: 4 paths |
| SA2 [HIGH/CODE] path exists | ✅ PASS | All paths verified |
| SA3 [MEDIUM/CODE] router.refresh after action | ✅ PASS | Tenant page uses window.location.reload() (stronger) |
| SA4 [MEDIUM/CODE] try/catch Result | ✅ PASS | Both new actions wrap try/catch return Result<void> |
| SC1 [HIGH/CODE] force-dynamic | ✅ PASS | API route added force-dynamic; tenant/move-out client component (no SC concern); admin/move-requests existing has it |
| SC2-3 | ✅ N/A | No SC pattern changes |
| DL1 [MEDIUM/LOGIC] unstable_cache | ✅ N/A | Not used |
| DL2 [MEDIUM/CODE] createServerSupabaseClient | ✅ PASS | All helpers use createServerSupabaseClient |
| DL3 [MEDIUM/CODE] throw not Result | ✅ PASS | createTransferRequest throws Error tiếng Việt, approveTransferRequest throws (RPC error message) |
| SW1-2 | ✅ N/A | No SW changes |
| BN1 | ✅ N/A | No new Image |

All 12 PASS hoặc N/A.

### ACT

1. **Atomic PG function pattern thừa hưởng từ T-026 giảm risk + scope đáng kể.** (CODE)
   - `transfer_tenant` clone structure từ `approve_move_request` + `create_tenant_account` — same idiom, easy review.
   - TS caller chỉ 1 sb.rpc() — không lo race condition giữa remove + add.
   - Pattern reusable cho future complex atomic flows.

2. **Branch logic ở action layer thay vì 2 separate actions.** (CODE — D9)
   - Initial draft: 2 action `approveMoveOutAction` + `approveTransferAction`.
   - Decision: 1 action `approveMoveRequestAction` query transfer_to_room_id để branch.
   - Lý do: caller UI (admin/move-requests) không biết trước transfer hay move-out → branch ở server tránh frontend split logic.
   - Trade-off: 1 extra DB read trước RPC. Acceptable cho 4-phòng scale.

3. **Validation tách lớp: TS server action thay vì PG function.** (LOGIC — D3)
   - PG function khó express "today's date 1-5" + complex error messages.
   - TS validation `validateTransferRequest` gọi trước RPC. Nếu fail → return error trước khi touch DB.
   - PG function clean, focus DB writes atomic.
   - Pattern: validation = TS, atomic execution = PG function.

4. **API route extend trả thêm data thay vì thêm endpoint mới.** (CODE)
   - `/api/tenant/move-request` GET đang trả `request`. Mở rộng trả `transferableRooms` cùng response.
   - Reduce round-trip + 1 fetch trong client useEffect.
   - Pattern: composite endpoint cho UI bootstrap data.

5. **Spec estimate 2 ngày, thực tế ~2 giờ.** (LOGIC — observation)
   - 4 phase scope (Schema + Validation + Action + UI) thực tế 1 commit.
   - Atomic PG function pattern + reuse type/schema/helpers → 90% time reduction.
   - Skip Flow 2 (owner proposes) cũng giảm scope đáng kể.

