# Codebase audit — Data flow patterns

**Date**: 2026-05-17
**Task**: T-024
**Branch**: feature/t024-audit-data-flow
**Commit base**: main HEAD `86c9943` (workflow v3.2: Phase E auto + 2 skill mới)
**Scope**: 4 layer (server actions, server components, lib/db, service worker). Inspect-only, no code change.

---

## Executive summary

- Total files scanned: ~43 file (12 server action files, 18 page server component, 12 lib/db file, 1 sw.js)
- Server actions: 12 files, ~25 actions
- Server components dùng cookies: 9 pages (qua `getCurrentUser`)
- Data layer functions: 12 files (no caching, all throw — pattern consistent)
- Service worker: 1 file (public/sw.js)

### Issue counts

| Severity | Count |
|---|---|
| CRITICAL | 1 |
| HIGH | 8 |
| MEDIUM | 6 |

### Top 5 issues by impact

1. **Issue #1 (CRITICAL)** — SW cache-first cho navigation HTML → toàn app stale sau F5 (root cause T-021 Phase E fail E2/E3)
2. **Issue #2 (HIGH)** — `approveMoveRequestAction` chỉ revalidate 1/4 path cần thiết (move-requests, dashboard, home, rooms)
3. **Issue #3 (HIGH)** — 8 server component dùng `getCurrentUser` thiếu `export const dynamic = 'force-dynamic'`
4. **Issue #4 (HIGH)** — `createMoveRequestAction` không revalidate `/admin/move-requests` + `/notifications` (admin không thấy request mới)
5. **Issue #5 (HIGH)** — `app/admin/tenants/page.tsx` + `app/rooms/page.tsx` không dùng cookies → có thể bị static-render, bypass middleware ở build cache

---

## Detailed inventory

### Server actions

| File | Actions | Tables mutated | revalidatePath calls | revalidateTag | redirect | Return |
|---|---|---|---|---|---|---|
| [app/admin/move-requests/actions.ts](app/admin/move-requests/actions.ts) | approveMoveRequestAction, rejectMoveRequestAction | move_requests, users.tenant_status, room_tenants, rooms (gián tiếp) | `/admin/move-requests` | none | none | `Result<void>` |
| [app/admin/tenants/actions.ts](app/admin/tenants/actions.ts) | createTenantAction | users, tenant_profiles, room_tenants, rooms | `/admin/tenants`, `/rooms`, `/home`, `/dashboard` | none | none | `Result<{...}>` |
| [app/admin/finance/payments/actions.ts](app/admin/finance/payments/actions.ts) | approveFullAction, approvePartialAction, rejectAction | payment_proofs, invoices (paid_amount) | `/admin/finance/payments`, `/admin/finance/invoices`, `/tenant/payments` (qua helper) | none | none | `Result` |
| [app/admin/finance/invoices/actions.ts](app/admin/finance/invoices/actions.ts) | previewInvoicesAction, createInvoicesAction, updateInvoiceAction, deleteInvoiceAction | invoices | `/admin/finance/invoices`, `/admin/finance/invoices/[id]` (update) | none | none | `Result<T>` |
| [app/admin/finance/expenses/actions.ts](app/admin/finance/expenses/actions.ts) | createExpenseAction, updateExpenseAction, deleteExpenseAction | expenses | `/admin/finance/expenses`, `/admin/finance/report` | none | none | `Result<void>` |
| [app/admin/utilities/actions.ts](app/admin/utilities/actions.ts) | saveMeterReadingsAction, updateSingleMeterReadingAction | meter_readings | `/admin/utilities`, `/admin/finance/invoices` | none | none | `Result` |
| [app/admin/settings/actions.ts](app/admin/settings/actions.ts) | updateSettingsAction | settings | `/admin/settings`, `/admin/finance`, `/admin/utilities`, `/rooms` | none | none | `Result` |
| [app/rooms/actions.ts](app/rooms/actions.ts) | createRoomAction, updateRoomAction, deleteRoomAction | rooms | `/rooms` | none | none | `Result<T>` |
| [app/tenant/move-out/actions.ts](app/tenant/move-out/actions.ts) | createMoveRequestAction, cancelMoveRequestAction | move_requests, users.tenant_status, notifications | `/tenant/move-out` | none | none | `Result<void>` |
| [app/tenant/profile/actions.ts](app/tenant/profile/actions.ts) | updateProfileAction, addEmergencyContactAction, addBankAccountAction, completeProfileAction | tenant_profiles, emergency_contacts, tenant_bank_accounts, users.is_profile_complete | `/profile` | none | none | `Result<T>` |
| [app/tenant/payments/actions.ts](app/tenant/payments/actions.ts) | submitPaymentProofAction | payment_proofs | `/tenant/payments`, `/admin/finance/payments` | none | none | `Result` |
| [app/tenant/guests/actions.ts](app/tenant/guests/actions.ts) | createGuestAction, deleteGuestAction | guests, notifications | `/tenant/guests` | none | none | `Result<void>` |

