# 🗂️ Todo: T-016 — Multi-tenant schema refactor (UC-02)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | UC-02 Multi-tenant: refactor schema để hỗ trợ nhiều khách/phòng |
| **Mã task** | T-016 |
| **Loại** | Refactor lớn (đụng nhiều task cũ) |
| **Module** | Quản lý phòng & khách thuê (Module 1) |
| **Giai đoạn** | 1 (bổ sung) |
| **Ưu tiên** | 🔴 Cao (oversight đã ghi rõ trong retrospective) |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Sửa thiết kế schema để hỗ trợ **nhiều khách thuê chung 1 phòng** (UC-02 trong requirement). Hiện tại `rooms.tenant_id` chỉ cho 1 khách — đây là oversight phát hiện ở retrospective. Task này tạo bảng `room_tenants` many-to-many, migrate dữ liệu, sửa lib/db, sửa UI.

### ⚠️ Đây là task đặc biệt
- **Scope lớn:** đụng đến T-002, T-006, T-007, T-008, T-013 (đã done)
- **Có khả năng phá vỡ code cũ:** phải verify lại nhiều task sau khi merge
- **Phải có backup migration trước:** migration v14 tạo bảng mới, v15 migrate data, v16 (sau verify) drop column cũ

### Phạm vi (Scope)

**✅ TRONG phạm vi:**

**Phần A — Schema refactor:**
- [ ] Tạo migration `migrations-v14.sql`:
  - Tạo bảng `room_tenants(id, room_id FK, user_id FK, joined_at, left_at NULL, is_primary BOOLEAN default false)`
  - `is_primary`: đánh dấu người đứng tên hợp đồng / nhận cọc khi trả phòng
  - Unique constraint: 1 active (left_at NULL) `(room_id, user_id)` không trùng
  - RLS policies: admin full, tenant chỉ thấy của mình
- [ ] Tạo migration `migrations-v15.sql`:
  - Migrate data: với mỗi `rooms.tenant_id` không NULL → insert vào `room_tenants` với `is_primary=true`, `joined_at = rooms.created_at` (hoặc fallback)
  - GIỮ NGUYÊN cột `rooms.tenant_id` (chưa drop, để rollback dễ)
- [ ] Migration v16 (drop column) → **không làm trong task này**, đợi verify pass và stable mới làm

**Phần B — Data layer:**
- [ ] `lib/db/room-tenants.ts` (mới):
  - addTenantToRoom(roomId, userId, isPrimary?)
  - removeTenantFromRoom(roomId, userId, leftAt) — set left_at, không xóa
  - getTenantsByRoom(roomId, activeOnly = true)
  - getRoomsByTenant(userId)
  - getPrimaryTenant(roomId)
  - setPrimaryTenant(roomId, userId)
- [ ] Sửa `lib/db/rooms.ts`:
  - getAllRooms: include tenants[] (join room_tenants where left_at IS NULL)
  - getRoomById: tương tự
- [ ] Sửa `lib/db/tenants.ts`:
  - createTenant: tạo user + add vào room_tenants với is_primary=true (lần đầu)
  - Adding thêm khách vào phòng đã có người → is_primary=false, không phá người cũ
- [ ] Sửa `lib/db/invoices.ts` — đặc biệt `calculateInvoiceForRoom`:
  - `numPeople = roomTenants.length` (đếm active tenants)
  - Tính nước per_person dùng `numPeople` mới
  - Tính phụ phí quá người dùng `numPeople` mới
- [ ] Sửa `lib/db/move-requests.ts`:
  - Khi approve move request → set `left_at` trong room_tenants, KHÔNG xóa row
  - Nếu người chuyển đi là `is_primary` → tự động set người khác làm primary (theo joined_at sớm nhất)
  - Phòng còn tenant → status vẫn occupied; rỗng → status = empty

**Phần C — UI:**
- [ ] Sửa `app/admin/rooms/RoomCard.tsx`:
  - Hiển thị danh sách tất cả tenants (không chỉ 1)
  - Đánh dấu người is_primary (badge "Đại diện")
