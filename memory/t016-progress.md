# T-016 Progress — Multi-Tenant Schema Refactor

Branch (worktree): `claude/upbeat-cori-d3cfd5` (push lên `feature/t016-multi-tenant`)
Start: 2026-05-16

## Phase A — Schema [🟢 DONE]
- [✅] Đọc schema cũ
- [✅] Viết migrations-v14.sql (CREATE room_tenants — RLS disabled per project pattern + ROLLBACK)
- [✅] Viết migrations-v15.sql (Migrate data + verification + ROLLBACK)
- [✅] Test SQL syntax bằng đọc lại + verify references
- [✅] Tạo lib/db/room-tenants.ts (skeleton, hàm impl ở Session B)
- [✅] Tạo types/room-tenant.ts
- [✅] Cập nhật types/index.ts (re-export)
- [✅] Commit + push (commit 7c8cd7b)

## Phase B — Data Layer [🟢 DONE]
- [✅] Implement lib/db/room-tenants.ts (6 hàm: addTenantToRoom, removeTenantFromRoom, getTenantsByRoom, getRoomsByTenant, getPrimaryTenant, setPrimaryTenant) — throw pattern + dual-write rooms.tenant_id cho primary
- [✅] Thêm RoomWithTenants + RoomTenantEntry vào types/room-tenant.ts
- [✅] Thêm getAllRoomsWithTenants + getRoomByIdWithTenants vào lib/db/rooms.ts (giữ hàm cũ getAllRooms/getRoomById)
- [✅] Sửa lib/db/tenants.ts::createTenantAccount → gọi addTenantToRoom (primary nếu phòng trống, non-primary nếu đã có người)
- [✅] Fix lib/db/invoices.ts::calculateInvoiceForRoom → numPeople = active room_tenants count (retrospective bug #4)
- [✅] Sửa lib/db/move-requests.ts::approveMoveRequest → gọi removeTenantFromRoom (auto-handle primary transfer + status)
- [✅] TypeScript check: `npx tsc --noEmit` exit 0
- [⚠️] Build (`npm run build`): fail prerender vì worktree không có .env.local — **pre-existing env issue, không liên quan T-016** (verified bằng git stash pop test)
- [✅] Commit + push

## Phase C — UI [⬜ Chưa bắt đầu]
## Phase D — Verify [⬜ Chưa bắt đầu]

## Decisions Log
Xem [memory/t016-decisions.md](t016-decisions.md) — 12 quyết định auto-decided.