Tổng: 25 server action, 100% dùng `Result<T>` wrapper (consistent với D5 T-003), 0% dùng revalidateTag, 0% redirect/router.refresh ở server action.

### Server components (cookies/auth)

| Page | Type | export const dynamic | export const revalidate | Uses cookies (via getCurrentUser) | Data fetched |
|---|---|---|---|---|---|
| [app/dashboard/page.tsx](app/dashboard/page.tsx) | server | **MISSING** | — | yes | rooms, room_tenants, payments, notifications |
| [app/home/page.tsx](app/home/page.tsx) | server | **MISSING** | — | yes | rooms, messages, notifications, tenant_profiles, payments |
| [app/profile/page.tsx](app/profile/page.tsx) | server | **MISSING** | — | yes | tenant_profile, emergency_contacts, bank_accounts |
| [app/profile/setup/page.tsx](app/profile/setup/page.tsx) | server | **MISSING** | — | yes | profile state (5-step wizard) |
| [app/profile/[userId]/page.tsx](app/profile/[userId]/page.tsx) | server | **MISSING** | — | yes | tenant profile by id |
| [app/notifications/page.tsx](app/notifications/page.tsx) | server | **MISSING** | — | yes | notifications |
| [app/chat/page.tsx](app/chat/page.tsx) | server | **MISSING** | — | yes | messages, conversations |
| [app/community/page.tsx](app/community/page.tsx) | server | **MISSING** | — | yes | community posts, comments |
| [app/page.tsx](app/page.tsx) | server | **MISSING** | — | yes | (redirect only, no data) |
| [app/login/page.tsx](app/login/page.tsx) | server | **MISSING** | — | yes | (redirect if logged in) |
| [app/tenant/payments/page.tsx](app/tenant/payments/page.tsx) | server | ✅ `force-dynamic` | — | yes | payments, invoices |
| [app/admin/utilities/page.tsx](app/admin/utilities/page.tsx) | server | ✅ `force-dynamic` | — | yes | meter_readings |
| [app/admin/settings/page.tsx](app/admin/settings/page.tsx) | server | ✅ `force-dynamic` | — | yes | settings |
| [app/admin/finance/report/page.tsx](app/admin/finance/report/page.tsx) | server | ✅ `force-dynamic` | — | yes | invoices, payments, expenses |
| [app/admin/finance/payments/page.tsx](app/admin/finance/payments/page.tsx) | server | ✅ `force-dynamic` | — | yes | payment_proofs |
| [app/admin/finance/invoices/page.tsx](app/admin/finance/invoices/page.tsx) | server | ✅ `force-dynamic` | — | yes | invoices |
| [app/admin/finance/invoices/[id]/page.tsx](app/admin/finance/invoices/[id]/page.tsx) | server | ✅ `force-dynamic` | — | yes | invoice detail |
| [app/admin/finance/expenses/page.tsx](app/admin/finance/expenses/page.tsx) | server | ✅ `force-dynamic` | — | yes | expenses |

**Other server pages — data-driven KHÔNG dùng cookies (rely on middleware):**

| Page | Type | export const dynamic | Notes |
|---|---|---|---|
| [app/admin/tenants/page.tsx](app/admin/tenants/page.tsx) | server | **MISSING** | Fetches `getAllTenants() + getAllRoomsWithTenants()`. Static-eligible. |
| [app/rooms/page.tsx](app/rooms/page.tsx) | server | **MISSING** | Fetches `getAllRoomsWithTenants() + getSetting()`. Static-eligible. |

**Client component pages (auth check qua API):**
- [app/admin/move-requests/page.tsx](app/admin/move-requests/page.tsx) — `'use client'`, fetches via `/api/admin/move-requests`. Không trong scope cache audit.

