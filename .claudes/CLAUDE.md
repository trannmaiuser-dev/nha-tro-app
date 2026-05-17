# CLAUDE.md — Nhà Trọ App

File này cung cấp context dự án cho Claude (Claude Code + Claude.ai chat).
Đọc file này trước khi làm bất kỳ task nào.

---

## Dự án là gì

Web app quản lý nhà trọ 4 phòng cho chủ trọ tại Việt Nam.
Hai nhóm người dùng: **chủ trọ** (admin, full quyền) và **khách thuê**.
Mục tiêu dài hạn: mở rộng ra nhiều dãy trọ.

---

## Cấu trúc thư mục dự án

```
nha-tro-app/
├── .claudes/
│   ├── CLAUDE.md                  ← file này
│   └── skills/
│       ├── todo-workflow.md       ← quy trình PDCA + Requirement Check (v3.2)
│       ├── runtime-smoke-test.md  ← Phase E format chung + manual (v1.1)
│       ├── phase-e-auto.md        ← Phase E auto qua Claude in Chrome (v1.0)
│       ├── data-seed-pattern.md   ← convention SQL seed/verify/cleanup (v1.0)
│       ├── debug-workflow.md      ← quy trình tự debug bug runtime (v1.0)
│       ├── data-layer-pattern.md  ← (sẽ tạo trong Module 3)
│       └── server-action-pattern.md ← (sẽ tạo trong Module 3)
│
├── memory/                        ← TỰ ĐỘNG QUÉT
│   ├── nha_tro_app_requirements.md   (BẮT BUỘC tồn tại)
│   ├── usecase-*.md                  (use case từng module)
│   ├── retrospective-*.md            (bài học từ các retrospective)
│   └── <chu-de>-notes.md             (ghi chú khác nếu có)
│
├── task/                          ← lưu ý: singular (legacy đặt tên)
│   ├── README.md
│   ├── template/TEMPLATE.todo.md
│   ├── todo/
│   │   ├── todo.021-fix-onboarding-and-ui.md
│   │   └── 021/                   ← v3.2: subfolder cho Phase E auto SQL
│   │       ├── seed.sql
│   │       └── verify.sql
│   └── done/
│       └── 021/                   ← di chuyển nguyên folder khi rename
│           ├── seed.sql
│           └── verify.sql
│
└── (root)                         ← Next.js code: app/, components/, lib/, types/
```

### ⚠️ Quy tắc QUAN TRỌNG về memory/

- Thư mục `memory/` được **TỰ ĐỘNG SCAN** mỗi khi Requirement Check
- **KHÔNG** có bảng mapping cứng file → module
- Mỗi khi user thêm file `.md` mới, Claude tự phát hiện và đọc nếu liên quan
- File matching theo keyword trong tên file
- **LUÔN đọc:** `nha_tro_app_requirements.md` + `retrospective-*.md`

Xem chi tiết tại `.claudes/skills/todo-workflow.md` (Hành vi 3).

---

## Stack kỹ thuật

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Next.js 14+ (App Router, TypeScript) | |
| Styling | Tailwind CSS | Màu sắc thân thiện, tiếng Việt |
| Deploy | Vercel (free tier) | |
| Database | Supabase PostgreSQL | Free tier, region Singapore |
| Auth | Custom JWT (quyết định T-003) | Không dùng Supabase Auth |
| Storage | Supabase Storage | File ảnh, PDF |
| Functions | Supabase Edge Functions | Cron, archive |
| PDF | @react-pdf/renderer | Font Be Vietnam Pro |
| Forms | react-hook-form + zod | Pattern chuẩn |
| Toast | sonner | Không dùng library khác |
| Camera AI | Face-api.js | Giai đoạn 5 |

### Dev tooling

- **Dev impersonate endpoint** `/api/dev/impersonate` cho Phase E auto (T-022, 2026-05-17).
  Cần `DEV_IMPERSONATE_TOKEN` trong `.env.local`. Disable production qua `NODE_ENV` check
  (4 layer defense). Xem `task/done/done.022-dev-impersonate-endpoint.md`.

---