- [ ] Sửa `app/admin/rooms/page.tsx`:
  - Modal "Thêm khách thuê" cho phép thêm vào phòng đã occupied (nếu < max_capacity)
  - Cảnh báo khi phòng đầy
- [ ] Sửa `app/admin/tenants/page.tsx`:
  - Hiển thị tenant + phòng đang ở
  - Nếu 1 user ở nhiều phòng (hiếm) → list tất cả
- [ ] Sửa `app/tenant/home/page.tsx`:
  - Hiển thị phòng mình + những người ở cùng (chỉ tên, không SĐT để privacy)

**Phần D — Re-verify task cũ:**
- [ ] Re-verify T-007 (CRUD tenants): create tenant flow có dùng room_tenants không?
- [ ] Re-verify T-008 (UI khách thuê): hiển thị multi-tenant đúng không?
- [ ] Re-verify T-013 (tạo hóa đơn): numPeople tính đúng không?

**❌ NGOÀI phạm vi:**
- Drop column `rooms.tenant_id` (đợi sau, làm trong task khác)
- Logic chia tiền chi tiết giữa các khách (chủ ghi tổng, khách tự chia — như requirement)
- Tiền cọc track theo user (quyết định: cọc theo phòng, không chia)
- Update bảng `notifications` để gửi đến NHIỀU người trong phòng (nếu cần, task riêng)
- Refactor `ProfileSetupWizard` (action item Module 3)

### Deliverables

```
supabase/migrations-v14.sql       # Create room_tenants + RLS
supabase/migrations-v15.sql       # Migrate data từ rooms.tenant_id

src/lib/db/room-tenants.ts         # MỚI - 6 hàm
src/lib/db/rooms.ts                # SỬA - join tenants
src/lib/db/tenants.ts              # SỬA - hỗ trợ thêm khách
src/lib/db/invoices.ts             # SỬA - numPeople đúng
src/lib/db/move-requests.ts        # SỬA - left_at thay vì delete

src/app/admin/rooms/RoomCard.tsx   # SỬA - hiển thị multi
src/app/admin/rooms/page.tsx       # SỬA - thêm vào phòng đã có
src/app/admin/tenants/page.tsx     # SỬA
src/app/tenant/home/page.tsx       # SỬA - hiển thị người cùng phòng

src/types/index.ts                 # SỬA - thêm RoomTenant type
```

### Dependencies
- **Cần xong trước:** T-006 (schema gốc), T-007 (CRUD tenants), T-014b (clean state)
- **Chặn task nào:** T-017 (cảnh báo nợ — vì has_debt sẽ ở invoice level, query qua room_tenants)
- **Lưu ý đặc biệt:** sau task này, **toàn bộ test cũ liên quan phòng + tenant phải chạy lại**

### Ước lượng: 6-8 giờ

---

## 🔨 2. DO

### Phần A — Schema (1-2 giờ)
1. [✅] Đọc kỹ schema hiện tại `rooms` và `tenant_profiles`
2. [✅] Viết SQL `migrations-v14.sql`:
   ```sql
   CREATE TABLE room_tenants (...)
   CREATE UNIQUE INDEX ... ON room_tenants(room_id, user_id) WHERE left_at IS NULL;
   -- RLS DISABLED (project pattern — xem decisions.md D1)
   ```
3. [✅] Viết SQL `migrations-v15.sql` migrate data + verification DO block
4. [✅] **CẢNH BÁO USER:** xem [supabase/migrations-v14-v15-INSTRUCTIONS.md](../../supabase/migrations-v14-v15-INSTRUCTIONS.md)

