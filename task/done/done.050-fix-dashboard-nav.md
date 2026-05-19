# T-050 — Fix dashboard owner navigation bugs

## P — Plan

**Why**: User feedback EOD 2026-05-19 "cài đặt chưa vào từ dashboard". Audit
HomePageOwner.tsx (route `/home`) thấy 5 navigation cards bị broken:

| Card | onClick hiện tại | Bug | Fix tới |
|---|---|---|---|
| Quản lý phòng | `/dashboard` | navigate sang dashboard chung, không phải rooms | `/rooms` |
| Khách thuê | `/dashboard` | tương tự | `/admin/tenants` |
| Thông báo | `/dashboard` | tương tự | `/notifications` |
| Thanh toán | `/dashboard` | tương tự | `/admin/finance/payments` |
| Cài đặt | `showToastMsg('Sắp ra mắt')` | trang `/admin/settings` đã có (T-035) | `/admin/settings` |

**Scope**: Sửa `components/HomePageOwner.tsx` only — 5 onClick navigation paths.

**Out of scope**: Không thay đổi UI/icon/color/badge logic. Không thay đổi tenant
homepage (`HomePageTenant`).

## D — Do

1. Edit `components/HomePageOwner.tsx` line 143, 152, 170, 179, 196
2. `npx tsc --noEmit`
3. Commit + ff-merge + push

## C — Check

- tsc pass
- Build pass
- Phase C anti-pattern audit: chỉ navigation change, không có server action / cookies / SW → N/A cho 12 check

## E — Phase E — N/A (pre-verified static)

Lý do N/A: 5 navigation paths đã pre-verify tồn tại qua `Glob app/**/page.tsx`:
- `/rooms` → `app/rooms/page.tsx` ✓
- `/admin/tenants` → `app/admin/tenants/page.tsx` ✓
- `/notifications` → `app/notifications/page.tsx` ✓
- `/admin/finance/payments` → `app/admin/finance/payments/page.tsx` ✓
- `/admin/settings` → `app/admin/settings/page.tsx` ✓

Không có schema/logic change. tsc pass. User sẽ click verify khi quay lại.

## A — Act

### Bài học rút ra

- **[CODE]** `router.push('/dashboard')` placeholder rất dễ tích lũy thành "dead navigation" — khi audit dashboard cards, grep `router.push('/dashboard')` trong components/Home* để catch sớm.
- **[CODE]** Trước khi đặt `onClick: () => showToastMsg('Sắp ra mắt')` cho card, check xem route đích đã có chưa (`ls app/<route>/page.tsx`) — nhiều khi route đã build nhưng dashboard vẫn để placeholder cũ.

(CODE lessons auto-approved per v3.3.)

### Commit

`fix: T-050 dashboard owner 5 navigation links về đúng route`

## Auto-decisions

- [Tier LOW] 2026-05-19 — Chọn `/rooms` thay vì `/admin/rooms` cho card "Quản lý phòng" — Lý do: `/admin/rooms` không tồn tại, chỉ có `/rooms`
- [Tier LOW] 2026-05-19 — Chọn `/notifications` cho card "Thông báo" — Lý do: route `/notifications` (top-level) tồn tại, không phải `/admin/notifications`