## Quy tắc code BẮT BUỘC

### Ngôn ngữ
- Giao diện: **tiếng Việt hoàn toàn** — label, placeholder, lỗi, toast
- Code (biến, hàm, comment): tiếng Anh
- Không trộn lẫn

### TypeScript
- Định nghĩa type/interface riêng cho mỗi entity
- **TUYỆT ĐỐI KHÔNG dùng `any`** — dùng `unknown` nếu thực sự không rõ
- Types trong `src/types/` hoặc gần file dùng
- ✅ Codebase đã đạt **100% no-any** (T-014c, 2026-05-16) — khi nhận data shape biến đổi, dùng `as unknown as T` thay vì `any`

### Component
- Mỗi component một file, đặt trong `src/components/<module>/`
- Tên file: PascalCase
- Tách UI dumb component vs container component
- **Component nên < 200 dòng** (refactor nếu vượt)

### Supabase
- KHÔNG gọi Supabase trực tiếp trong component
- Tạo hàm wrapper trong `src/lib/db/`
- Luôn handle error từ Supabase
- Không hardcode key — chỉ dùng env var

### Component & Helper dùng chung ⭐ MỚI (sau retrospective)

> Khi cần các UI elements sau, BẮT BUỘC dùng component chung — KHÔNG implement lại:

| Nhu cầu | Component chung | Vị trí |
|---|---|---|
| Modal/Dialog | `<Modal>` | `components/ui/Modal.tsx` (tạo trong Module 3) |
| Upload nhiều ảnh | `<MultiImageUpload>` | `components/ui/MultiImageUpload.tsx` |
| Confirm xóa/nguy hiểm | `<ConfirmDialog>` | `components/ui/ConfirmDialog.tsx` |
| Type kết quả action | `Result<T>` | `lib/types/action-result.ts` (tạo trong Module 3) |

Nếu cần component mới chưa có → tạo trong `components/ui/` để tái sử dụng.

### Responsive
- Trang **admin**: desktop-first, dùng được mobile
- Trang **tenant** (`/tenant/*`): mobile-first — test viewport 390px

---

## 6 Module và trạng thái ⭐ MỚI (cập nhật sau retrospective T-015)

| # | Module | Route | Giai đoạn | Trạng thái | Tiến độ |
|---|---|---|---|---|---|
| 1 | Quản lý phòng & khách thuê | `/admin/rooms`, `/admin/tenants` | 1 | 🟢 Done (T-001 → T-010 + T-016/c/d hotfix) | T-016b drop column còn pending sau stable 1-2 tuần |
| 2 | Thu chi & hóa đơn | `/admin/finance` | 2 | 🟡 Cơ bản done, chờ T-017 cảnh báo nợ | T-011 → T-015 + T-014b done (notification đầy đủ) |
| 3 | Giấy tờ | `/admin/documents` | 3 | 🔲 Chưa làm | — |
| 4 | Camera AI | `/admin/camera` | 5 | 🔲 Chưa làm | — |
| 5 | Thông báo nội bộ | (tích hợp) | 2 | 🟢 Done cho Module 2 | move-requests + payment-proofs đã có notify |
| 6 | Cộng đồng | `/community` | 4 | 🔲 Chưa làm | — |

> Bảng này tự động cập nhật sau mỗi `done`. Xem todo-workflow.md Hành vi 5 Bước 4.

**Trang khách thuê:** `/tenant/onboarding`, `/tenant/home`, `/tenant/move-out`, `/tenant/guests`, `/tenant/payments`, `/tenant/community`, `/tenant/report`

---

## Quyết định nghiệp vụ chính ⭐ MỚI (sau retrospective)

> Các quyết định này áp dụng cho Module Khách thuê + Thu chi trở đi.

### Multi-tenant (T-016 đã làm ✅, 2026-05-16)
- **Schema:** bảng `room_tenants(room_id, user_id, joined_at, left_at, is_primary)` — many-to-many
- **Tiền cọc:** theo phòng (1 lần), không chia theo khách
- **Trả cọc:** khi cả phòng trả → trả lại cho người **cuối cùng đứng tên** (`is_primary` flag)
- **Đóng góp giữa khách:** chủ quản lý ngoài app
- **Backward compat:** `rooms.tenant_id` vẫn được sync = primary hiện tại; T-016b sẽ drop sau 1-2 tuần stable

