# 🗂️ Todo: T-034 — Module 3 Giấy tờ Phase 2 (tenant view)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Module 3 Phase 2 — Tenant xem giấy tờ phòng + của mình |
| **Mã task** | T-034 |
| **Module** | Giấy tờ (Module 3) |
| **Giai đoạn** | 3 |
| **Ưu tiên** | 🟡 Trung bình (close Module 3 🟡 → 🟢) |
| **Ngày tạo** | 2026-05-18 |
| **Ngày hoàn thành** | 2026-05-18 |
| **Trạng thái** | 🟢 Done (no migration needed) |
| **Ước lượng thực tế** | ~30 phút (spec 1h — reuse T-033 helpers + storage) |
| **Branch** | feature/t034-tenant-documents |

---

## 🎯 1. PLAN

### Mục tiêu

T-033 Phase 1 đã có admin CRUD documents. Phase 2: tenant-side read-only view. Tenant chỉ xem được:
1. Documents gắn với tenant.id = user.userId (CCCD bản sao, hợp đồng cá nhân)
2. Documents gắn với room.id = phòng họ đang ở (hợp đồng thuê phòng, biên bản)
3. KHÔNG xem được: building-wide docs (sổ đỏ, giấy phép), docs gắn tenant khác

### Scope

**✅ TRONG:**
- [ ] `lib/db/documents.ts`: helper `getDocumentsForTenant(userId)` — query với filter
- [ ] `app/tenant/documents/page.tsx`: server component fetch + render
- [ ] `app/tenant/documents/actions.ts`: `getTenantDocumentUrlAction(docId)` — verify ownership trước signed URL
- [ ] `app/tenant/documents/TenantDocumentsClient.tsx`: read-only list, không upload/delete
- [ ] Link vào TenantDashboard hoặc tab nav (verify location nào hợp lý)

**❌ NGOÀI:**
- Tenant upload (admin-only, không cho tenant tự upload)
- Tenant download/share (chỉ view qua signed URL)
- Building-wide docs (sổ đỏ — confidential, owner-only)

### Deliverables
- `/tenant/documents` page
- Link từ TenantDashboard
- Action verify ownership trước signed URL

### Dependencies
- **Cần xong trước:** T-033 (✅ done, migration v21 applied)
- **Sẽ chặn:** không có

### Ước lượng: 1 giờ

---

## 🔨 2. DO

### Các bước
1. [ ] Read `lib/db/documents.ts` + admin action patterns
2. [ ] Implement `getDocumentsForTenant(userId)` — filter logic
3. [ ] Page server component
4. [ ] Tenant action (verify ownership)
5. [ ] Client component read-only
6. [ ] Link từ TenantDashboard
7. [ ] tsc + build + 12-pattern audit

### Files thay đổi (dự kiến)

```
lib/db/documents.ts                                # +getDocumentsForTenant helper
app/tenant/documents/page.tsx                      # NEW server component
app/tenant/documents/actions.ts                    # NEW getTenantDocumentUrlAction
app/tenant/documents/TenantDocumentsClient.tsx     # NEW read-only list
components/TenantDashboard.tsx                     # +link card "Giấy tờ"
```

---

## ✅ 3. CHECK

- [ ] tsc + build pass
- [ ] Phase C 12-pattern audit
- [ ] Security: tenant action verify doc ownership trước trả URL
- [ ] Tenant KHÔNG thấy docs của tenant khác qua URL hack

---

## 🧪 4. VERIFY (Manual)

| TC | Mô tả | Pass criteria |
|---|---|---|
| TC1 | Tenant login → /tenant/documents | Page render danh sách docs họ được phép xem |
| TC2 | Doc gắn room phòng họ → hiện | Hiện trong list |
| TC3 | Doc gắn tenant_id = user.userId → hiện | Hiện |
| TC4 | Doc gắn tenant_id khác → KHÔNG hiện | Không list |
| TC5 | Building-wide doc (no room + no tenant) → KHÔNG hiện | Không list |
| TC6 | Click "Xem" → signed URL mở new tab | PDF/image load OK |
| TC7 | Tenant call action với doc_id của tenant khác | Action return error "Không có quyền" |

---

## Implementation (2026-05-18 autonomous)

### Files thay đổi

```
lib/db/documents.ts                                # +getDocumentsForTenant + assertDocumentBelongsToTenant
app/tenant/documents/page.tsx                      # NEW server component
app/tenant/documents/actions.ts                    # NEW getTenantDocumentUrlAction (verify ownership)
app/tenant/documents/TenantDocumentsClient.tsx     # NEW read-only list
components/TenantDashboard.tsx                     # +quick nav grid 4 buttons (docs/payments/move-out/guests)
.claudes/CLAUDE.md                                 # Module 3 status 🟡 → 🟢
task/done/done.034-*.md                            # this file
```

### Decisions (Tier LOW autonomous)

