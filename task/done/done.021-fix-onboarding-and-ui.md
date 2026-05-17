# T-021 — Fix onboarding optional fields + UI cache stale

## Trạng thái: 🟢 Done
## Ngày tạo: 2026-05-16
## Ngày hoàn thành: 2026-05-17
## Ước lượng: 2-3 giờ
## Áp dụng Phase E: ⚠️ Partial (Phase E auto đã chạy 1 lần T-021b debug session, exposed SW + dashboard bugs → fix qua T-021b commit + T-025 batch. Re-run skipped per user Option B — pattern revalidatePath đã validate qua T-025; E1 onboarding deferred T-023; E3 auto-promote validated T-016)
## Phase E mode: auto
## Branch: feature/t021-fix-onboarding-ui

---

## Bối cảnh

Phát hiện 2 bug trong quá trình test T-016 runtime:

### Bug 1 — Onboarding wizard treat optional là required (BLOCKING)
- Trang "Xem lại hồ sơ" sau onboarding hiện cảnh báo:
  - "Thiếu CCCD mặt trước"
  - "Thiếu CCCD mặt sau"
  - "Thiếu hợp đồng thuê nhà"
- Tenant KHÔNG complete được đăng ký → blocking flow
- User confirm: 3 giấy tờ này là **OPTIONAL** (bổ sung sau, trong 7 ngày)

### Bug 2 — UI cache stale sau khi duyệt move-request
- Sau khi admin duyệt move-request ở /admin/move-requests
- Vào /dashboard → hiển thị data cũ
- Cần Ctrl+Shift+R mới thấy đúng
- Root cause: server actions không gọi revalidatePath sau update DB
- Pattern T-016c đã dùng revalidatePath('/home', '/dashboard') cho createTenantAction
  → Cần áp dụng tương tự cho approveMoveRequestAction và các action khác

---

## Trong scope

### Phần 1 — Fix onboarding optional (Bug 1)

1. Audit logic "is_profile_complete" trong:
   - `lib/db/tenants.ts` hàm `checkProfileComplete`
   - Page review hồ sơ (tìm bằng grep "Giấy tờ chưa hoàn thiện")
   - Component hiển thị warnings

2. Phân loại field:
   - **Required** (block complete): full_name, dob, cccd_number, address, occupation, avatar_url, 1 emergency_contact, 1 bank_account
   - **Optional** (cho phép complete, nhưng hiển thị badge "Thiếu giấy tờ"):
     - cccd_front_url, cccd_back_url (ảnh CCCD)
     - rental_contract_url (ảnh hợp đồng)

3. Fix logic checkProfileComplete:
   - Bỏ check cccd_front_url, cccd_back_url, rental_contract_url khỏi hasProfile
   - Cho phép set is_profile_complete=true khi chỉ thiếu các field optional
   - Cho phép tenant_status='active' khi profile complete (theo required only)

4. UI update:
   - Trang review: phân biệt rõ "Thiếu BẮT BUỘC" (đỏ, block) vs "Thiếu KHUYẾN NGHỊ" (vàng, cho qua)
   - Nếu chỉ thiếu optional → cho phép click "Hoàn thành" với cảnh báo "Bổ sung trong 7 ngày"
   - Sau khi complete, vẫn hiện reminder cho đến khi điền đủ optional

### Phần 2 — Fix UI cache stale (Bug 2)

1. Audit TẤT CẢ server actions đụng đến rooms/room_tenants/move_requests/invoices:
   ```
   git grep -l "use server" -- "app/**/actions.ts"
   ```

2. Verify mỗi action có revalidatePath đúng các trang ảnh hưởng:
   - createTenantAction: revalidatePath('/dashboard', '/home') ← T-016c đã có
   - approveMoveRequestAction: revalidatePath('/dashboard', '/admin/move-requests')
   - rejectMoveRequestAction: revalidatePath('/admin/move-requests')
   - createInvoiceAction (hoặc tương đương): revalidatePath('/dashboard', '/admin/finance/invoices')
   - confirmPaymentAction: revalidatePath('/dashboard')
   - sendReminderAction: revalidatePath('/dashboard')
   - Các action sửa rooms (CRUD): revalidatePath('/dashboard', '/rooms')
   - Các action sửa tenants (CRUD): revalidatePath('/dashboard', '/admin/tenants')

3. KHÔNG over-revalidate (chỉ path bị ảnh hưởng)

---

## Ngoài scope

- Push notification khi optional bổ sung xong (đợi T-017)
- Refactor logic profile_complete (chỉ fix tối thiểu)
- Auto-reminder hàng tuần cho tenant chưa bổ sung optional

---

## Test cases (Phase D — Verify tĩnh)