### Cảnh báo nợ (UC-05, T-017 sẽ làm)
- **has_debt ở INVOICE level**, không phải user level
- `users.has_debt` sẽ XÓA đi sau T-017
- Cảnh báo theo **PHÒNG**, không cảnh báo theo cá nhân
- Lý do: 1 phòng = 1 invoice, multi-tenant không thay đổi điều này

### Migration cũ
- Không cần script migrate `payments` → `invoices`
- 4 phòng có ít data → xóa table cũ + bắt đầu lại
- Quick fix `payments: any[]` ở `app/dashboard/page.tsx:34` khi refactor

### ACT trong todo
- Claude **đề xuất** nội dung "Bài học rút ra" dựa trên ghi chú + lỗi gặp phải
- User **duyệt và bổ sung** trước khi rename
- Không bao giờ rename nếu ACT trống

---

## Database schema (tham khảo)

> Schema cập nhật theo task. Đọc migration trong `supabase/migrations/`.

Bảng hiện có:
```
users, rooms, tenant_profiles, app_settings
move_requests, guests
electricity_logs, invoices, payment_proofs, expenses, meter_reading_logs
notifications
room_tenants  # T-016 multi-tenant (UC-02)

# Module 3 (sắp tới):
documents, document_categories
```

Bảng sẽ thêm:
- `face_logs` (giai đoạn 5)
- `community_posts`, `community_comments`, `messages`, `schedules` (giai đoạn 4)

---

## Quy trình làm task

Mỗi task có file `tasks/todo/todo.XXX-ten-task.md` theo PDCA + Requirement Check:

1. **PLAN** — scope rõ (trong/ngoài), deliverables, dependencies
2. **DO** — code theo checklist, **GHI CHÚ KỸ** trong "Ghi chú khi làm"
3. **CHECK** — self-check code quality
4. **REQUIREMENT CHECK** — tự scan `memory/`, đối chiếu nghiệp vụ
5. **VERIFY** — test cases tĩnh (✅/❌/⏭️, không ⬜)
6. **RUNTIME SMOKE TEST (Phase E)** ⭐ v3.1, MỞ RỘNG v3.2 — 3 mode declare ở todo metadata:
   - `auto` → `.claudes/skills/phase-e-auto.md` (Claude in Chrome + Supabase Studio)
   - `manual` → `.claudes/skills/runtime-smoke-test.md` (user test tay, legacy)
   - `hybrid` → kết hợp 2 file trên
   Áp dụng từ T-021 trở đi. Task done T-001 → T-020 giữ implicit manual mode.
7. **ACT** — Claude đề xuất bài học, user duyệt
8. **RENAME** — đổi tên + auto-update bảng module trong CLAUDE.md

Khi xong: rename `todo.XXX-*.md` → `done.XXX-*.md`

Khi Phase E FAIL → dùng skill `.claudes/skills/debug-workflow.md` (1 debug session = 1 commit, task hậu tố T-XXXb/c/d).

Xem chi tiết tại `.claudes/skills/todo-workflow.md` v3.1.

---

## Khi Claude nhận yêu cầu mới

