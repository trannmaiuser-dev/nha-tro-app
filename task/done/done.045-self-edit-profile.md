# T-045 — Self-edit profile (owner + tenant)

## P — Plan

**Why**: User feedback EOD 2026-05-19:
> "cần thêm chức năng để chủ và khác edit được thông tin cá nhân"
> "cần thêm chức năng để chủ và khách edit được thông tin cá nhân, giấy tờ của bản thân"

Tenant đã có flow chỉnh hồ sơ qua `/profile/setup` (wizard 5 step) nhưng button
"Sửa hồ sơ" trên ProfileSelfPage chỉ show khi `profile_status === 'draft'` —
tenant đã confirmed không vào sửa lại được.

Owner KHÔNG có flow nào để edit thông tin cá nhân (avatar, tên, DOB, CCCD).

**Scope**:
- Owner: tạo route mới `/profile/edit` + form simple (avatar + name + DOB + gender + CCCD số + occupation + address + CCCD front/back upload). KHÔNG có emergency/related (wizard tenant-only flow).
- Tenant: update ProfileSelfPage để button "Sửa hồ sơ" luôn show cho `confirmed/pending` (trỏ về `/profile/setup` đã có).
- API mới `/api/profile/owner-save` — owner role only, upsert `tenant_profiles` + `tenant_documents` (CCCD only).

**Out of scope**:
- Không sửa wizard tenant (T-021 đã polish).
- Không thay đổi `tenant_profiles` schema (D1: reuse cho owner luôn).
- Không thêm emergency/related cho owner.

## D — Do

1. `app/api/profile/owner-save/route.ts` — new endpoint
2. `app/profile/edit/page.tsx` — owner page (force-dynamic, redirect non-owner)
3. `components/OwnerProfileEditForm.tsx` — client form, reuse `/api/upload/avatar` + `/api/upload/document`
4. `components/ProfileSelfPage.tsx` — add edit buttons:
   - Owner: thêm "✏️ Sửa hồ sơ" trỏ `/profile/edit`
   - Tenant: bỏ điều kiện `profile_status === 'draft'`, luôn show button (label: "Sửa hồ sơ" / "Hoàn thiện hồ sơ" / "+ Tạo hồ sơ" theo status)
5. `npx tsc --noEmit`

## C — Check

- tsc pass
- Phase C audit:
  - SA1: `/api/profile/owner-save` mutate DB → cần revalidatePath('/profile', '/home')
  - SC1: `/profile/edit` page dùng `getCurrentUser` (cookies) → cần `export const dynamic = 'force-dynamic'`
  - DL2: dùng `createServerSupabaseClient` không phải `createClient`

## E — Phase E

Manual. User sẽ test khi quay lại:
1. Login owner → `/profile` → click "Sửa hồ sơ" → đổi tên → save → reload → verify
2. Upload avatar → verify hiện preview + DB cập nhật
3. Upload CCCD front/back → verify
4. Login tenant confirmed → `/profile` → click "Sửa hồ sơ" → wizard mở → sửa được

## A — Act

### Bài học rút ra

- **[CODE]** Khi cho phép entity B reuse table chuyên dụng cho A (vd owner reuse tenant_profiles), KHÔNG gate route handler bằng `role !== 'A'` ở /api/profile/save như cũ — tạo endpoint riêng (`owner-save`) thay vì generalize. Lý do: tránh risk regression tenant wizard và tách rõ responsibility.
- **[CODE]** Form đơn giản chỉ cần native `<input type="file">` + `/api/upload/avatar`. KHÔNG cần ImageCapture + face check như wizard tenant — owner upload thoải mái, không phải compliance flow.
- **[CODE]** `tenant_profiles.profile_status` default 'draft' không phù hợp owner (owner không cần approve). Set 'confirmed' khi insert owner row.

(Tất cả CODE lessons, auto-approve.)

### Files changed

- `app/api/profile/owner-save/route.ts` (new) — owner-only POST endpoint
- `app/profile/edit/page.tsx` (new) — force-dynamic, redirect non-owner
- `components/OwnerProfileEditForm.tsx` (new) — client form
- `components/ProfileSelfPage.tsx` — bỏ điều kiện `profile_status === 'draft'` cho tenant edit button; thêm owner "Sửa hồ sơ" button

## Auto-decisions

- [Tier LOW] 2026-05-19 — Tạo endpoint riêng `/api/profile/owner-save` thay vì generalize `/api/profile/save` — Lý do: tránh risk regression tenant wizard, separation of concerns
- [Tier LOW] 2026-05-19 — Owner edit form đơn giản (no emergency/related/face-check) — Lý do: requirement chỉ nói "thông tin cá nhân + giấy tờ", không phải full wizard
- [Tier LOW] 2026-05-19 — Phone read-only ở owner form — Lý do: phone là identity login, đổi phone ngoài scope T-045