### Data layer (lib/db)

| File | Functions count | Wraps unstable_cache | Wraps cache() | Supabase fetch options | Return pattern |
|---|---|---|---|---|---|
| [lib/db/rooms.ts](lib/db/rooms.ts) | 7 (getAll, getById, create, update, delete, search, +WithTenants × 2) | no | no | default (no cache option) | throw Error |
| [lib/db/room-tenants.ts](lib/db/room-tenants.ts) | 6 (add, remove, getTenantsByRoom, getRoomsByTenant, getPrimary, setPrimary) | no | no | default | throw Error |
| [lib/db/move-requests.ts](lib/db/move-requests.ts) | 5 (create, get, getMy, approve, reject, cancel) | no | no | default | throw Error |
| [lib/db/tenants.ts](lib/db/tenants.ts) | ~10 (createTenantAccount, getAllTenants, profile CRUD, contacts, bank, checkProfileComplete) | no | no | default | throw Error |
| [lib/db/invoices.ts](lib/db/invoices.ts) | ~6 (preview, create, update, delete, getById, query helpers) | no | no | default | throw Error |
| [lib/db/payment-proofs.ts](lib/db/payment-proofs.ts) | ~6 (create, list, approve, reject, find) | no | no | default | throw Error |
| [lib/db/meter-readings.ts](lib/db/meter-readings.ts) | ~5 (upsert, get, audit) | no | no | default | throw Error |
| [lib/db/expenses.ts](lib/db/expenses.ts) | 3 (create, update, delete) | no | no | default | throw Error |
| [lib/db/finance-report.ts](lib/db/finance-report.ts) | aggregates | no | no | default | throw Error |
| [lib/db/notifications.ts](lib/db/notifications.ts) | helpers | no | no | default | throw Error |
| [lib/db/guests.ts](lib/db/guests.ts) | 2 (create, delete) | no | no | default | throw Error |
| [lib/db/settings.ts](lib/db/settings.ts) | get/getAll/updateMultiple | no | no | default | throw Error |

**Phán quyết data layer: KHÔNG có anti-pattern.** Pattern 100% nhất quán với D5 T-003 (throw ở data layer, Result<T> ở server action). KHÔNG dùng `unstable_cache`, `React.cache()`, hoặc Supabase fetch options đặc biệt.

### Service worker

File: [public/sw.js](public/sw.js) (75 dòng)

**Cache version**: `aloha-v5`
**Static assets (precache)**: `['/icons/icon-192x192.svg', '/manifest.json']` (chỉ 2 file)

**Fetch handler strategy** ([sw.js:18-35](public/sw.js:18)):

```
strategy: cache-first cho tất cả GET request
exclusions:
  - method !== 'GET'
  - URL includes '/api/'
  - URL includes '/_next/'
  - URL includes '.hot-update.'
  - request.cache === 'reload' (Ctrl+Shift+R)
  - request.cache === 'no-store'
```

**HTML/Navigation handling**: ❌ KHÔNG có exclusion riêng. Mọi GET request đến `/dashboard`, `/home`, `/admin/move-requests`, etc. đều cache-first.

**Browser F5 behavior**:
- F5 thường ở Chrome/Firefox → `request.cache === 'no-cache'` (theo MDN spec)
- SW bypass chỉ check `'reload'` và `'no-store'` → KHÔNG bypass `'no-cache'`
- Kết quả: F5 → SW trả cached HTML stale ❌

**Activate handler** ([sw.js:9-16](public/sw.js:9)): Delete old caches. Hoạt động đúng khi bump CACHE version.

---

## Issues found

### Issue #1 — SW cache-first intercept navigation HTML (root cause T-021 Phase E fail)
- **Severity**: 🔴 CRITICAL
- **File**: `public/sw.js:18-35`
- **Pattern**: Service worker cache-first không exclude navigation requests
- **Description**: SW cache cả HTML response cho `/dashboard`, `/home`, etc. F5 thường (request.cache='no-cache') không trigger bypass → SW trả stale HTML. Server-side `revalidatePath` + `force-dynamic` + `Cache-Control: no-store` đều bị bypass vì SW không bao giờ hỏi tới server khi có cached match.
- **Evidence**: Verified curl test 17/05 — `/dashboard` trả `Cache-Control: no-store, must-revalidate` ở server, nhưng browser test (Phase E auto lần 2) vẫn stale.
- **Recommendation**:
  ```js
  // Thêm vào đầu fetch handler:
  if (e.request.mode === 'navigate') return            // HTML page loads
  if (e.request.destination === 'document') return     // explicit HTML
  ```
  Đồng thời bump `CACHE = 'aloha-v6'` để force clear old caches ở user browsers.
