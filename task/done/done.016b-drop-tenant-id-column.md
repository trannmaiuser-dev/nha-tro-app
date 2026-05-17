# T-016b — Drop column `rooms.tenant_id` (cleanup multi-tenant)

## Trạng thái: 🟢 Done (chờ user apply migration v18)
## Ngày tạo: 2026-05-16
## Ngày hoàn thành: 2026-05-18
## Ước lượng: 2 giờ thực tế (spec dự 30-45p — under-estimated, scope mở rộng do PG function v16 + bonus callsites)
## Áp dụng Phase E: 🟡 Manual (user apply migration v18 + smoke test)
## Phase E mode: manual
## Branch: feature/t016b-drop-tenant-id-column

## Bối cảnh

T-016 (2026-05-16) multi-tenant migration dùng dual-write `rooms.tenant_id` + `room_tenants` để code legacy không vỡ. Decision D10 ([memory/t016-decisions.md:114-126](memory/t016-decisions.md:114)). T-016c/d hoàn tất UI refactor. T-026 thêm 2 PG function (`approve_move_request`, `create_tenant_account`) — cũng dùng `rooms.tenant_id`.

T-016b: drop column legacy + recreate 2 PG functions không ref tenant_id.

## Trong scope

### Code refactor (13 file, 7 layer)

1. **`lib/db/rooms.ts`** (6 functions):
   - `getAllRooms`/`getRoomById`: bỏ `tenant:users!tenant_id` join, return chỉ `*`
   - `createRoom`: bỏ `tenant_id: null` từ insert
   - `deleteRoom`: replace check `room.tenant_id` bằng count `room_tenants` active
   - `searchRoomsByTenantName`: rewrite join qua `room_tenants!room_id` + filter app layer
   - `getAllRoomsWithTenants`/`getRoomByIdWithTenants`: bỏ `tenant:users!tenant_id` từ select

2. **`lib/db/tenants.ts`** (4 functions):
   - `getAllTenants`/`getTenantById`/`searchTenants`: thay `rooms!tenant_id(...)` join bằng `room_tenants!user_id(is_primary, left_at, room:rooms!room_id(...))` + helper `extractPrimaryRoom` map about layer
   - `getTenantsByRoomId`: rewrite via 2-query pattern (room_tenants → user_ids → users), multi-tenant correct

3. **`lib/db/room-tenants.ts`** (3 functions, dual-write tắt):
   - `addTenantToRoom`: bỏ `update({ tenant_id })`, giữ `update({ status: 'occupied' })`
   - `removeTenantFromRoom`: bỏ tenant_id sync, giữ status sync (count=0 → vacant)
   - `setPrimaryTenant`: bỏ tenant_id sync, function chỉ còn update `room_tenants.is_primary`

4. **`types/index.ts`**:
   - `Room`: remove `tenant_id: string | null` + `tenant?: User | null`

5. **`components/`**:
   - `TenantDashboard.tsx`: remove `tenant_id: string | null` từ Room interface
   - `RoomCard.tsx`: remove legacy fallback rendering `room.tenant`
   - `RoomList.tsx`: remove `r.tenant?.full_name` từ search filter

6. **`app/`**:
   - `dashboard/page.tsx`: remove tenant_id từ TenantRoomShape + query select
   - `profile/page.tsx`: query phòng qua `room_tenants`
   - `profile/[userId]/page.tsx`: same
   - `tenant/move-out/actions.ts`: query room_id qua `room_tenants`
   - `tenant/guests/actions.ts`: same
   - `api/owner/bulk-remind/route.ts`: query primary tenant qua `room_tenants` (impact: bulk remind nay multi-tenant correct, chỉ remind primary)
   - `admin/finance/invoices/[id]/export/route.ts`: query primary tenant cho PDF tenant_name qua `room_tenants`

7. **`scripts/seed.ts`**:
   - Remove tenant_id field từ rooms insert
   - Thêm `room_tenants` insert cho seed P201 (Anh Hùng làm primary)