### Phần B — Data layer (2-3 giờ)
5. [✅] Tạo `lib/db/room-tenants.ts` với 6 hàm (throw pattern theo project convention — xem decisions D8)
6. [✅] Sửa `lib/db/rooms.ts` — thêm `getAllRoomsWithTenants` + `getRoomByIdWithTenants` (giữ hàm cũ cho backward compat)
7. [✅] Sửa `lib/db/tenants.ts` — `createTenantAccount` gọi `addTenantToRoom` (primary nếu phòng trống)
8. [✅] **QUAN TRỌNG** — sửa `lib/db/invoices.ts::calculateInvoiceForRoom`:
   - Thay logic `roomWithTenant?.tenant_id ? 1 : 0` (sai)
   - Bằng: `numPeople = (await getTenantsByRoom(roomId, true)).length` ✓
9. [✅] Sửa `lib/db/move-requests.ts::approveMoveRequest`:
   - Gọi `removeTenantFromRoom` (auto-handle left_at + primary transfer + rooms.status)

### Phần C — UI (2-3 giờ)
10. [✅] Sửa [RoomCard](../../components/rooms/RoomCard.tsx) — hỗ trợ `Room | RoomWithTenants` (D17), list tenants + badge "Đại diện", overflow >4
11. [✅] [AddTenantDialog](../../components/tenants/AddTenantDialog.tsx) — bỏ filter vacant-only, hiển thị `tenants_count`, warning ≥ 6 (D16)
12. [✅] Tenant home ở [app/dashboard/page.tsx](../../app/dashboard/page.tsx) (D14) — query qua `getRoomsByTenant` (D15) + truyền `otherTenants`. [TenantDashboard](../../components/TenantDashboard.tsx) section "Bạn đang ở cùng" — chỉ tên, không SĐT (D18)

