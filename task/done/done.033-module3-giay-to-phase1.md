# 🗂️ Todo: T-033 — Module 3 Giấy tờ Phase 1 (NEW module)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Module 3 Giấy tờ — Schema + CRUD admin documents |
| **Mã task** | T-033 |
| **Module** | Giấy tờ (Module 3) |
| **Giai đoạn** | 3 |
| **Ưu tiên** | 🟡 Trung bình (next module trong roadmap) |
| **Ngày tạo** | 2026-05-18 |
| **Ngày hoàn thành** | 2026-05-18 |
| **Trạng thái** | 🟢 Done Phase 1 (chờ user apply migration v21) |
| **Ước lượng thực tế** | ~1.5 giờ (spec 1 ngày — reuse storage bucket + simple FormData action) |
| **Branch** | feature/t033-module3-documents |

---

## 🎯 1. PLAN

### Mục tiêu

Implement Module 3 Giấy tờ Phase 1: schema `documents` + `document_categories` + admin UI CRUD upload/list/preview/delete giấy tờ phòng (hợp đồng thuê, biên bản, etc.).

Tham khảo: `memory/usecase-quan-ly-giay-to.md` (nếu có) hoặc roadmap CLAUDE.md.

### Scope

**✅ TRONG:**
- [ ] Migration v21: tables `documents` (id, room_id, tenant_id, category_id, file_url, name, uploaded_by, uploaded_at) + `document_categories` (id, name, description, system_default)
- [ ] Seed default categories: "Hợp đồng thuê", "Biên bản kiểm tra", "CCCD bản sao", "Giấy phép kinh doanh", "Khác"
- [ ] `lib/db/documents.ts`: CRUD helpers (create, list by room, list by tenant, delete)
- [ ] `app/admin/documents/page.tsx`: server component list tất cả documents grouped by category
- [ ] `app/admin/documents/actions.ts`: server actions (upload, delete)
- [ ] Supabase Storage bucket setup (manual qua Supabase Studio — separate doc)
- [ ] Upload component: `<DocumentUploadDialog>` (reuse pattern từ MultiImageUpload nếu có)

**❌ NGOÀI:**
- Tenant-side document view (defer Phase 2)
- Document versioning
- PDF preview inline (use external link đến Supabase storage URL trước)
- Bulk upload
- OCR extraction

### Deliverables
- Migration v21
- 1 module mới /admin/documents
- CLAUDE.md update Module 3 status 🔲 → 🟡

### Dependencies
- **Cần xong trước:** không có
- **Sẽ chặn:** Module 3 Phase 2 (tenant view)

### Ước lượng: 1 ngày (large feature — defer session sau)

---

## 🔨 2. DO

(Fill khi start)

---

## ✅ 3. CHECK

(Fill khi DO xong)

---

## 🧪 4. VERIFY

(Fill)

---

## 🎬 7. ACT

(Fill)

---

## Decisions cần khi start

1. **Supabase Storage bucket**: 1 bucket "documents" hoặc nhiều bucket theo category? → recommend: 1 bucket, prefix path theo category.
2. **File size limit**: 10MB hợp lý cho contract PDF + CCCD photo.
3. **File types**: PDF + JPG/PNG/HEIC. Reject .exe/.zip để security.
4. **Permission**: tenant chỉ xem documents của mình. Owner xem all. RLS off (per D6 T-003) → enforce ở app layer.
5. **Soft delete vs hard delete**: tenant_documents (T-021 era) đã soft delete pattern không? — verify trước implement.

---

## Implementation (2026-05-18 autonomous)

### Files thay đổi

```
supabase/migrations-v21.sql                       # NEW — 2 tables + seed + indexes
lib/db/documents.ts                               # NEW — 5 helpers (getAllCategories, createDocument,
                                                  #        getAllDocuments, deleteDocument, getDocumentSignedUrl)
app/admin/documents/page.tsx                      # NEW — server component fetch + render
app/admin/documents/actions.ts                    # NEW — 3 actions (upload, delete, getUrl)
app/admin/documents/DocumentsClient.tsx           # NEW — list grouped + upload modal + view button
components/HomePageOwner.tsx                      # +1 line: link docs card sang /admin/documents
.claudes/CLAUDE.md                                # Module 3 status 🔲 → 🟡
task/done/done.033-module3-giay-to-phase1.md      # this file
work/t033-apply-migration-prompt.md               # Claude-for-Google migration prompt
```

### Decisions (Tier LOW autonomous)

- **D1:** Bảng `documents` mới, KHÔNG mở rộng `tenant_documents` legacy. Lý do: semantic khác (room-level vs tenant-profile-level), FK references khác (rooms vs tenant_profiles).
- **D2:** Reuse storage bucket "documents" đã có (private + signed URL pattern từ `/api/upload/document` T-021 era). Path convention mới: `room/<roomId>/<ts>.<ext>` hoặc `general/<ts>.<ext>`.
- **D3:** Soft delete `deleted_at` (NOT hard delete). Lý do: audit + recovery khi xóa nhầm. File trong storage NOT auto-cleanup (acceptable cho 4-room scale, manual cleanup nếu cần).
- **D4:** File limit 10MB + MIME whitelist (pdf/jpg/png/webp/heic). Lý do: match existing /api/upload/document pattern.
- **D5:** Server action FormData upload (Next.js 14 supports File trong FormData) thay vì API route. Lý do: consistent với action pattern T-014/T-017, less boilerplate.
- **D6:** UI: list grouped by category + filter chips. KHÔNG search box phức tạp. Lý do: 4-room scale, ít docs, filter chips đủ.
- **D7:** View qua signed URL 24h `window.open()` thay vì inline preview. Lý do: PDF inline phức tạp, signed URL đủ MVP.
- **D8:** Tenant-side view defer Phase 2. Phase 1 admin-only.
- **D9:** `getDocumentUrlAction` separate action thay vì expose path trực tiếp. Lý do: signed URL chỉ tạo khi click "Xem" → tránh leak path qua HTML render.
- **D10:** HomePageOwner card "Hồ sơ & Giấy tờ" trỏ /admin/documents (từ trước là `/dashboard` placeholder). Đã sẵn sàng route.

