# T-025 — Batch fix HIGH/CODE từ audit T-024 + SW navigation strategy

## Trạng thái: 🔴 Đang làm
## Ngày tạo: 2026-05-17
## Ước lượng: 1-2 giờ
## Áp dụng Phase E: ✅ Yes (UI runtime impact — SW + force-dynamic)
## Phase E mode: auto
## Branch: feature/t025-batch-fix-audit-high

## Bối cảnh
T-024 audit phát hiện 15 issue + 3 bonus. Batch này fix các issue HIGH/CODE có precedent reference + Issue #1 CRITICAL/LOGIC (SW navigation — đã user duyệt strategy A).

## Trong scope

### Issue #1 (CRITICAL/LOGIC — user duyệt strategy A)
- `public/sw.js`: skip navigation/HTML từ SW cache
- Bump CACHE version v5 → v6

### Issue #3a (HIGH/CODE) — Thêm `force-dynamic` cho 3 page còn lại
- `app/home/page.tsx`
- `app/notifications/page.tsx`
- `app/chat/page.tsx`
- (Lưu ý: `app/dashboard/page.tsx` đã có ở branch t021, sẽ merge sau)

### Issue #4 (HIGH/CODE) — createMoveRequestAction
- `app/tenant/move-out/actions.ts`: thêm revalidatePath `/admin/move-requests` + `/notifications`

### Issue #5 (HIGH/CODE) — admin/tenants + rooms static-render risk
- `app/admin/tenants/page.tsx`: thêm `export const dynamic = 'force-dynamic'`
- `app/rooms/page.tsx`: thêm `export const dynamic = 'force-dynamic'`

## Ngoài scope
- Issue #2 approveMoveRequestAction revalidatePath (đã có ở branch t021, sẽ merge sau T-025)
- Issue #3b MEDIUM force-dynamic (profile × 3, community) — defer T-027
- Issue #6 transactional wrap — defer
- Issue #7-10 MEDIUM cross-role revalidate — defer T-027
- Issue #11 router.refresh() — defer T-027
- Issue #12-15 + bonus — defer
- 4 page redirect-only (`app/page.tsx`, `app/login/page.tsx`) — không cần force-dynamic

## Phase E — Runtime Smoke Test (mode: auto)

⚠️ Bắt buộc pass trước khi rename todo → done.

### Smoke test cases

| # | Test | Cách làm | Pass criteria |
|---|---|---|---|
| E1 | SW skip navigation | curl `/dashboard` với cookie 2 lần, check `Cache-Control` header + body diff khi data đổi | Cả 2 lần đều fresh (no stale HTML) |
| E2 | 5 page mới force-dynamic | curl `/home`, `/notifications`, `/chat`, `/admin/tenants`, `/rooms` với cookie → check `Cache-Control: no-store` hoặc `private` | Mọi page trả no-store/no-cache |
| E3 | createMoveRequest → admin thấy ngay | Tenant create move request via action → check `/admin/move-requests` page sau F5 | Request mới hiển thị không cần hard refresh |

### SQL verify queries
- Verify cleanup test data sau Phase E
- Check `move_requests` insert thành công

### Kết luận
- [ ] E1 pass
- [ ] E2 pass
- [ ] E3 pass
- [ ] Không phát hiện regression task cũ

## Auto-decisions

- [Tier LOW] 2026-05-17 — `cancelMoveRequestAction` cũng thêm `revalidatePath('/admin/move-requests')`. Lý do: cancel xóa pending request, admin list phải refresh — symmetric với create. Precedent: pattern parallel cho approve/reject ở `app/admin/move-requests/actions.ts`.
- [Tier LOW] 2026-05-17 — Đặt `export const dynamic = 'force-dynamic'` sau imports, trước function declaration. Lý do: theo precedent `app/admin/finance/payments/page.tsx:9`.
- [Tier LOW] 2026-05-17 — Bump SW CACHE v5 → v6 (user duyệt). Lý do: change SW logic phải bump để force activate handler delete old caches.