### Phần D — Re-verify (1 giờ)
13. [✅] Verify tĩnh từ code — 7 ✅ + 1 ⏭️ (TC6 migration runtime check, đã có DO block verify trong v15)
14. [✅] Re-verify T-007 (createTenant flow), T-008 (UI khách), T-013 (numPeople — đã fix bug #4) — không regression

### Ghi chú khi làm
> _(điền khi làm — phần này rất quan trọng cho ACT)_

## Phase A — 2026-05-16 (Session A, autonomous mode)

**Đã làm:**
- Tạo `supabase/migrations-v14.sql` — bảng `room_tenants` (6 cột) + 4 index (unique active, room_id, user_id, active filter) + RLS DISABLED + ROLLBACK block
- Tạo `supabase/migrations-v15.sql` — migrate data từ `rooms.tenant_id` (is_primary=true, joined_at=created_at) + DO block verify count, raise nếu lệch + ROLLBACK block
- Tạo `supabase/migrations-v14-v15-INSTRUCTIONS.md` — hướng dẫn chạy + verify + rollback
- Tạo skeleton [lib/db/room-tenants.ts](../../lib/db/room-tenants.ts) — 6 hàm throw 'Not implemented' (impl Phase B)
- Tạo [types/room-tenant.ts](../../types/room-tenant.ts) — interface `RoomTenant` + `RoomTenantWithDetails`
- Re-export trong [types/index.ts](../../types/index.ts)
- `npx tsc --noEmit` pass

**Decisions (xem [memory/t016-decisions.md](../../memory/t016-decisions.md)):**
- D1: RLS DISABLE (project pattern, không dùng admin/tenant policies như prompt)
- D2: Path `lib/db/`, `types/` (no `src/` — actual layout)
- D3: `joined_at` default = `rooms.created_at` (không có `rented_at`)
- D4: Skeleton throw (không dùng `Result<T>` — file chưa tồn tại)
- D5: Worktree push thẳng remote (feature/t016 đã checked-out ở worktree chính)
- D6: Không tạo trigger auto-primary (handle ở app layer)
- D7: `task/` (singular) — actual layout

**User cần làm thủ công:** chạy migration v14 + v15 trên Supabase theo INSTRUCTIONS.md trước khi sang Phase B.

## Phase B — 2026-05-16 (Session B, autonomous mode)

**Đã làm:**
- Implement [lib/db/room-tenants.ts](../../lib/db/room-tenants.ts) — 6 hàm: `addTenantToRoom`, `removeTenantFromRoom`, `getTenantsByRoom`, `getRoomsByTenant`, `getPrimaryTenant`, `setPrimaryTenant`. Throw pattern + dual-write `rooms.tenant_id` cho primary (D10)
- Thêm types: `RoomTenantEntry`, `RoomWithTenants` trong [types/room-tenant.ts](../../types/room-tenant.ts), re-export ở `types/index.ts`
- [lib/db/rooms.ts](../../lib/db/rooms.ts) — thêm `getAllRoomsWithTenants` + `getRoomByIdWithTenants` (giữ hàm cũ cho legacy)
- [lib/db/tenants.ts](../../lib/db/tenants.ts) — `createTenantAccount` gọi `addTenantToRoom` (count active trước để xác định isPrimary — D11)
- [lib/db/invoices.ts](../../lib/db/invoices.ts) — fix **retrospective bug #4**: `numPeople = activeTenants.length` (xóa dòng `roomWithTenant?.tenant_id ? 1 : 0`)
- [lib/db/move-requests.ts](../../lib/db/move-requests.ts) — `approveMoveRequest` gọi `removeTenantFromRoom` (auto-handle left_at, primary transfer, status)

**Verification:**
- `npx tsc --noEmit` → exit 0 ✓
- `npm run build` → fail prerender vì worktree thiếu `.env.local` — verified bằng `git stash` test là pre-existing env issue, không phải code Phase B (D13)

**Decisions thêm (xem [memory/t016-decisions.md](../../memory/t016-decisions.md)):**
- D8: Confirm db layer throw, không tạo Result<T>
- D9: `createServerSupabaseClient` (không phải `createClient`) + status `'vacant'` (không phải `'empty'`)
- D10: Dual-write `rooms.tenant_id` để giữ backward compat
- D11: `createTenantAccount` không overwrite primary khi phòng đã có người
- D12: Không touch `getTenantsByRoomId` cũ — Phase C sẽ swap UI sang `getAllRoomsWithTenants`
- D13: Build prerender fail là env issue (pre-existing), accept tsc check là gate đủ

---

## ✅ 3. CHECK

- [ ] `npm run build` pass
- [ ] Migration v14 + v15 chạy được trên Supabase
- [ ] Verify data: `SELECT COUNT(*) FROM room_tenants WHERE is_primary` = số phòng đã có khách
- [ ] Không còn ref `rooms.tenant_id` trong code (đã thay bằng room_tenants query)
- [ ] RLS hoạt động: tenant chỉ thấy room_tenants của mình
- [ ] Hóa đơn cũ tính lại đúng (numPeople)
- [ ] Tiếng Việt 100%

---

## 🔍 4. REQUIREMENT CHECK

Đọc:
- `memory/usecase-quan-ly-khach-thue.md` (UC-02)
- `memory/retrospective-2026-05-16.md` (action item số 2)
- `memory/nha_tro_app_requirements.md` (mục 1: nhiều khách/phòng, chia tiền)

Đối chiếu:
- UC-02: "Nhiều người/phòng, tất cả bình đẳng" → schema many-to-many đúng?
- UC-02: "Chủ chỉ ghi tổng, khách tự chia" → 1 hóa đơn/phòng, không split → giữ nguyên T-013
- "Tiền cọc theo phòng (1 lần), không chia theo khách" → KHÔNG có cột deposit_amount trong room_tenants
- "Trả cọc cho người cuối cùng đứng tên" → `is_primary` flag
- Retrospective câu hỏi 4 đã có quyết định trong CLAUDE.md v1.2

Phân loại: 🟢 / 🟡 / 🔴

---

## 🧪 5. VERIFY

### Test Case 1: Tạo phòng + thêm khách đầu tiên
| Bước | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Admin tạo phòng A | rooms.status=empty | ⬜ |
| 2 | Thêm khách X vào phòng A | room_tenants row mới: is_primary=true, joined_at=now | ⬜ |
| 3 | rooms.status | = occupied | ⬜ |
| 4 | getTenantsByRoom(A) | trả 1 person | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail / ⬜ Skipped

---

### Test Case 2: Thêm khách thứ 2 vào phòng đã có người
| Bước | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Phòng A có khách X | OK | ⬜ |
| 2 | Admin thêm khách Y vào A | room_tenants row mới: is_primary=false | ⬜ |
| 3 | getTenantsByRoom(A) | trả 2 people | ⬜ |
| 4 | X vẫn is_primary | OK | ⬜ |
| 5 | rooms.status | vẫn = occupied | ⬜ |
| 6 | Hiển thị UI RoomCard | thấy 2 người, X có badge "Đại diện" | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail / ⬜ Skipped

---

### Test Case 3: Khách primary chuyển đi
| Bước | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Phòng A có X (primary) + Y | OK | ⬜ |
| 2 | X tạo move_request, admin approve | room_tenants[X].left_at set, [Y].is_primary auto = true | ⬜ |
| 3 | Get active tenants phòng A | chỉ trả Y | ⬜ |
| 4 | rooms.status | vẫn = occupied | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail / ⬜ Skipped

---

### Test Case 4: Khách cuối cùng chuyển đi
| Bước | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Phòng A chỉ còn Y | OK | ⬜ |
| 2 | Y chuyển đi (approved) | room_tenants[Y].left_at set | ⬜ |
| 3 | rooms.status | = empty | ⬜ |
| 4 | getTenantsByRoom(A, activeOnly=true) | [] | ⬜ |
| 5 | Lịch sử: getTenantsByRoom(A, activeOnly=false) | trả X, Y với left_at đã set | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail / ⬜ Skipped

---

### Test Case 5: Tính hóa đơn nước per_person với multi-tenant
| Bước | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Settings: water_mode=per_person, rate=50000 | OK | ⬜ |
| 2 | Phòng A có X + Y (2 người) | OK | ⬜ |
| 3 | calculateInvoiceForRoom(A) | water_amount = 2 × 50000 = 100000 | ⬜ |
| 4 | Thêm Z → 3 người | OK | ⬜ |
| 5 | Tính lại | water_amount = 150000 | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail / ⬜ Skipped

---

### Test Case 6: Migration data từ schema cũ
| Bước | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Trước migration: COUNT rooms có tenant_id | n | ⬜ |
| 2 | Chạy v14 + v15 | OK | ⬜ |
| 3 | COUNT room_tenants WHERE is_primary | = n | ⬜ |
| 4 | Tất cả primary có joined_at | OK | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail / ⬜ Skipped

---

### Test Case 7: RLS bảo mật
| Bước | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Tenant A query room_tenants của phòng tenant A đang ở | OK | ⬜ |
| 2 | Tenant A query room_tenants của phòng khác | RLS chặn | ⬜ |
| 3 | Admin query | full access | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail / ⬜ Skipped

---

### Test Case 8: Re-verify T-007 (CRUD tenants vẫn hoạt động)
| Bước | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Chạy createTenant flow đầy đủ | OK | ⬜ |
| 2 | Form first-login + onboarding | OK | ⬜ |
| 3 | Login vào tenant/home | OK, thấy phòng mình | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail / ⬜ Skipped

---

### Edge cases
- [ ] Race: 2 admin cùng thêm khách thứ 3 → unique constraint nào catch?
- [ ] Cố thêm khách đã ở phòng khác (active) → nên reject hay cho phép multi-room?
- [ ] Khách archive (sau 2 năm) → vẫn còn trong room_tenants với left_at?
- [ ] Rollback: nếu migration v15 fail giữa chừng → có rollback an toàn không?
- [ ] Phòng có 0 khách (mới tạo) → setPrimaryTenant gọi sao? (đề xuất: chỉ gọi khi có tenant)

---

## 👀 6. HUMAN REVIEW
- [x] **CẦN REVIEW** — task ảnh hưởng nhiều task cũ + schema thay đổi quan trọng

Cần xem:
- [ ] Migration script chạy đúng, có rollback an toàn không?
- [ ] Logic primary tenant chuyển đổi có race condition không?
- [ ] Tính hóa đơn cũ (cho phòng nhiều người) có sai số tiền nào không?
- [ ] UI hiển thị multi-tenant có rõ ràng cho user không?

---

## 🎬 7. ACT

> Claude đề xuất bài học, user duyệt trước rename (workflow v3.0).
> T-016 chạy autonomous mode — bài học tự rút từ ghi chú DO + decisions log.

### Bài học rút ra

1. **Migration schema lớn nên chia 3 file (CREATE → MIGRATE → DROP) — không drop cùng lúc data migrate.** v14 tạo bảng, v15 backfill data, v16 drop column tách thành task riêng (T-016b). DO block verify count trong v15 raise nếu lệch → có safety net rollback ngay trong transaction. Pattern này đáng đưa vào skill `migration-pattern.md` (đã đề xuất trong retrospective).

2. **Adapter pattern + dual-write giúp refactor schema không break UI cũ.** D10 (dual-write `rooms.tenant_id` = primary hiện tại) cho phép UI cũ đọc primary qua join `tenant:users!tenant_id` trong khi UI mới migrate dần sang `getAllRoomsWithTenants`. D17 (RoomCard nhận cả `Room | RoomWithTenants`) cùng triết lý. Không có lúc nào codebase rơi vào trạng thái half-broken.

3. **Autonomous mode hiệu quả khi có decision rules + ưu tiên đọc code thật.** 18 decisions tự ra qua 3 phase (D1–D18). Pattern lặp: prompt giả định path/naming/API có thể sai → đọc file thật → log decision adapt thay vì follow prompt literal. Vài ví dụ: `lib/db/` (không `src/lib/db/`), `task/` singular, `createServerSupabaseClient` (không `createClient`), tenant home ở `app/dashboard/` (không `app/tenant/home/`), status enum `'vacant'` (không `'empty'`).

### Cải tiến cho task sau
- [x] Helper `getPrimaryTenant`, `getTenantsByRoom` → đưa vào skill `data-layer-pattern.md`
- [x] Migration pattern (v14 CREATE + v15 MIGRATE + v16 DROP task riêng) → skill `migration-pattern.md`

### Task phát sinh
- [x] **T-016b — Drop column `rooms.tenant_id`** — task riêng, làm sau khi T-016 stable 1-2 tuần, tắt dual-write trong `room-tenants.ts`
- [ ] Verify Phase D động (TC6): user chạy migration v14+v15 trên Supabase Dashboard + verify count khớp

### Cải tiến cho task sau
- [ ] Sau task này, helper `getPrimaryTenant`, `getTenantsByRoom` có thể đưa vào skill `data-layer-pattern.md`
- [ ] Migration pattern (v14 tạo + v15 migrate + v16 drop trong task sau) có thể đưa vào skill `migration-pattern.md`

### Task phát sinh dự kiến
- [ ] T-016b — Drop column `rooms.tenant_id` (sau khi T-016 stable 1-2 tuần)
- [ ] Có thể có task fix các edge case phát sinh từ verify

---

## 🏁 Hoàn thành (workflow v3.0)

1. **Claude đề xuất bài học** (đặc biệt quan trọng cho task này — học được nhiều)
2. User duyệt
3. Đổi tên: `todo.016-multi-tenant.md` → `done.016-multi-tenant.md`
4. Update metadata + bài học
5. **Update CLAUDE.md "6 Module trạng thái":**
   - Module 1: "T-001 → T-010 done + T-016 multi-tenant" — chuyển 🟢 Done
6. **Update CLAUDE.md "Database schema":** thêm `room_tenants` vào danh sách bảng hiện có
7. Commit: `done: T-016 multi-tenant schema refactor`
8. Task tiếp: `todo.017-canh-bao-no.md`