- **Related task**: T-021b (đang dở), T-024 (audit này)

### Issue #2 — approveMoveRequestAction missing revalidatePath coverage
- **Severity**: 🟠 HIGH
- **File**: `app/admin/move-requests/actions.ts:15-24`
- **Pattern**: Server action mutate nhiều bảng chỉ revalidate 1 path
- **Description**: Action mutates `move_requests`, `users.tenant_status`, `room_tenants`, `rooms.tenant_id`, `rooms.status` (gián tiếp qua `removeTenantFromRoom`). Chỉ revalidate `/admin/move-requests`. Dashboard/home/rooms vẫn cache cũ → user phải hard refresh.
- **Evidence**: T-021 đã verify bug qua Phase E E2/E3. Branch feature/t021 đã có fix tạm (4 revalidatePath) nhưng chưa merge main.
- **Recommendation**: Thêm `/dashboard`, `/home`, `/rooms` (+optional `/tenant/move-out` cho tenant view của chính họ).
- **Related task**: T-021

### Issue #3 — 8 server component dùng `getCurrentUser` thiếu force-dynamic
- **Severity**: 🟠 HIGH (cho 4 page data-driven), 🟡 MEDIUM (cho 4 page còn lại)
- **Files**:
  - HIGH: `app/dashboard/page.tsx`, `app/home/page.tsx`, `app/notifications/page.tsx`, `app/chat/page.tsx`
  - MEDIUM: `app/profile/page.tsx`, `app/profile/setup/page.tsx`, `app/profile/[userId]/page.tsx`, `app/community/page.tsx`
  - SKIP (redirect-only, low impact): `app/page.tsx`, `app/login/page.tsx`