### Migration v18 (`supabase/migrations-v18.sql`)
1. `CREATE OR REPLACE FUNCTION approve_move_request` — bỏ refs `rooms.tenant_id` (chỉ sync rooms.status)
2. `CREATE OR REPLACE FUNCTION create_tenant_account` — bỏ refs `rooms.tenant_id`
3. `ALTER TABLE rooms DROP COLUMN IF EXISTS tenant_id`
4. `NOTIFY pgrst, 'reload schema'` cho Supabase JS client

## Ngoài scope

- Refactor UI khác (đã làm xong ở T-016 Phase C)
- Refactor `payment_proofs.tenant_id`, `guests.tenant_id`, `tenant_documents.tenant_id`, etc. — đây là FK của bảng khác, KHÔNG phải `rooms.tenant_id` (cùng tên column, khác semantic)
- Delete `setPrimaryTenant` helper — vẫn export cho T-019/T-020 future
- Migrate user data từ existing rooms.tenant_id (đã có ở migration v15 sync sang room_tenants từ 2026-05-16)

## Decisions

- **D1:** Migration v18 (không phải v16 như spec gốc). Lý do: v16 đã dùng cho T-026 PG functions, v17 cho T-029 audit_logs. Sequential numbering preserved.
- **D2:** Recreate 2 PG function trong cùng migration v18 (single COMMIT). Lý do: drop column trước recreate function = function chết runtime. Phải recreate trước drop column trong cùng transaction.
- **D3:** Backward compat: code mới hoạt động dù chưa apply v18 (column còn, old PG functions còn ref). Lý do: giảm coupling deploy + migration. Safe rollout window.
- **D4:** `setPrimaryTenant` chỉ giữ logic update `room_tenants.is_primary`, function vẫn nhận `userId` param (void usage để keep signature). Lý do: T-019 ([task/todo/todo.019-them-khach-thu-2.md](task/todo/todo.019-them-khach-thu-2.md)) reference signature; thay đổi sẽ break future task.
- **D5:** `getTenantsByRoomId` rewrite 2-query thay vì single-query với nested join. Lý do: nested join `users.id in (SELECT user_id FROM room_tenants WHERE room_id=X AND left_at IS NULL)` không expressible thẳng trong Supabase JS chain — 2 query simpler + correct.
- **D6:** `extractPrimaryRoom` helper trong `lib/db/tenants.ts` thay vì cross-file helper. Lý do: chỉ 3 caller cùng file, premature shared abstraction. Local helper kept simple.
- **D7:** Bulk remind nay chỉ remind primary tenant (multi-tenant impact). Lý do: business decision UC-05 cảnh báo nợ "Tất cả khách trong phòng đều nhận warning" sẽ implement ở T-017 (debt warning). T-016b giữ semantic "1 reminder per occupied room" (= primary) như trước drop column.

## Auto-decisions

- [Tier LOW] 2026-05-18 — Migration v18 thay v16. Lý do: sequential preservation.
- [Tier LOW] 2026-05-18 — Skip Phase E auto, dùng manual với Claude-for-Google prompt (precedent T-026, T-029). Lý do: DB migration cần user apply trong Supabase Studio.
- [Tier LOW] 2026-05-18 — Backward compat ordering: code-only deploy OK trước migration. Lý do: giảm coupling, không break existing flow.

## ACT

1. **Spec estimate 30-45p severely under-counted scope thực.** (LOGIC — observation)
   - Spec list 8 files. Thực tế 13 files (5 bonus: bulk-remind, invoices export, RoomCard, RoomList, seed.ts).
   - Spec không account PG function v16 (created sau spec viết — T-016b spec 2026-05-16, T-026 RPC ra 2026-05-18).
   - Spec missed legacy fallback paths (RoomCard.tsx `room.tenant`, RoomList.tsx search).
   - Pattern: spec viết trước task khác merge — review trước implement, expand checklist nếu cần.

