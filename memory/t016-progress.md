# T-016 Progress — Multi-Tenant Schema Refactor

Branch (worktree): `claude/upbeat-cori-d3cfd5` (sẽ push lên `feature/t016-multi-tenant`)
Start: 2026-05-16

## Phase A — Schema [🟡 IN PROGRESS]
- [✅] Đọc schema cũ
- [✅] Viết migrations-v14.sql (CREATE room_tenants — RLS disabled per project pattern + ROLLBACK)
- [✅] Viết migrations-v15.sql (Migrate data + verification + ROLLBACK)
- [✅] Test SQL syntax bằng đọc lại + verify references
- [✅] Tạo lib/db/room-tenants.ts (skeleton, hàm impl ở Session B)
- [✅] Tạo types/room-tenant.ts
- [✅] Cập nhật types/index.ts (re-export)
- [✅] Commit + push

## Phase B — Data Layer [⬜ Chưa bắt đầu]
## Phase C — UI [⬜ Chưa bắt đầu]
## Phase D — Verify [⬜ Chưa bắt đầu]

## Decisions Log
Xem [memory/t016-decisions.md](t016-decisions.md) — 7 quyết định auto-decided.