- **Pattern**: Server component dùng `cookies()` (qua `getCurrentUser`) → ngầm dynamic, nhưng response Cache-Control header có thể không đủ `no-store`. Browser F5 có thể serve from HTTP cache.
- **Description**: Convention codebase: 8 page đã có `export const dynamic = 'force-dynamic'`. Thiếu ở 10 page khác (mismatch convention). Ảnh hưởng cộng dồn với Issue #1 SW.
- **Evidence**: T-021b confirmed bug `/dashboard`. Sau khi fix SW (Issue #1), force-dynamic vẫn cần để đảm bảo HTTP layer behavior nhất quán.
- **Recommendation**: Thêm `export const dynamic = 'force-dynamic'` vào header mỗi page. Pattern reference: [app/admin/finance/payments/page.tsx:9](app/admin/finance/payments/page.tsx:9).
- **Related task**: T-021b (partial fix /dashboard)

### Issue #4 — createMoveRequestAction missing revalidatePath cho admin views
- **Severity**: 🟠 HIGH
- **File**: `app/tenant/move-out/actions.ts:17-34`
- **Pattern**: Server action gửi notification cho admin nhưng không revalidate admin page
- **Description**: Tenant gửi yêu cầu chuyển đi → insert `move_requests` + update `users.tenant_status='pending_move'` + insert `notifications` cho owner. Chỉ revalidate `/tenant/move-out`. Admin ở `/admin/move-requests` không thấy request mới đến khi F5.
- **Evidence**: Tương tự pattern T-016c — server action cross-role data flow cần revalidate cả 2 vai.
- **Recommendation**: Thêm `revalidatePath('/admin/move-requests')` + `revalidatePath('/notifications')`.
- **Related task**: Phát hiện mới T-024

### Issue #5 — app/admin/tenants/page.tsx + app/rooms/page.tsx không dùng cookies → static-render risk
- **Severity**: 🟠 HIGH
- **Files**: `app/admin/tenants/page.tsx:7-11`, `app/rooms/page.tsx:6-10`
- **Pattern**: Page admin data-driven KHÔNG dùng `getCurrentUser` → Next.js build có thể static-render
- **Description**: 2 page này phụ thuộc middleware để chặn truy cập, nhưng KHÔNG đụng `cookies()` nên Next.js coi là static eligible. Có thể bị render 1 lần ở build time, sau đó serve cached HTML qua nhiều request. `revalidatePath` qua server action chỉ invalidate Data Cache, không invalidate Full Route Cache nếu nội dung HTML đã render.
- **Evidence**: Build output (xem `npm run build` ở T-021b verify) — `/rooms` show `○ Static`, `/admin/tenants` likely cũng vậy.
- **Recommendation**: Thêm `export const dynamic = 'force-dynamic'` để force dynamic rendering. Hoặc cho gọi `getCurrentUser()` (cho consistency với pattern admin khác).
- **Related task**: T-024

### Issue #6 — createTenantAccount / approveMoveRequest chained mutation thiếu transactional invalidation
- **Severity**: 🟡 MEDIUM
- **Files**: `lib/db/tenants.ts` (createTenantAccount), `lib/db/move-requests.ts` (approveMoveRequest)
- **Pattern**: Hàm DB phức tạp gọi multiple write KHÔNG transactional, revalidate chỉ phụ thuộc server action wrapper
- **Description**: `approveMoveRequest` thực hiện 4 write tuần tự (update request + update user + removeTenantFromRoom helper + insert notification). Nếu fail giữa chừng, DB không rollback. Server action cũng không phân biệt partial-success vs full-success.
- **Recommendation**: (out of scope cho T-024) Wrap trong Supabase RPC hoặc PostgreSQL function để có transaction. Defer task riêng.
- **Related task**: Future refactor (defer)

### Issue #7 — updateProfileAction revalidate hẹp, admin tenant list có thể stale
- **Severity**: 🟡 MEDIUM
- **File**: `app/tenant/profile/actions.ts:17-29`
- **Pattern**: Server action update data cross-role nhưng chỉ revalidate own page
- **Description**: Tenant update profile → `is_profile_complete` đổi → `/admin/tenants` (admin view) có thể cache cũ. Tương tự `addEmergencyContactAction`, `addBankAccountAction`, `completeProfileAction`.
- **Recommendation**: Thêm `revalidatePath('/admin/tenants')`.
- **Related task**: T-024 phát hiện mới

### Issue #8 — createGuestAction notification gửi admin nhưng không revalidate admin page
- **Severity**: 🟡 MEDIUM
- **File**: `app/tenant/guests/actions.ts:11-29`
- **Pattern**: Cross-role data write, missing admin path revalidate
- **Description**: Tenant create guest → insert `guests` + insert `notifications` cho admin. Chỉ revalidate `/tenant/guests`. Admin notification page stale.
- **Recommendation**: Thêm `revalidatePath('/notifications')`.
- **Related task**: T-024

### Issue #9 — rooms/actions.ts thiếu revalidate `/dashboard` + `/home`
- **Severity**: 🟡 MEDIUM
- **File**: `app/rooms/actions.ts:20-68`
- **Pattern**: CRUD phòng chỉ revalidate /rooms, owner dashboard/home hiển thị room list stale
- **Description**: Tạo/sửa/xóa phòng → chỉ revalidate `/rooms`. `/dashboard` (owner) + `/home` (admin home) cũng hiển thị room count + room list → bị stale.
- **Recommendation**: Thêm `revalidatePath('/dashboard')` + `revalidatePath('/home')`. Match pattern T-016c `createTenantAction`.
- **Related task**: T-024

### Issue #10 — admin/finance/payments approve không revalidate /dashboard
- **Severity**: 🟡 MEDIUM
- **File**: `app/admin/finance/payments/actions.ts:22-26`
- **Pattern**: Payment status thay đổi → dashboard hiển thị payment status per room stale
- **Description**: Owner approve payment → update `invoices.paid_amount`. Dashboard query `payments` per room (xem `app/dashboard/page.tsx:62-74`) → stale.
- **Recommendation**: Thêm `revalidatePath('/dashboard')` vào `refreshFinance()` helper.
- **Related task**: T-024

### Issue #11 — admin/move-requests/page.tsx client component, không có optimistic revalidate
- **Severity**: 🟡 MEDIUM (optimistic UX)
- **File**: `app/admin/move-requests/page.tsx:48-69`
- **Pattern**: Client component sau server action chỉ update local state, không gọi `router.refresh()`
- **Description**: Sau approve/reject, page update `requests` array local. Nếu navigate đi rồi quay lại, server fetch lại — cần `revalidatePath` đúng để có data mới. Pattern thiếu `router.refresh()` để invalidate Router Cache.
- **Evidence**: Pattern reference [app/admin/finance/payments/PaymentReviewCard.tsx:37,45,53](app/admin/finance/payments/PaymentReviewCard.tsx:37) gọi `router.refresh()` sau action.
- **Recommendation**: Thêm `router.refresh()` sau action success ở `handleApprove` + `handleReject`. (Nice-to-have, không blocking nếu revalidatePath đầy đủ.)
- **Related task**: T-024

### Issue #12 — SW activate handler không bump CACHE version định kỳ
- **Severity**: 🟡 MEDIUM
- **File**: `public/sw.js:2`
- **Pattern**: CACHE = 'aloha-v5' không bump khi update sw.js logic
- **Description**: Khi fix SW (Issue #1), CACHE version phải bump (v5 → v6) để force clear ở user browsers. Hiện tại không có comment/policy cho việc này.
- **Recommendation**: Khi sửa sw.js logic, bump version. Có thể tự động hóa qua build-time inject từ package.json version.
- **Related task**: Defer

### Issue #13 — Server actions không có revalidateTag
- **Severity**: 🟡 MEDIUM (architectural)
- **Files**: tất cả 12 server action files
- **Pattern**: Toàn codebase chỉ dùng `revalidatePath`, không dùng tag-based caching
- **Description**: `revalidatePath` phải hardcode từng path. Khi page mới thêm vào (vd Phase 4 community/chat), dev phải nhớ thêm revalidatePath ở mọi action liên quan. Tag-based (`revalidateTag('rooms')`) ổn định hơn — chỉ cần tag query một lần.
- **Recommendation**: (Architectural decision) Trong refactor sau, migrate sang tag-based caching cho data layer. Defer task riêng.
- **Related task**: Future T-XXX (architectural refactor)

### Issue #14 — admin/utilities + admin/settings actions thiếu revalidate `/admin/finance/report`
- **Severity**: 🟢 LOW (cosmetic)
- **Files**: `app/admin/utilities/actions.ts`, `app/admin/settings/actions.ts`
- **Pattern**: Update meter readings / settings (electricity_rate) → report number thay đổi
- **Description**: Tiền điện rate đổi → invoice tính khác → report stale. `saveMeterReadingsAction` chỉ revalidate `/admin/utilities` + `/admin/finance/invoices`, không revalidate `/admin/finance/report`.
- **Recommendation**: Thêm `revalidatePath('/admin/finance/report')`.
- **Related task**: T-024

### Issue #15 — Server actions throw error trong try/catch, no error logging
- **Severity**: 🟢 LOW (observability)
- **Files**: tất cả 12 server action files
- **Pattern**: try/catch nuốt error, chỉ trả `error.message` cho client
- **Description**: Khi action fail, error chỉ trả về string cho user. Không có log/telemetry để dev biết action nào fail thường xuyên ở production.
- **Recommendation**: Wrap try/catch với `console.error(err)` hoặc Sentry. Defer kèm observability task.
- **Related task**: Defer

---

## Bonus findings (ngoài 4 layer scope)

### Bonus #1 — `<Image src>` whitelist trong next.config.js chỉ có 1 domain
- **Severity**: 🟡 MEDIUM
- **File**: `next.config.js:7-13`
- **Pattern**: `images.remotePatterns` chỉ chứa `*.supabase.co/storage/v1/object/public/**`
- **Description**: T-021 đã gặp bug crash khi seed dùng `https://test.local/...`. Convention: test domain phải dùng `NULL` thay vì URL fake. Document rule này trong CLAUDE.md hoặc data-seed-pattern.md.
- **Recommendation**: Cập nhật skill `data-seed-pattern.md` ghi rõ "avatar URL = NULL ở seed, KHÔNG dùng test.local".
- **Related task**: T-021 lesson learned

### Bonus #2 — getCurrentUser KHÔNG verify user vẫn tồn tại trong DB
- **Severity**: 🟡 MEDIUM (security)
- **File**: `lib/auth.ts:25-30`
- **Pattern**: JWT decode trực tiếp, không cross-check users table
- **Description**: Token còn valid (30 ngày) → user trả về. Nhưng nếu user đã bị delete khỏi DB (vd tenant moved_out), `getCurrentUser` vẫn trả AuthPayload có `userId`. Page sau đó query DB không tìm thấy → fail silently hoặc redirect chain.
- **Recommendation**: Thêm verify DB lookup ở getCurrentUser, hoặc dùng pattern verify-on-action. Defer security audit task.
- **Related task**: Future security audit

### Bonus #3 — Dev impersonate endpoint không log access
- **Severity**: 🟢 LOW (audit trail)
- **File**: `app/api/dev/impersonate/route.ts` (T-022)
- **Pattern**: Dev endpoint không có audit log
- **Description**: Endpoint impersonate có 4 layer defense (NODE_ENV check, token, dev-only header...), nhưng không log từng lần impersonate. Nếu dev token leak, không có evidence.
- **Recommendation**: Thêm `console.log('[DEV-IMPERSONATE]', userId, ip, timestamp)` ở entry point. Defer.
- **Related task**: T-022 followup

---

## Fix prioritization

### Phase 1 (CRITICAL — fix ngay, blocking T-021 Phase E)

- **Issue #1** — SW navigation exclusion + bump CACHE version (v5→v6)

### Phase 2 (HIGH — fix trong sprint hiện tại, batch theo file)

- **Issue #2** — approveMoveRequestAction revalidate 4 path (đã có ở branch t021, cần merge)
- **Issue #3a** — Thêm `force-dynamic` cho 4 HIGH page: `dashboard` (đã có ở t021), `home`, `notifications`, `chat`
- **Issue #4** — createMoveRequestAction revalidate admin + notifications
- **Issue #5** — admin/tenants/page.tsx + rooms/page.tsx thêm `force-dynamic`

### Phase 3 (MEDIUM — task riêng sau khi unblock T-021)

- **Issue #3b** — Thêm `force-dynamic` cho 4 MEDIUM page (profile × 3, community)
- **Issue #7** — updateProfileAction revalidate `/admin/tenants`
- **Issue #8** — createGuestAction revalidate `/notifications`
- **Issue #9** — rooms/actions.ts revalidate `/dashboard` + `/home`
- **Issue #10** — finance/payments approve revalidate `/dashboard`
- **Issue #11** — admin/move-requests/page.tsx thêm `router.refresh()`
- **Issue #14** — utilities/settings revalidate `/admin/finance/report`

### Defer (architectural / observability — task riêng)

- **Issue #6** — Transactional wrap cho approveMoveRequest + createTenantAccount
- **Issue #12** — Automated CACHE version bump
- **Issue #13** — Tag-based caching architecture
- **Issue #15** — Error logging in server actions
- **Bonus #1, #2, #3**

---

## Notes

- **Reference T-021 lesson learned**: Service worker layer can intercept revalidatePath. Fix at SW level, not Next.js level. Server-side caching (Data Cache, Full Route Cache, HTTP Cache-Control) hoàn toàn không tác dụng nếu SW return cached match.
- **Reference T-016c pattern**: `createTenantAction` revalidates 4 paths (`/admin/tenants`, `/rooms`, `/home`, `/dashboard`). Đây là template chuẩn cho actions cross-role data flow.
- **Data layer pattern is clean**: KHÔNG anti-pattern ở lib/db. Pattern 100% consistent. KHÔNG cần refactor.
- **Audit không cover**: security in-depth (JWT verify, env leak, RLS — đã có RLS off theo D6 T-003), performance, lint cleanup. Task riêng nếu cần.

---

## Recommended next tasks

Đề xuất batch fix theo nhóm issue (KHÔNG tạo todo file lần này, đợi user duyệt):

- **T-021c (cont)**: Fix SW navigation exclusion (Issue #1) + bump CACHE v6 → unblock T-021 Phase E. **PRIORITY 1**.
- **T-025**: Merge T-021 fix vào main (Issue #2 + #3 partial) + thêm force-dynamic cho 4 HIGH page còn lại. **PRIORITY 2**.
- **T-026**: Batch fix HIGH cross-role revalidate (Issue #4, #5, #7-10) — 1 commit per file group. **PRIORITY 3**.
- **T-027**: Update skill `data-seed-pattern.md` với rule "avatar URL = NULL ở seed" (Bonus #1).
- **Future T-XXX**: Tag-based caching migration (Issue #13). Architectural decision.
- **Future T-XXX**: Security audit (Bonus #2, #3 + RLS review). Independent track.