2. **Search bằng `rooms.tenant_id` literal không đủ — phải bao quát `from('rooms')` + `tenant:users!tenant_id` + `room.tenant` field access.** (CODE)
   - Grep pattern progressive: bắt đầu `tenant_id` literal, rồi narrow theo context (rooms FK vs other tables).
   - Initial grep cho 17 files, sau filter còn 13 thực sự rooms.tenant_id.
   - Pattern: cleanup task cần multi-pass grep + manual context verification.

3. **PG function dependency chain: function v16 ref column → drop column phải recreate function cùng transaction.** (CODE — DB design pattern)
   - Nếu drop column trước recreate function: function broken khi gọi.
   - Single transaction (BEGIN ... COMMIT) đảm bảo atomicity: drop + recreate đều rollback nếu fail.
   - Pattern: khi schema change ảnh hưởng PG function/view/trigger, phải recreate dependents trong cùng migration.

4. **`extractPrimaryRoom` helper local to file thay vì cross-file abstraction.** (CODE)
   - 3 callers (`getAllTenants`, `getTenantById`, `searchTenants`) cùng file.
   - Premature shared abstraction sẽ tốn code review + import overhead.
   - Pattern: rule of three apply at file scope, không project scope.

5. **Helper `setPrimaryTenant` giữ signature `(roomId, userId)` dù không còn dùng userId.** (Tier LOW — D4)
   - T-019/T-020 todo reference signature. Breaking change blocked future task.
   - `void userId` placeholder + comment giải thích.
   - Pattern: signature stability quan trọng hơn dead-code cleanup khi public export có downstream caller.

## Files thay đổi

```
supabase/migrations-v18.sql                              # NEW (~150 lines)
lib/db/rooms.ts                                          # 6 functions refactored
lib/db/tenants.ts                                        # 4 functions + extractPrimaryRoom helper
lib/db/room-tenants.ts                                   # 3 functions dual-write disabled
types/index.ts                                           # Room.tenant_id + Room.tenant removed
components/TenantDashboard.tsx                           # Room interface field removed
components/rooms/RoomCard.tsx                            # legacy fallback removed
components/rooms/RoomList.tsx                            # search filter cleaned
app/dashboard/page.tsx                                   # TenantRoomShape + select cleaned
app/profile/page.tsx                                     # query qua room_tenants
app/profile/[userId]/page.tsx                            # query qua room_tenants
app/tenant/move-out/actions.ts                           # query qua room_tenants
app/tenant/guests/actions.ts                             # query qua room_tenants
app/api/owner/bulk-remind/route.ts                       # query primary qua room_tenants
app/admin/finance/invoices/[id]/export/route.ts          # query primary qua room_tenants
scripts/seed.ts                                          # seed dùng room_tenants
task/done/done.016b-drop-tenant-id-column.md             # this file
work/t016b-apply-migration-prompt.md                     # Claude-for-Google migration prompt
```

## Verify

- ✅ tsc no errors (3 iterations: initial → fix RoomCard/RoomList → fix bulk-remind/export)
- ✅ next build success (no warnings)
- ✅ Phase C anti-pattern audit: DL1 ✓ (throw tiếng Việt preserved), BN1 ✓ (boolean explicit), SC ✓ (no SC change), SA ✓ (action revalidate unchanged), SW ✓ (no SW change)
- ✅ Backward compat: code mới hoạt động trước khi apply v18 (column còn, PG function ref OK)
- ✅ Final grep: chỉ 1 ref còn lại trong codebase — comment trong `lib/db/tenants.ts:58` (intentional doc)
- 🟡 Phase E manual: chờ user apply migration v18 + smoke test

## Phase E — Manual smoke test

User apply migration via Claude-for-Google. Prompt: [work/t016b-apply-migration-prompt.md](work/t016b-apply-migration-prompt.md).

Steps + verify queries documented trong prompt.