### Phase C v3.3 12-pattern audit

| Pattern | Check | Result |
|---|---|---|
| SA1 [HIGH/CODE] revalidatePath | uploadDocumentAction + deleteDocumentAction đều revalidatePath('/admin/documents') | ✅ PASS |
| SA2 [HIGH/CODE] path exists | /admin/documents page mới tạo | ✅ PASS |
| SA3 [MEDIUM/CODE] router.refresh after action | DocumentsClient handleUpload + handleDelete đều router.refresh() | ✅ PASS |
| SA4 [MEDIUM/CODE] try/catch Result | 3 actions wrap try/catch return Result<T> | ✅ PASS |
| SC1 [HIGH/CODE] force-dynamic | page.tsx line 7 `export const dynamic = 'force-dynamic'` | ✅ PASS |
| SC2 [MEDIUM/CODE] revalidate conflict | Không add revalidate | ✅ PASS |
| SC3 [HIGH/CODE] server fetch useEffect | DocumentsClient không server fetch useEffect | ✅ PASS |
| DL1 [MEDIUM/LOGIC] unstable_cache | Không dùng | ✅ N/A |
| DL2 [MEDIUM/CODE] createServerSupabaseClient | lib/db/documents.ts dùng createServerSupabaseClient | ✅ PASS |
| DL3 [MEDIUM/CODE] throw Error tiếng Việt | All helpers throw tiếng Việt | ✅ PASS |
| SW1-2 | No SW change | ✅ N/A |
| BN1 | No new Image (file preview qua signed URL window.open) | ✅ N/A |

All 12 PASS hoặc N/A.

### ACT bài học

1. **Reuse storage bucket cũ saved 30% scope.** (CODE)
   - "documents" bucket đã có private + signed URL pattern từ T-021 /api/upload/document.
   - T-033 chỉ thêm path convention `room/<id>` vs `general/`.
   - Pattern: pre-scan storage layer trước khi propose tạo bucket mới.

2. **Soft delete + signed URL = recovery + security combo.** (LOGIC — autonomous decide)
   - Soft delete `deleted_at` cho DB row → recoverable khi xóa nhầm.
   - File storage KHÔNG auto-delete → vẫn truy cập được nếu cần restore.
   - Signed URL 24h khi click "Xem" → KHÔNG leak path trong HTML.
   - Trade-off: storage usage tăng theo time. Acceptable 4-room scale, cleanup manual nếu cần.

3. **Server action FormData thay vì API route.** (CODE — D5)
   - Next.js 14 hỗ trợ File trong FormData server action.
   - Less boilerplate (không cần route handler + fetch wrapper).
   - Consistent với pattern T-014/T-017.
   - Trade-off: action không reusable cho external client. Acceptable cho admin-only flow.

4. **PDF inline preview defer.** (CODE — D7)
   - Inline PDF viewer (react-pdf, iframe) thêm bundle size + edge case.
   - `window.open(signedUrl)` đủ MVP — browser handle PDF rendering.
   - Pattern: defer rich UI cho version sau, ship core flow trước.

5. **Bảng riêng `documents` không gộp `tenant_documents`.** (LOGIC — D1)
   - tenant_documents.tenant_id → tenant_profiles.id (NOT users.id) — semantic khác.
   - documents.tenant_id → users.id (general user, không nhất thiết profile).
   - Gộp 2 bảng → confusion + migration complexity. Tách clean.

---

## Phase E — Manual smoke test

Khi user apply migration v21 + run smoke:

| # | Test | Pass criteria |
|---|---|---|
| E1 | Apply migration v21 trong Supabase Studio | 6 bước prompt pass |
| E2 | Owner → /home → click card "Hồ sơ & Giấy tờ" | Redirect /admin/documents, page render, empty state hiện |
| E3 | Click "+ Upload" → modal mở | Form đủ fields, danh mục dropdown có 5 default categories |
| E4 | Upload 1 PDF gắn phòng + category | Toast success, file hiện trong list grouped đúng category |
| E5 | Click "Xem" trên doc | New tab mở, PDF view qua signed URL |
| E6 | Click "🗑️" → confirm | Doc biến mất khỏi list. DB: deleted_at != NULL (soft) |
| E7 | Filter chip category | Chỉ docs đúng category hiện |
| E8 | Upload file >10MB | Toast error "File quá lớn" |
| E9 | Upload .exe (block MIME) | Toast error "Loại file không hỗ trợ" |

Prompt: [work/t033-apply-migration-prompt.md](work/t033-apply-migration-prompt.md).