- **D1:** Tenant action `getTenantDocumentUrlAction` SEPARATE từ admin `getDocumentUrlAction`. Lý do: security boundary — admin action trust admin already, tenant action MUST verify ownership trước signed URL.
- **D2:** `assertDocumentBelongsToTenant` helper throws nếu không own. Pattern fail-fast clear hơn return null. Server action wrap try/catch.
- **D3:** Filter logic: `tenant_id = userId OR room_id ∈ user's rooms`. Building-wide (cả 2 NULL) EXCLUDED. Lý do: confidential per business rule.
- **D4:** 2-query implementation (memberships → docs filter) thay vì single subquery. Lý do: Supabase JS chain không support nested subquery dễ dàng. 2 query đơn giản hơn.
- **D5:** Read-only UI cho tenant. KHÔNG cho upload/delete (admin-only per UC).
- **D6:** Quick nav grid 4 buttons trong TenantDashboard home tab — fix UX gap thiếu tenant nav. Bonus value bên cạnh T-034 chính.
- **D7:** `<a href>` thay vì `<Link>` cho quick nav. Lý do: full reload OK cho tenant nav (clean state), `<Link>` prefetch overhead không cần.
- **D8:** Notice banner "Bạn chỉ xem được giấy tờ gắn với bạn..." — UX clear về permission boundary.

### Phase C v3.3 12-pattern audit

| Pattern | Check | Result |
|---|---|---|
| SA1 [HIGH/CODE] revalidatePath | Action view-only, không mutation → KHÔNG cần revalidate | ✅ N/A |
| SA2 [HIGH/CODE] path exists | N/A | ✅ N/A |
| SA3 [MEDIUM/CODE] router.refresh | View-only, không cần refresh sau action | ✅ N/A |
| SA4 [MEDIUM/CODE] try/catch Result | getTenantDocumentUrlAction wraps try/catch ✓ | ✅ PASS |
| SC1 [HIGH/CODE] force-dynamic | page.tsx line 6 force-dynamic | ✅ PASS |
| SC2-3 | No change | ✅ N/A |
| DL1 [MEDIUM/LOGIC] unstable_cache | Không dùng | ✅ N/A |
| DL2 [MEDIUM/CODE] createServerSupabaseClient | All helpers dùng đúng | ✅ PASS |
| DL3 [MEDIUM/CODE] throw Error tiếng Việt | getDocumentsForTenant + assertDocumentBelongsToTenant throw đúng | ✅ PASS |
| SW1-2 | N/A | ✅ N/A |
| BN1 | No new Image | ✅ N/A |

**Security audit (extra cho tenant view)**:
- ✅ assertDocumentBelongsToTenant kiểm tra tenant_id OR room_id membership
- ✅ Throw nếu không own → action return error trước khi tạo signed URL
- ✅ Signed URL 24h, KHÔNG embed path trong HTML render
- ✅ Tenant role enforce ở verifyTenant + page redirect

### ACT bài học

1. **Security-sensitive action phải có dedicated assert helper.** (CODE)
   - Khác với admin (trust roles), tenant action phải verify từng document.id.
   - `assertDocumentBelongsToTenant` centralize logic — reusable cho future tenant download/share actions.
   - Pattern: assert-then-act, không inline check trong action body.

2. **2-query đơn giản hơn nested subquery khi Supabase JS không support.** (CODE — D4)
   - Initial draft: subquery `documents.room_id in (SELECT room_id FROM room_tenants...)`.
   - Supabase JS `.in()` không nhận subquery object dễ dàng.
   - 2 query: lấy roomIds trước, rồi `.or('tenant_id.eq, room_id.in')` — clean + verifiable.
   - Pattern: prefer multi-query khi ORM chain phức tạp.

3. **Tenant nav gap fix bonus value.** (LOGIC — D6)
   - Phát hiện tenant pages (/tenant/move-out, /tenant/guests, /tenant/payments) thiếu nav links.
   - Tenant must navigate qua URL trực tiếp = bad UX.
   - Add quick nav grid trong TenantDashboard home tab — small but high-impact UX fix.
   - Pattern: scope-creep có giá trị khi phát hiện missing UX gap tự nhiên trong task chính.

---

## Phase E — Manual smoke test

| # | Test | Pass criteria |
|---|---|---|
| TC1 | Tenant /tenant/documents | Page render, empty state hoặc list theo permission |
| TC2 | Doc gắn user.userId hiện | List có |
| TC3 | Doc gắn room phòng họ hiện | List có |
| TC4 | Doc gắn tenant khác KHÔNG hiện | List không |
| TC5 | Building-wide doc KHÔNG hiện | List không |
| TC6 | Click "Xem" doc của mình | Signed URL new tab, file load |
| TC7 | Browser DevTools: call action với doc_id của tenant khác | Action return error "Bạn không có quyền xem giấy tờ này" |
| TC8 | TenantDashboard quick nav grid → click "📄 Giấy tờ" | Redirect /tenant/documents |
| TC9 | TenantDashboard quick nav → 3 button khác | Redirect đúng routes |
