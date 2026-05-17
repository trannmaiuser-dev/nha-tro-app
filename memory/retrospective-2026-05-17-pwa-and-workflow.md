# Retrospective — PWA SW + Workflow auto (T-021 + T-022 + T-024 + T-025)

**Date**: 2026-05-17
**Tasks done**: T-021, T-022, T-024, T-025
**Workflow bump**: v3.2 → v3.3
**Skills added**: code-review-pattern.md (v1.0) + auto-decision-tiers.md (v1.0)

---

## Issues encountered

### Bug 1 — ESLint pre-commit miss (T-021)
- **Layer**: Static check
- **Symptom**: `tsc --noEmit` pass nhưng `npm run build` fail với `react/no-unescaped-entities`
- **Impact**: BLOCKING commit
- **Fix**: Workflow v3.2 — Phase C BẮT BUỘC `npm run build` (không chỉ tsc)

### Bug 2 — Test data avatar crash next/image (T-021)
- **Layer**: Data/test fixtures
- **Symptom**: Seed dùng `https://test.local/...` cho avatar → next/image crash do domain không trong `images.remotePatterns`
- **Impact**: BLOCKING Phase E E1
- **Fix**: Seed `avatar_url=NULL` + ghi rule vào `data-seed-pattern.md`

### Bug 3 — `.next/` stale sau rebase (T-021)
- **Layer**: Dev workflow
- **Symptom**: Sau rebase, `.next/cache/` không match symbol mới → runtime error
- **Impact**: BLOCKING Phase E E2/E3 first attempt
- **Fix**: `rm -rf .next && npm run build` — dev workflow note

### Bug 4 — Service worker cache-first navigation (CRITICAL, T-021 → T-024 → T-025)
- **Layer**: PWA/SW
- **Symptom**: F5 thường `/dashboard` vẫn stale dù server-side `revalidatePath` + `force-dynamic` + `Cache-Control: no-store` pass
- **Root cause**: SW cache-first cho mọi GET bao gồm HTML navigation. SW return cached match ngay, không hỏi server
- **Impact**: BLOCKING T-021 Phase E E2/E3
- **Fix**: T-025 strategy A — SW exclude `request.mode === 'navigate'` + `destination === 'document'` + bump CACHE v6
- **Discovery path**: Bug 1-3 fix xong → còn stale → audit (T-024) → Issue #1 CRITICAL → strategy decision → T-025 fix

---

## Root cause analysis

| Bug | Why missed in earlier phase |
|---|---|
| Bug 1 | Phase C lỏng — chỉ tsc, không build (ESLint chạy ở build time) |
| Bug 2 | `data-seed-pattern` không có rule URL constraint với next/image domain |
| Bug 3 | Dev workflow không document clear `.next/` step sau rebase |
| Bug 4 | SW design naive từ giai đoạn 1 — không nghĩ tới data-driven page khi viết SW cache-first |

Pattern chung: thiếu **anti-pattern audit** ở Phase C cho 4 layer (server actions + server components + data layer + SW). T-024 audit lần đầu fill gap này.

---

## Improvements applied

### Workflow

- **v3.2** (T-022 → T-021 retrospective bootstrap): Phase C BẮT BUỘC build, Phase E mode declare, amend pattern
- **v3.3** (T-024 → T-025 retrospective): Phase C BƯỚC 4 audit 12 anti-pattern, Phase ACT auto-approve CODE lesson, decision tier LOW/HIGH

### Skills mới

- `code-review-pattern.md` v1.0 — 12 anti-pattern check (SA1-4, SC1-3, DL1-3, SW1-2, BN1)
- `auto-decision-tiers.md` v1.0 — Tier LOW auto vs Tier HIGH user duyệt

### Code fixes

- T-025 batch fix: 5 page force-dynamic (home, notifications, chat, admin/tenants, rooms)
- T-025: SW navigation exclusion strategy A + CACHE v6
- T-025: cross-role revalidate cho move-request action (create + cancel)
- T-021: onboarding optional fields tách layer (DB + UI)
- T-021: revalidatePath audit cho approve/reject move-request actions

### File structure

- `memory/` reference auto-scan
- `work/` working artifact (audit/debug/progress) — không auto-scan
- `task/<id>/` per-task SQL subfolder (seed/verify/cleanup)

