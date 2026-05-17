# T-021b Debug Decisions — 2026-05-17

## Triệu chứng (4 input từ user)

1. **Symptom**: Sau khi admin duyệt move-request `/admin/move-requests`, navigate `/dashboard` + F5 thường → phòng vẫn hiển thị tenant cũ + status cũ. Phải Ctrl+Shift+R mới thấy update.
2. **Expected**: F5 thường (soft refresh) đủ để thấy update.
3. **Evidence**:
   - E2: `req_status='approved'` + `room_status='vacant'` ✅ trong DB
   - E2: Dashboard render "P102 - Test T021 E2 MoveReq - Có người" sau F5
   - E3: `room_tenants` đúng (Second `is_primary=true`, Primary `left_at` set) ✅
   - E3: Dashboard render Primary có badge "Đại diện"
4. **Scope**: branch `feature/t021-fix-onboarding-ui`, URL `/dashboard`, action `approveMoveRequestAction`.

## Hypotheses (rank HIGH → LOW)

1. **[HIGH]** `approveMoveRequestAction` CHƯA gọi `revalidatePath('/dashboard')` → ❌ **REJECTED**
2. **[MEDIUM]** `/dashboard/page.tsx` thiếu opt-out caching → ✅ **CONFIRMED**
3. **[LOW]** Layout cache shared data.
4. **[LOW]** Action try/catch nuốt lỗi revalidate.

## Verify findings (B4)

### H1 — revalidatePath thiếu? → KHÔNG.

`app/admin/move-requests/actions.ts:21-24` đã có 4 dòng revalidatePath:

```ts
revalidatePath('/admin/move-requests')
revalidatePath('/dashboard')
revalidatePath('/home')
revalidatePath('/rooms')
```

Pattern giống hệt T-016c reference `app/admin/tenants/actions.ts:41-44`.

### H2 — cache config thiếu? → ĐÚNG.

Convention codebase: 8 page khác opt-out caching bằng `export const dynamic = 'force-dynamic'`:
- `app/admin/utilities/page.tsx:11`
- `app/tenant/payments/page.tsx:7`
- `app/admin/finance/{report,expenses,payments,invoices,invoices/[id],settings}/page.tsx`

Nhưng `app/dashboard/page.tsx` **KHÔNG có** dòng này. Cùng `app/home/page.tsx` cũng thiếu (trong cùng scope revalidatePath).

`getCurrentUser()` (`lib/auth.ts:25`) dùng `cookies()` → về lý thuyết auto-trigger dynamic rendering. Nhưng Next.js 14.2.5 vẫn có thể cache HTML response (Browser HTTP Cache, hoặc Data Cache cho Supabase fetch underneath).

Khi browser F5:
- Browser gửi conditional GET, có thể nhận lại HTML cached (Cache-Control thiếu `no-store`).
- Ctrl+Shift+R force fresh fetch → bypass mọi cache → trả HTML mới ⇒ giải thích đúng triệu chứng.

`force-dynamic` ép Next.js:
- KHÔNG dùng Data Cache cho fetch underneath
- Set `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` → browser F5 phải re-fetch

### H3, H4 — bỏ qua vì H2 đã đủ giải thích triệu chứng.

## Root cause

`app/dashboard/page.tsx` thiếu `export const dynamic = 'force-dynamic'`.
Mặc dù `cookies()` ngầm trigger dynamic rendering, response HTML vẫn có thể bị browser cache (thiếu `Cache-Control: no-store`). `revalidatePath` ở server-side action không reach được browser cache → F5 trả HTML cached → UI stale.

## Fix

Thêm 1 dòng `export const dynamic = 'force-dynamic'` vào `app/dashboard/page.tsx` (trên function declaration). Match convention 8 page khác trong codebase.

**Scope decision**: chỉ fix `/dashboard` (URL user test trong Phase E). `/home` likely có cùng bug nhưng KHÔNG trong scope Phase E — note vào commit để follow-up nếu cần.

## Note ngoài lề (KHÔNG fix lần này)

- `/home/page.tsx` cùng cấu trúc `getCurrentUser` + Supabase fetch + thiếu `force-dynamic`. Cùng root cause. Nếu Phase E re-run thấy `/home` stale → follow-up T-021c.
- `/rooms/page.tsx` KHÔNG dùng cookies, có thể static — `revalidatePath('/rooms')` đủ invalidate Full Route Cache. Khả năng cao OK.
