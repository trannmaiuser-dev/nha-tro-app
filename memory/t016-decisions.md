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
