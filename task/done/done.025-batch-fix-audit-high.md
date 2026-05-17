# T-025 — Batch fix HIGH/CODE từ audit T-024 + SW navigation strategy

## Trạng thái: 🟢 Done
## Ngày tạo: 2026-05-17
## Ngày hoàn thành: 2026-05-17
## Ước lượng: 1-2 giờ
## Áp dụng Phase E: ⏭️ Skipped (user decision — batch fix precedent-based, low risk; dồn Phase E vào T-021 ở Step 5)
## Phase E mode: auto (defer execution — files seed/verify/cleanup đã chuẩn bị sẵn cho re-run sau nếu cần)
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

### Trạng thái: ⏭️ Skipped per user decision

User chọn Option 3 (Skip Phase E T-025, dồn vào T-021 Step 5). Lý do:
- T-025 là batch fix theo audit precedent (T-024 đã review 15 issue có evidence)
- Build pass + tsc pass + anti-pattern audit Phase C BƯỚC 4 pass
- Risk thấp: 5 force-dynamic theo precedent `app/admin/finance/payments/page.tsx:9`,
  revalidatePath theo precedent T-016c `createTenantAction`, SW strategy A từ T-021 root cause
- T-021 Step 5 là moment of truth thực sự (end-to-end flow + revalidate verify)

### File seed/verify/cleanup (giữ cho re-run)

- `task/todo/025/seed.sql` (E3 tenant + room assignment)
- `task/todo/025/verify.sql` (move_requests + notifications)
- `task/todo/025/cleanup.sql` (delete prefix 0911999)

Khi rename → done, di chuyển sang `task/done/025/`.

### Smoke test cases (chuẩn bị cho re-run sau nếu cần)

| # | Test | Cách làm | Pass criteria |
|---|---|---|---|
| E1 | SW skip navigation | javascript_tool: navigator.serviceWorker + performance.getEntriesByType + caches.keys | cacheNames includes 'aloha-v6', transferSize > 0 |
| E2 | 5 page force-dynamic | javascript_tool: fetch HEAD 5 path, đọc response.headers.get('Cache-Control') | Mọi page no-store/no-cache, không public |
| E3 | createMoveRequest → admin thấy ngay | Impersonate tenant → submit form, impersonate owner → F5 thường /admin/move-requests | DOM chứa "Test T025 E3" sau revalidate |

## ACT

1. **force-dynamic phải có khi page dùng cookies() trực tiếp hoặc gián tiếp (qua getCurrentUser).** (CODE)
   Dù `cookies()` ngầm trigger dynamic, response Cache-Control có thể không đủ `no-store`. Browser HTTP cache + SW cache có thể serve stale. Convention codebase: 8 page admin/finance đã có; T-025 bổ sung cho 5 page nữa (home, notifications, chat, admin/tenants, rooms). Pattern reference: `app/admin/finance/payments/page.tsx:9`.

2. **Cross-role server action phải revalidate cả 2 path (tenant + admin).** (CODE)
   `createMoveRequestAction` insert vào `move_requests` + `notifications` cho admin. Chỉ revalidate `/tenant/move-out` không đủ — admin view stale. Pattern T-016c `createTenantAction` (4 path: `/admin/tenants` + `/rooms` + `/home` + `/dashboard`) là template chuẩn. Cancel/reject cũng cần revalidate symmetric.

3. **Service worker design: skip navigation requests cho data-driven page.** (LOGIC — đã user duyệt strategy A ở Step 4.2)
   SW cache-first cho HTML là root cause T-021 Phase E E2/E3 fail. Server-side revalidate + force-dynamic bị vô hiệu hóa nếu SW return cached HTML. Strategy A (skip navigation entirely + bump CACHE) là cleanest. Decision logged tại Step 4.2 user AskUserQuestion.

4. **Phase E skippable cho batch fix precedent-based — nếu fix theo template có evidence + Phase C anti-pattern audit pass.** (Tier LOW process decision — user chose Option 3)
   T-025 là 5 force-dynamic + 1 SW exclusion + 1 revalidate addition. Tất cả có precedent reference rõ trong audit. Risk fix sai pattern thấp. Build pass + tsc pass + Phase C BƯỚC 4 audit pass đủ để trust. Dồn Phase E energy vào T-021 ở Step 5 (end-to-end real flow validation).

## Auto-decisions

- [Tier LOW] 2026-05-17 — `cancelMoveRequestAction` cũng thêm `revalidatePath('/admin/move-requests')`. Lý do: cancel xóa pending request, admin list phải refresh — symmetric với create.
- [Tier LOW] 2026-05-17 — Đặt `export const dynamic = 'force-dynamic'` sau imports, trước function declaration. Lý do: theo precedent `app/admin/finance/payments/page.tsx:9`.
- [Tier LOW] 2026-05-17 — Bump SW CACHE v5 → v6 (user duyệt). Lý do: change SW logic phải bump để force activate handler delete old caches.
- [Tier LOW] 2026-05-17 — Skip Phase E auto cho T-025 (user duyệt Option 3). Lý do: batch fix precedent-based, dồn energy vào T-021. SQL files keep cho re-run sau nếu cần.
