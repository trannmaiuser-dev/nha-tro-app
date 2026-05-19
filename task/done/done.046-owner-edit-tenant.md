# T-046 — Owner edit tenant profile + giấy tờ

## P — Plan

**Why**: User feedback EOD 2026-05-19:
> "cần thêm chức năng để chủ có thể edit thông tin khách"

Hiện owner xem khách tại `/profile/[userId]` (TenantSummaryPage) chỉ READ-ONLY.
Cần thêm khả năng edit khi khách bận hoặc không tự update.

**Scope**:
- Thêm button "✏️ Sửa hồ sơ khách" trên TenantSummaryPage (chỉ show cho owner)
- Route mới `/profile/[userId]/edit` (owner-only) render form chỉnh
- Endpoint mới `/api/admin/tenant-profile-save` — owner role, target userId qua body
- Refactor OwnerProfileEditForm → ProfileEditForm generic (accept targetUserId, apiEndpoint, title)
- Cập nhật `/profile/edit` (T-045) dùng ProfileEditForm với prop self

**Out of scope**:
- KHÔNG thay đổi phone của tenant (phone = login identity, risk lớn)
- KHÔNG cho phép edit emergency/related persons (tenant wizard scope)
- KHÔNG notify tenant khi owner edit (defer — có thể bổ sung sau)

## D — Do

1. Generalize `components/OwnerProfileEditForm.tsx` → `components/ProfileEditForm.tsx` với props mới
2. `app/api/admin/tenant-profile-save/route.ts` — owner-only POST, target userId
3. `app/profile/[userId]/edit/page.tsx` — owner-only page
4. `components/TenantSummaryPage.tsx` — thêm "✏️ Sửa hồ sơ khách" button trỏ /profile/[userId]/edit
5. Update `app/profile/edit/page.tsx` (T-045) — pass props mới cho ProfileEditForm
6. Cleanup: xóa OwnerProfileEditForm.tsx (thay bằng ProfileEditForm.tsx)
7. tsc + build check

## C — Check

- tsc + build pass
- Anti-pattern audit:
  - SA1: revalidatePath('/profile/[userId]', '/admin/tenants')
  - SC1: page có force-dynamic (cookies via getCurrentUser)
  - DL2: createServerSupabaseClient

## E — Phase E

Manual:
1. Login owner → `/admin/tenants` → click tenant → `/profile/[userId]` → "Sửa hồ sơ khách"
2. Đổi full_name, save → verify reload show new name
3. Login tenant (sau khi owner sửa) → `/profile` → verify name khớp

## A — Act

### Bài học rút ra

- **[CODE]** Khi build 2 form gần giống nhau cho 2 endpoint khác nhau, generalize component qua props (saveEndpoint, targetUserId, headerTitle...) thay vì duplicate. ~210 LOC giữ nguyên, chỉ tách 2 thin wrapper page.
- **[CODE]** Server endpoint admin-edit-other-user phải có 3 layer check: (1) role gate (owner only), (2) targetUserId presence, (3) target.role === 'tenant'. Lý do: tránh owner edit owner khác hoặc edit chính mình qua nhầm endpoint.
- **[CODE]** Edit button đặt cùng header với "Xác nhận" button (cùng owner action) tốt hơn là bottom sticky — UX consistent với pattern app hiện có.

(Tất cả CODE, auto-approve.)

### Files

- `components/ProfileEditForm.tsx` (new — generalized từ OwnerProfileEditForm)
- `components/OwnerProfileEditForm.tsx` (deleted)
- `app/profile/edit/page.tsx` (update — dùng ProfileEditForm)
- `app/profile/[userId]/edit/page.tsx` (new — owner edit tenant)
- `app/api/admin/tenant-profile-save/route.ts` (new — owner POST)
- `components/TenantSummaryPage.tsx` (thêm nút "✏️ Sửa" trong header)

## Auto-decisions

- [Tier LOW] 2026-05-19 — Phone tenant read-only ở owner-edit form — Lý do: identity login, risk lớn nếu owner đổi
- [Tier LOW] 2026-05-19 — Generalize component thay vì duplicate — Lý do: 2 form gần như giống nhau, refactor 1 lần dễ maintain
- [Tier LOW] 2026-05-19 — Không notify tenant khi owner edit — Lý do: ngoài scope, có thể bổ sung sau khi T-048 (compose noti) done
