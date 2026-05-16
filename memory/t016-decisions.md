# T-016 Decisions Log — Auto-decided in autonomous mode

Ngày: 2026-05-16 · Phase A · Session A

---

## D1 — RLS: DISABLE (không tạo policies)

**Tình huống:** Prompt yêu cầu RLS với `admin_all` + `tenant_select_own`. Nhưng project pattern (toàn bộ migrations v2–v13) đều `DISABLE ROW LEVEL SECURITY` và dùng `SUPABASE_SERVICE_ROLE_KEY` từ server.

**Quyết định:** `ALTER TABLE room_tenants DISABLE ROW LEVEL SECURITY`. Authorization xử lý ở app layer (verifyOwner helpers trong server actions).

**Lý do:** Match project convention. Bật RLS trên 1 bảng đột ngột sẽ gây inconsistency và có thể chặn truy vấn server-side.

---

## D2 — Path layout: `lib/db/`, `types/` (no `src/` prefix)

**Tình huống:** Todo file `task/todo/todo.016-multi-tenant.md` và CLAUDE.md ghi `src/lib/db/`, `src/types/`. Nhưng thực tế project KHÔNG có `src/` — code ở root level.

**Quyết định:** Dùng path thật: `lib/db/room-tenants.ts`, `types/room-tenant.ts`.

**Lý do:** Verify bằng `ls`: chỉ có `app/`, `components/`, `lib/`, `types/`, `worker/`. Path `src/` không tồn tại.

---

## D3 — `joined_at` default: `rooms.created_at`

**Tình huống:** Todo nói `joined_at = COALESCE(rented_at, created_at)` nhưng bảng `rooms` không có cột `rented_at` (xem schema.sql + migrations v10/v12).

**Quyết định:** Dùng `rooms.created_at` làm `joined_at` cho primary tenant trong migration v15.

**Lý do:** Đây là dữ liệu gần nhất có (ngày tạo phòng = ngày bắt đầu thuê cho 4 phòng hiện tại).

---

## D4 — Skeleton lib/db: throw, không dùng `Result<T>`

**Tình huống:** Prompt skeleton dùng `Promise<Result<RoomTenant>>` với import `from '@/lib/types/action-result'`. Nhưng:
- `lib/types/action-result.ts` CHƯA TỒN TẠI (chỉ có `lib/types/community.ts`)
- DB layer hiện tại (rooms.ts, guests.ts, ...) đều throw error, không trả Result
- `Result<T>` là helper dự kiến cho Module 3

**Quyết định:** Skeleton trả type concrete + throw (như `rooms.ts`, `guests.ts`). Result<T> dành cho server-action layer.

**Lý do:** Match pattern thực tế. Nếu import `Result` từ file chưa tồn tại sẽ build fail.

---

## D5 — Worktree strategy

**Tình huống:** Phải làm việc trên `feature/t016-multi-tenant` nhưng branch đó đã checkout ở worktree chính `C:/aloha/nha-tro-app`. Không thể checkout 2 worktree cùng 1 branch.

**Quyết định:**
1. Code trong worktree hiện tại (`claude/upbeat-cori-d3cfd5`)
2. Commit lên branch worktree
3. Push thẳng commit lên remote `feature/t016-multi-tenant` bằng refspec: `git push origin claude/upbeat-cori-d3cfd5:feature/t016-multi-tenant`

**Lý do:** Pattern đã chạy thành công cho `.gitattributes` (commit c408901). Vì `claude/upbeat-cori-d3cfd5` đang ở cùng base với feature/t016 (`ff4191a`) → fast-forward sạch.

---

## D6 — Không tạo trigger auto-set primary tenant

**Tình huống:** Todo Phase B cần "Nếu primary rời → tự set người khác làm primary". Có thể làm bằng trigger DB hoặc app layer.

**Quyết định:** Phase A chỉ tạo bảng + index, KHÔNG tạo trigger. Logic primary chuyển đổi xử lý ở Phase B trong `lib/db/move-requests.ts`.

**Lý do:** Decision rule trong prompt: "Trigger chỉ tạo khi logic chắc chắn, ưu tiên handle ở app layer". Đồng thời dễ debug + test hơn.

---

## D7 — Task directory là `task/` singular

**Tình huống:** CLAUDE.md + todo-workflow.md ghi `tasks/`. Nhưng thực tế folder là `task/`.

**Quyết định:** Dùng `task/todo/todo.016-multi-tenant.md` (path thật).

**Lý do:** Verify bằng `ls`: folder tên `task` (singular).