1. **Xác định task** — thuộc todo nào? Chưa có → hỏi tạo
2. **Kiểm tra scope** — có trong PLAN không?
3. **Kiểm tra dependencies** — task trước đã done?
4. **Tự scan memory/** — đọc file liên quan + retrospective gần nhất

### Khi viết code
- Luôn hỏi trước nếu có quyết định kỹ thuật ảnh hưởng lớn
- Giải thích ngắn gọn để chủ trọ hiểu
- Phát hiện vấn đề ngoài scope → ghi vào "Task phát sinh"

### Khi gặp lỗi
- Đọc lỗi đầy đủ trước khi đề xuất fix
- Giải thích lỗi trước khi sửa
- Không sửa nhiều thứ cùng lúc

### Khi rename done
- BẮT BUỘC đề xuất bài học ACT trước
- BẮT BUỘC update bảng module trạng thái

---

## Những điều chưa quyết định

- [ ] Tên app / thương hiệu
- [ ] Bảng màu cụ thể
- [ ] Camera: USB webcam hay IP WiFi?
- [ ] Tên miền riêng hay dùng `.vercel.app`?

---

## File quan trọng cần đọc khi cần

| Loại | Vị trí | Khi nào |
|---|---|---|
| Context tổng | `.claudes/CLAUDE.md` | Mỗi session mới |
| Quy trình PDCA | `.claudes/skills/todo-workflow.md` (v3.2) | Khi làm task |
| Phase E format chung + manual | `.claudes/skills/runtime-smoke-test.md` (v1.1) | Khi viết Phase E cho task có UI change |
| Phase E auto | `.claudes/skills/phase-e-auto.md` (v1.0) | Task có `mode: auto` (Claude in Chrome) |
| Data seed pattern | `.claudes/skills/data-seed-pattern.md` (v1.0) | Mọi task có seed/verify SQL |
| Debug bug runtime | `.claudes/skills/debug-workflow.md` (v1.0) | Khi Phase E fail, user paste prompt-debug-from-symptom |
| Pattern data layer | `.claudes/skills/data-layer-pattern.md` | Khi code lib/db/ (sẽ có) |
| Pattern server action | `.claudes/skills/server-action-pattern.md` | Khi code actions.ts (sẽ có) |
| Yêu cầu tổng | `memory/nha_tro_app_requirements.md` | Requirement Check |
| Use case chi tiết | `memory/usecase-*.md` | **Tự scan** khi Requirement Check |
| Retrospective | `memory/retrospective-*.md` | **LUÔN đọc** — bài học cũ |

---

*CLAUDE.md version: 1.5 · Cập nhật: 2026-05-17*

**Changelog:**
- v1.5 (17/05/2026): Workflow v3.2 — Phase E auto support
  - Thêm 2 skill: `phase-e-auto.md` (v1.0) + `data-seed-pattern.md` (v1.0)
  - Bump `todo-workflow.md` v3.1 → v3.2 (Phase C build bắt buộc, mode declare, amend pattern)
  - Bump `runtime-smoke-test.md` v1.0 → v1.1 (note mode declare + cross-link)
  - Cấu trúc thư mục cập nhật: `task/<id>/seed.sql + verify.sql` cho Phase E auto
  - Bảng "File quan trọng" thêm 2 row skill mới
  - Áp dụng từ T-021 trở đi (eat-our-own-dogfood); T-001 → T-020 giữ implicit manual mode
- v1.4 (17/05/2026): T-022 dev impersonate endpoint cho Phase E auto
  - Thêm subsection "Dev tooling" trong "Stack kỹ thuật" với note `/api/dev/impersonate`
  - Workflow v3.2 (Phase E auto, sắp viết) sẽ reference endpoint này
- v1.3 (16/05/2026): Sau retrospective T-016 (workflow v3.1)
  - Thêm 2 skill mới: `runtime-smoke-test.md` (v1.0) + `debug-workflow.md` (v1.0)
  - Bump `todo-workflow.md` v3.0 → v3.1 (thêm Phase E)
  - Update "Quy trình làm task": thêm bước 6 RUNTIME SMOKE TEST giữa VERIFY và ACT
  - Bảng "File quan trọng" bổ sung 2 skill mới
- v1.2 (16/05/2026): Sau retrospective T-015
  - Update bảng "6 Module trạng thái" (Module 1, 2 đã 🟡)
  - Thêm section "Quyết định nghiệp vụ chính" (multi-tenant, cảnh báo nợ, migration, ACT)
  - Thêm rule "Component & Helper dùng chung" (Modal, MultiImageUpload, ConfirmDialog, Result)
  - Reference đến 2 skill sắp tạo (data-layer-pattern, server-action-pattern)
  - LUÔN đọc retrospective-*.md trong memory/
- v1.1: Bỏ liệt kê cứng memory/
- v1.0: Phiên bản đầu