| TC | Check | Pass criteria |
|---|---|---|
| TC1 | Logic checkProfileComplete | Chỉ check 8 required fields, KHÔNG check 3 optional |
| TC2 | UI review hồ sơ | Phân biệt warning đỏ (block) vs vàng (cho qua) |
| TC3 | Audit revalidatePath | Mỗi action có revalidate đúng path |
| TC4 | Re-verify T-016c createTenantAction | revalidatePath('/dashboard', '/home') giữ nguyên |

---

## Phase E — Runtime Smoke Test (mode: auto)

⚠️ Test qua Claude in Chrome theo skill `.claudes/skills/phase-e-auto.md`.

### Files

- [task/todo/021/seed.sql](021/seed.sql) — setup data 3 scenarios (idempotent)
- [task/todo/021/verify.sql](021/verify.sql) — query verify post-test
- [task/todo/021/cleanup.sql](021/cleanup.sql) — cleanup test data (scope phone `0911999%`)

### Schema notes (inventory tại lúc viết — adapt từ supabase/migrations-v*.sql)

- `rooms.name` (KHÔNG phải `rooms.room_number`) — vd `P101`, `P102`, `P201`
- `users` KHÔNG có cột `avatar_url` — avatar nằm ở `tenant_profiles.avatar_url`
- 3 file optional (cccd_front, cccd_back, contract) là rows trong `tenant_documents`
  với `type` discriminator, KHÔNG phải column riêng
- `emergency_contacts.tenant_id` → `tenant_profiles.id` (KHÔNG phải `users.id`)
- `tenant_bank_accounts.user_id` → `users.id`
- `move_requests` chỉ có `user_id, room_id, requested_date, reason, status` — KHÔNG có cột `type`

### Placeholders cần replace lúc paste vào Supabase Studio

| Placeholder | Cách lấy |
|---|---|
| `{{ROOM_E2_UUID}}` | `SELECT id FROM rooms WHERE name='P102' LIMIT 1;` (hoặc phòng vacant khác) |
| `{{ROOM_E3_UUID}}` | `SELECT id FROM rooms WHERE name='P101' LIMIT 1;` (chọn KHÁC `{{ROOM_E2_UUID}}`) |
| `{{OWNER_UUID}}` | `SELECT id FROM users WHERE role='owner' LIMIT 1;` |
| `{{DEV_IMPERSONATE_TOKEN}}` | `grep DEV_IMPERSONATE_TOKEN .env.local` |

### Test scenarios

| # | Scenario | UI steps (E-execute) | Expected (E-verify SQL) |
|---|---|---|---|
| E1 | Tenant complete với chỉ optional thiếu | 1. Impersonate tenant `0911999001` (`/api/dev/impersonate?token=...&user_id=<0911999001-uuid>`)<br>2. Navigate `/profile/setup` (auto redirect)<br>3. Đi qua các Step điền thông tin (8 required đã seed sẵn, chỉ cần next-through)<br>4. Step 5 (Review): verify hiện warning **VÀNG** "Khuyến nghị" cho 3 file optional (CCCD front/back + contract), KHÔNG block đỏ<br>5. Verify text "Vẫn có thể bấm nút Hoàn thành đăng ký — nhớ bổ sung trong 7 ngày." xuất hiện<br>6. Click "Hoàn thành đăng ký" | E1 query row 1:<br>`is_profile_complete=true`<br>`tenant_status='active'`<br>`profile_status='confirmed'`<br>3 doc count = 0 |
| E2 | Cache invalidation sau duyệt move-request | 1. Impersonate owner (`/api/dev/impersonate?token=...&user_id=<owner-uuid>`)<br>2. Tab A: `/admin/move-requests`, find request `00000000-...-777002`, click **Duyệt**<br>3. Tab B (mở mới): `/dashboard`, F5 (KHÔNG hard refresh)<br>4. Verify phòng E2 status update | E2 query row:<br>`req_status='approved'`<br>`has_reviewer=true`<br>`room_status='vacant'`<br>`room_tenant_id_null=true`<br>`membership_left=true` |
| E3 | Auto-promote primary sau move-out (re-verify T-016) | 1. Impersonate owner (cùng token)<br>2. `/admin/move-requests`, find request `00000000-...-777003` (E3 primary move-out), click **Duyệt**<br>3. `/dashboard`, F5<br>4. Verify phòng E3: badge "Đại diện" giờ trên **Test T021 E3 Second** (KHÔNG còn ở Primary cũ) | E3 query 2 rows:<br>• `0911999003`: `is_primary=false, is_active=false`<br>• `0911999004`: `is_primary=true, is_active=true`<br>E3-room: `status='occupied'`, `tenant_id_phone='0911999004'` |

### Pass criteria

- [ ] E1 UI assertion + SQL verify pass
- [ ] E2 UI assertion + SQL verify pass
- [ ] E3 UI assertion + SQL verify pass
- [ ] Không phát hiện regression T-016/c/d