---

# Phase B (Session B) — 2026-05-16

## D8 — Confirm D4: db layer throw, không tạo `Result<T>`

**Tình huống:** Prompt Session B mã mẫu dùng `Promise<Result<RoomTenant>>` với import từ `@/lib/types/action-result`. Prompt cũng ghi rõ "Adapt theo convention thật của project".

**Quyết định:** Implement 6 hàm room-tenants.ts với throw pattern (consistent D4 từ Session A). Trả type concrete.

**Lý do:**
- `lib/types/action-result.ts` vẫn chưa tồn tại
- Tất cả db file khác (rooms, tenants, guests, invoices, move-requests) đều throw → giữ nhất quán
- Result<T> dành cho server-action layer (sẽ tạo ở Module 3)

---

## D9 — Supabase client + status enum đúng convention thật

**Tình huống:** Prompt code mẫu dùng:
- `createClient()` from `@/lib/supabase/server`
- `rooms.status = 'empty'`

Nhưng thực tế:
- Project dùng `createServerSupabaseClient` from `@/lib/supabase-server` (không có folder `supabase/`)
- Schema CHECK constraint: `status IN ('vacant', 'occupied', 'maintenance')` — KHÔNG có `'empty'`

**Quyết định:** Dùng `createServerSupabaseClient` + `'vacant'`.

**Lý do:** Code mẫu trong prompt sai. Dùng `'empty'` sẽ FAIL constraint check ngay khi DB.

---

## D10 — Dual-write `rooms.tenant_id` cho backward compat

**Tình huống:** UI cũ + lib/db cũ (getAllRooms, deleteRoom, searchRoomsByTenantName...) đọc `rooms.tenant_id` để biết primary. Drop column này sẽ break UI ngay → để Phase C sau.

**Quyết định:** Phase B dual-write:
- `addTenantToRoom(isPrimary=true)` → sync `rooms.tenant_id = userId`, status = 'occupied'
- `addTenantToRoom(isPrimary=false)` → chỉ update status, KHÔNG đụng tenant_id
- `removeTenantFromRoom`:
  - Nếu rời là primary → next primary auto-promote, sync `rooms.tenant_id` sang user mới
  - Nếu phòng trống → `tenant_id = null`, status = 'vacant'
- `setPrimaryTenant` → sync `rooms.tenant_id` sang primary mới

**Lý do:** Single source of truth (room_tenants) cho membership mới, nhưng `rooms.tenant_id` luôn = primary hiện tại → code legacy không vỡ. T-016b sẽ drop column khi UI refactor xong.

---

## D11 — `createTenantAccount` không overwrite primary nếu phòng đã có người

**Tình huống:** Code cũ unconditionally set `rooms.tenant_id = newUser.id` khi tạo khách. Trong multi-tenant world, nếu phòng đã có primary thì overwrite sẽ "cướp" cờ primary của họ.

**Quyết định:** Count active room_tenants trước. Nếu = 0 → user mới là primary (isPrimary=true). Nếu > 0 → user mới join nhưng KHÔNG primary (isPrimary=false), primary cũ giữ nguyên.

**Lý do:** Đúng nghiệp vụ UC-02. Admin có thể `setPrimaryTenant` về sau nếu muốn đổi.

---

## D12 — Không touch `getTenantsByRoomId` cũ trong tenants.ts

**Tình huống:** `lib/db/tenants.ts::getTenantsByRoomId` hiện tại trả 0-or-1 tenant qua `rooms.tenant_id` subquery. Sai semantic cho multi-tenant.

**Quyết định:** Giữ nguyên trong Phase B. UI mới sẽ dùng `getAllRoomsWithTenants` hoặc `getTenantsByRoom` từ `lib/db/room-tenants`. UI cũ tiếp tục đọc primary qua hàm này.

**Lý do:** Đổi return type sẽ break callers. Phase C refactor UI sẽ swap import sang hàm mới, rồi T-016b xóa hàm cũ.

---

## D13 — Build prerender fail là vấn đề env, không phải code

**Tình huống:** `npm run build` fail tại prerender step với "Error: supabaseUrl is required". Worktree này không có `.env.local`.

**Quyết định:** Verify bằng `git stash` → build vẫn fail cùng error → confirm pre-existing env issue. Accept TypeScript check (`tsc --noEmit` exit 0) là gate đủ cho Phase B.

**Lý do:** Build static prerender cần Supabase env. Code Phase B compile sạch. Vấn đề env nằm ngoài scope T-016.
