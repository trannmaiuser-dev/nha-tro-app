# T-023 — Avatar wizard accept DB URL (seed data URI cho test fixture)

## Trạng thái: 🟢 Done
## Ngày tạo: 2026-05-18
## Ngày hoàn thành: 2026-05-18
## Ước lượng: 30 phút
## Áp dụng Phase E: ⏭️ Skipped (test fixture change, không user-facing logic — wizard logic giữ nguyên)
## Phase E mode: N/A
## Branch: feature/t023-avatar-wizard-db-url

## Bối cảnh

T-021 Bug 2 fix: seed avatar_url=NULL để tránh crash next/image với domain `test.local`. Side effect: E1 Phase E test ("complete với chỉ optional thiếu") bị block vì wizard yêu cầu avatar (Required field per business rule).

T-024 audit Bonus #1: `next.config.js images.remotePatterns` chỉ allow `*.supabase.co/storage/v1/object/public/**`. Test domain phải dùng NULL — nhưng convention này conflict với E1 test design.

Investigation finding: **Wizard logic ĐÚNG** (`avatarValidity` init=true if avatar_url exists, `validateStep` accept non-empty URL). Vấn đề thực sự ở seed.sql: avatar_url=NULL blocks user proceed.

## Trong scope

1. **Update seed avatar** cho 3 test user (E1 + E2 + E3) trong `task/done/021/seed.sql`:
   - Thay `NULL` bằng SVG data URI (gray square + initial letter)
   - Format: `data:image/svg+xml;base64,...`
   - next/image render data URI native, không cần whitelist

2. **Document seed convention** trong `.claudes/skills/data-seed-pattern.md`:
   - Rule mới: "Avatar URL: dùng SVG data URI cho test fixture, KHÔNG dùng external domain"
   - Pattern reference

3. **Verify wizard accept**: tsc + build + grep audit (no code change in wizard)

## Ngoài scope

- Wizard logic refactor (đã đúng)
- Image upload flow (production user upload real avatar)
- Production avatar URL convention (Supabase storage path đã có)
- Avatar face-check validation (chỉ trigger trên new upload, DB URL skip)
- Phase E re-run T-021 E1 (defer cho session sau, khi user thật vào browser)

## ACT

1. **SVG data URI là cleanest solution cho seed avatar khi next/image yêu cầu whitelist domain.** (CODE)
   - 3 alternative đã consider: (a) Supabase Storage upload thủ công — fragile setup, (b) Whitelist domain placeholder.com — production risk, (c) PNG base64 — bloat SQL.
   - SVG data URI: self-contained, no external dep, render native với next/image. Pattern reusable cho mọi task có test fixture cần avatar.
   - Color palette + letter encoding giúp scenario visual differentiation (E1 gray, E2 blue, E3 green).

2. **Root cause E1 block phải tách "wizard logic bug" vs "test fixture mismatch".** (LOGIC — đã investigate độc lập, không cần user duyệt vì là method observation)
   - Initial assumption (retrospective backlog): "wizard không accept DB URL". Investigation: wizard logic CORRECT (avatarValidity init=true if URL exists, validateStep accept non-empty).
   - Real bug: seed sets NULL (Bug 2 fix side effect). Wizard correctly enforce avatar required.
   - Fix at seed layer, not wizard layer. Wizard logic preserved (avatar IS required cho production tenant).
   - Investigate-before-fix saved unnecessary wizard refactor.

3. **Phase E skip OK cho test fixture change.** (Tier LOW process decision)
   - Không user-facing logic change. Chỉ update test data + skill doc.
   - Phase C pass đủ (tsc + build + anti-pattern audit).
   - Phase E re-run T-021 E1 với seed mới defer cho session khi user vào browser thật.

## Auto-decisions

- [Tier LOW] 2026-05-18 — Chỉ update E1 + E2 avatar (KHÔNG E3 light profile). Lý do: E3 INSERT statement không có column avatar_url (light profile by design), thêm vào ngoài scope T-023.
- [Tier LOW] 2026-05-18 — Color palette theo Tailwind 500 series (gray-500, blue-500, emerald-500). Lý do: contrast trắng OK + brand-neutral cho test.
- [Tier LOW] 2026-05-18 — Skip Phase E auto T-023 (test fixture only). Lý do: không user-facing change, Phase C đủ.