Nếu fail bất kỳ scenario → tạo task hậu tố T-021b dùng skill `.claudes/skills/debug-workflow.md`.
Cleanup sau test: chạy `task/todo/021/cleanup.sql`.

---

## Ghi chú khi làm

### Phase E auto first attempt (2026-05-17, debug session T-021b)

3 bug runtime phát hiện qua Phase E auto:

1. **Bug 1 — ESLint `react/no-unescaped-entities`** sau khi `tsc --noEmit` pass.
   Phase C cũ chỉ check tsc, không build → catch sót. Fix bằng `&apos;` + bump workflow v3.2 (`npm run build` BẮT BUỘC).

2. **Bug 2 — next/image crash với test domain `test.local`**.
   Seed data ban đầu dùng `https://test.local/...` cho avatar_url, không match `next.config.js images.remotePatterns` (chỉ allow `*.supabase.co`). Fix: seed `avatar_url=NULL`. Bump skill `data-seed-pattern.md` ghi rõ rule này (T-025 ACT lesson 1).

3. **Bug 3 — `.next/` stale sau rebase**.
   File `.next/cache/` không match symbol mới sau rebase → runtime error. Fix: `rm -rf .next && npm run build`. Dev workflow note thêm bước này khi rebase.

4. **Bug 4 (CRITICAL) — Service worker cache-first intercept navigation HTML**.
   Sau Bug 1-3 fix, F5 `/dashboard` vẫn stale. Root cause: `public/sw.js` cache-first cho mọi GET bao gồm HTML. Server-side `revalidatePath` + `force-dynamic` bị vô hiệu hóa. Defer fix sang T-024 (audit) → T-025 (batch fix strategy A) → close T-021.

### Rebase Step 5 (2026-05-17)

- Rebase lên main (sau T-024 audit + T-025 batch fix + workflow v3.3) → 5 commits replay clean, no conflict.
- Files debug + audit-t016 inventory move từ memory/ → work/ theo restructure 8fd3292.
- Phase C re-check pass (tsc + build) sau rebase.

---

## ACT — Bài học rút ra

1. **Optional vs required fields phải tách biệt rõ ở 2 layer: DB logic (`checkProfileComplete`) + UI rendering (warning màu)**. (CODE)
   Bug 1 do treat 3 optional fields (CCCD front/back, contract) như required ở cả 2 layer. Fix tách bạch: 8 required fields block complete, 3 optional fields warning vàng không block. Reference precedent cho Module 3 documents khi thêm field optional.

2. **Server actions cross-role phải revalidate cả 2 path (tenant + admin) + page render data**. (CODE)
   Bug 2 do server actions chỉ revalidate own path. Pattern T-016c `createTenantAction` (4 path) là template chuẩn — applied cho `approveMoveRequestAction`, `rejectMoveRequestAction`. T-025 áp dụng cùng pattern cho `createMoveRequestAction` + `cancelMoveRequestAction`. Audit anti-pattern SA1+SA3 (code-review-pattern.md v1.0) catch được pattern này ở Phase C.

3. **Page server component dùng `cookies()` (qua `getCurrentUser`) phải có `export const dynamic = 'force-dynamic'`**. (CODE)
   Bug 4 root cause include cả HTTP cache layer. Force-dynamic + Cache-Control no-store cần thiết dù `cookies()` ngầm trigger dynamic. Audit anti-pattern SC1 (code-review-pattern.md) catch ở Phase C BƯỚC 4. T-021b fix `/dashboard`, T-025 fix 5 page nữa.

4. **Service worker layer can intercept Next.js cache invalidation — fix at SW level, not Next.js level**. (LOGIC — đã user duyệt strategy A ở T-025 Step 4.2)
   Bug 4 architectural — server-side `revalidatePath` + `force-dynamic` + HTTP `Cache-Control: no-store` đều bị bypass nếu SW return cached match. Lesson cho mọi PWA về sau: SW cache-first phải exclude navigation/HTML cho data-driven page. Strategy A (skip navigation entirely) implemented T-025.

5. **Phase E auto workflow v3.2 first test → exposed 4-layer bug (ESLint + image domain + .next + SW)**. (LOGIC — process validation)
   Workflow v3.2 Phase E auto (eat-our-own-dogfood) chứng minh giá trị ngay lần test đầu: catch 4 bug ở 4 layer khác nhau, không layer nào catch được bằng tsc/build/lint tĩnh. Phase E là "moment of truth" không thay thế được. Triết lý: catch bug ở C (anti-pattern audit v3.3) bất cứ khi nào pattern có sẵn; còn lại dependence runtime Phase E. Workflow v3.3 + 2 skill mới (code-review-pattern + auto-decision-tiers) là direct outcome của lesson này.
