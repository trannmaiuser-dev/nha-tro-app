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
| **Ngày hoàn thành** | — |
| **Trạng thái** | 🔲 Todo (NOT execute session này — defer scope) |

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

## Lưu ý

KHÔNG start session này (user mệt, defer cho session khác). Todo file tạo để track backlog visibility.