---

## Lessons (logic level)

### Architectural

1. **PWA service worker layer can intercept Next.js cache invalidation**.
   Server-side `revalidatePath` + `force-dynamic` + HTTP `Cache-Control` đều bypass-able nếu SW return cached match. Fix at SW level (skip navigation/HTML), not Next.js level.

2. **Audit-driven batch fix more efficient than 1-by-1 reactive**.
   T-024 audit phát hiện 15 issue trong 1 session. T-025 fix 5 HIGH/CODE issue trong 1 commit theo precedent rõ. So với reactive fix (gặp đâu sửa đó qua nhiều task hậu tố b/c/d), batch giảm context-switch + đảm bảo consistency.

3. **Severity × Category 2D matrix prioritize hiệu quả hơn 1D severity**.
   Category (CODE vs LOGIC) làm trục 2 cho phép decide auto-fix vs user-duyệt. HIGH/CODE auto-fixable, HIGH/LOGIC stop user duyệt strategy.

### Process

4. **Auto-approve CODE lesson cần thiết cho workflow sustainability**.
   v3.0 yêu cầu user duyệt MỌI ACT lesson → ~30% human intervention rate. Hầu hết lesson là technique (CODE), có precedent. v3.3 tách CODE auto-approve, LOGIC stop → ~10-15% intervention. Human focus đúng vào decision quan trọng.

5. **Phase E là moment of truth không thay thế được, nhưng Phase C anti-pattern audit catch được nhiều bug trước**.
   Phase E auto v3.2 first test exposed 4-layer bug. Một số bug (Bug 4 SW) không thể catch bằng static check. Tuy nhiên 3/4 bug khác có thể catch ở Phase C nếu có audit pattern (Bug 1: build check, Bug 2: data-seed rule, Bug 3: dev workflow note). v3.3 BƯỚC 4 fill gap đó.

6. **Working artifact (audit/debug/progress) tách khỏi reference (requirements/usecases/retrospectives)**.
   Restructure 8fd3292 — `memory/` chỉ reference auto-scan, `work/` chỉ artifact không auto-scan. Tránh stale info pollute Requirement Check phase.

### Tooling

7. **Dev impersonate endpoint (T-022) là tiền đề cho Phase E auto**.
   Không có way to programmatically login → Phase E auto không workable. 4-layer defense (NODE_ENV + token + dev-only header + audit log defer) đủ an toàn cho dev env.

---

## Backlog created from session

| Task | Severity | Source | Description |
|---|---|---|---|
| T-023 | HIGH | T-021 E1 deferred | Avatar wizard accept DB URL (tenant_profiles.avatar_url đã set từ seed, wizard không match → block complete) |
| T-026 | HIGH/LOGIC | T-024 audit Issue #6 | Transactional wrap cho `approveMoveRequest` + `createTenantAccount` (multi-write atomicity) — cần user duyệt approach (Supabase RPC vs PG function) |
| T-027 | MEDIUM | T-024 audit Phase 3 | Batch fix MEDIUM (Issue #3b profile×3, community + #7-10 cross-role revalidate + #11 router.refresh + #14 settings revalidate report + Bonus #1 data-seed-pattern rule) |
| Future T-XXX | LOW (architectural) | T-024 audit Issue #13 | Tag-based caching migration (`revalidateTag` thay `revalidatePath`) |
| Future T-XXX | LOW (security) | T-024 audit Bonus #2-3 | Security audit (JWT verify DB lookup + dev impersonate audit log) |

---

## Numbers

- **Tasks done**: 4 (T-021, T-022, T-024, T-025)
- **Skills created**: 2 (code-review-pattern, auto-decision-tiers)
- **Workflow bumps**: 2 (v3.2 → v3.3)
- **Bugs caught + fixed**: 4 (3 CODE + 1 LOGIC)
- **Anti-pattern check codified**: 12 (SA1-4 + SC1-3 + DL1-3 + SW1-2 + BN1)
- **Hard stops triggered**: 2 (SW strategy A user decision + Phase E option choice ×2)
- **Auto-decisions logged**: 10+ across T-021/T-024/T-025
- **Estimated human intervention**: ~12% (down from ~30% pre-v3.3)
