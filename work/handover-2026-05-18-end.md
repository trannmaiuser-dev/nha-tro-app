Tiếp session — handover từ 2026-05-18 (17 tasks merged)
=========================================================

## Project state snapshot

**Main HEAD**: fe624a9 (origin/main đồng bộ)
**Repo**: github.com/trannmaiuser-dev/nha-tro-app
**Working dir**: C:\aloha\nha-tro-app

### Module status (5/6 🟢)

| # | Module | Status |
|---|---|---|
| 1 | Quản lý phòng & khách thuê | 🟢 Done |
| 2 | Thu chi & hóa đơn | 🟢 Done |
| 3 | Giấy tờ | 🟢 Done (Phase 1 admin + Phase 2 tenant) |
| 4 | Camera AI | 🔲 Chưa làm (Giai đoạn 5, chờ phần cứng camera) |
| 5 | Thông báo nội bộ | 🟢 Done |
| 6 | Cộng đồng | 🟢 Done (audited 2026-05-18) |

### Migrations applied (v16 → v21)

| v | Task | DB | Smoke runtime |
|---|---|---|---|
| v16 | T-026 RPC wrap (approve_move_request + create_tenant_account) | ✅ | ✅ E1/E2/E4 pass (E3 skipped no data) |
| v17 | T-029 audit_logs persistent | ✅ | ✅ 4 steps |
| v18 | T-016b drop rooms.tenant_id + recreate functions | ✅ | ✅ 6 steps |
| v19 | T-017 debt warning (invoices.has_debt + settings) | ✅ | ✅ 6 steps |
| v20 | T-020 transfer schema (transfer_to_room_id + transfer_tenant) | ✅ | ✅ 5 steps |
| v21 | T-033 Module 3 Giấy tờ (documents + document_categories) | ✅ | ✅ 6 steps |

⚠️ **Index name conflict v21**: `idx_documents_tenant` đã đổi tên thành `idx_documents_by_tenant` trong DB (sync với migration file qua fix commit 3e9585a). Khi setup fresh DB → migration v21 đúng tên mới.

⚠️ **Storage bucket**: "documents" private, signed URL 24h pattern. Đã tạo trong session.

---

## Pending user actions

### 1. Smoke tests runtime (UI — chưa run)

Tất cả tasks đã pass DB smoke + tsc + build. Còn lại runtime UI verify trên Chrome:

📄 `work/smoke-tests-runtime-critical.md` — 3 tests critical S10/S18/S23 (DebtBanner + Add 2nd tenant + Transfer validation fail) cho T-017/T-019/T-020. Pre-commit cũ.

📄 `work/smoke-tests-2026-05-18-session.md` — full 28 tests cho 7 tasks earlier (T-028/T-026/T-029/T-016b/T-017/T-019/T-020).

📄 `task/done/done.033-*.md` Phase E section — E1-E9 cho T-033 Module 3 admin documents.

📄 `task/done/done.034-*.md` — TC1-TC9 cho T-034 tenant view documents + quick nav.

📄 `task/done/done.035-*.md` + `done.036-*.md` + `done.037-*.md` — smoke plans inline.

📄 `task/done/done.031-*.md` + `done.032-*.md` — TC plans inline.

### 2. Defer items (autonomous mode trong session 2026-05-18 đã decide)

- T-026 E3 (approve_move_request happy path) — skipped no pending move_request, chờ data thật.
- T-020 transfer happy path (S26/S27) — defer ngày 1-5 next month (today 18/5/2026 KHÔNG match validation 1-5).
- Group chat thực sự (Module 6) — current 1-1 + community feed cover (open decision).

---

## Backlog còn (theo priority)

### Tasks có todo file đã chuẩn bị
(Trong `task/todo/` — KHÔNG có item nào pending. Todo folder empty.)

### Backlog mới chưa có todo file

| Item | Scope | Priority |
|---|---|---|
| **Module 4 Camera AI** | Big (face-api.js + camera hardware setup) | 🔲 chờ user mua camera + decide USB vs IP |
| **Transfer Flow 2** (owner proposes UC-08) | ~2-3h | 🔲 Need open decision: notification CHECK constraint thêm 'transfer_proposal' type? |
| **Cron job debt warning** | ~1-2h (Vercel cron replace on-page check) | 🟢 |
| **Tag-based caching migration** | ~3-4h | 🟢 architectural (Issue #13 T-024 audit) |
| **Audit log JWT events** | ~1-2h (extend T-029) | 🟡 security |
| **T-017b drop users.has_debt** | ~30p | 🟢 defer ≥1 tuần stability |
| **CommunityPage.tsx refactor** | ~2-3h split 2147 LOC → sub-components | 🟢 maintenance |

---

## Skills + workflow (BẮT BUỘC tuân thủ)

`.claudes/skills/`:
- **todo-workflow.md** v3.3 — PDCA + Requirement Check + Phase E
- **code-review-pattern.md** v1.0 — Phase C BƯỚC 4 audit 12 anti-pattern (SA1-4, SC1-3, DL1-3, SW1-2, BN1)
- **auto-decision-tiers.md** v1.0 — Tier LOW auto, Tier HIGH/LOGIC user duyệt
- **proactive-partner.md** v1.0 — stop có artifact + options + recommend
- **runtime-smoke-test.md** v1.1
- **phase-e-auto.md** v1.0 — Claude in Chrome
- **data-seed-pattern.md** v1.0
- **debug-workflow.md** v1.0

### Critical workflow rules (đã học từ feedback gap session)

1. **LUÔN tạo todo.XXX-*.md file** trong `task/todo/` TRƯỚC khi code. Đừng viết thẳng done.
2. **Phase C BƯỚC 4 — systematic 12-pattern audit** mỗi task, có table trong done doc.
3. **Auto-scan `memory/`** mỗi Requirement Check: `nha_tro_app_requirements.md` + `retrospective-*.md` + relevant `usecase-*.md`.
4. **ACT lesson**: CODE auto-fill, **LOGIC user duyệt** (đừng tự gọi "observation" để skip rule).
5. **Tier HIGH STOP user duyệt**: architectural strategy, schema migration ảnh hưởng data thật, security, user-facing UX flow change.
6. **Verify table**: manual test case table trong done doc (Bước-Thao tác-Expected-Actual).

---

## Git pattern (proven session 2026-05-18)

```bash
# Setup branch
git checkout -b feature/t<XXX>-<short>

# Code + commit
git add -A && git commit -m "$(cat <<'EOF'
done: T-XXX <title>
<body>
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

# FF merge → main worktree → push
git -C "C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce" merge --ff-only feature/t<XXX>-<short>
git -C "C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce" push origin main

# Cleanup local
git checkout --detach <new-HEAD>
git branch -d feature/t<XXX>-<short>
```

---

## Memory files quan trọng (auto-scan target)

`memory/`:
- **nha_tro_app_requirements.md** — yêu cầu tổng (BẮT BUỘC đọc mỗi Requirement Check)
- **t016-decisions.md** — D1-D26 multi-tenant (especially D5 throw pattern lib/db, D10 dual-write rooms.tenant_id legacy)
- **usecase-quan-ly-khach-thue.md** — UC-01 → UC-08 (tenant management)
- **usecase-thu-chi.md** — invoices + payment proofs UC
- **retrospective-2026-05-17-pwa-and-workflow.md** — workflow v3.3 lessons

---

## Work artifacts (per-task, KHÔNG auto-scan)

`work/`:
- **audit-2026-05-17-data-flow.md** — T-024 audit (12 anti-pattern + 3 Bonus)
- **audit-2026-05-18-module6.md** — Module 6 audit (5/5 UC + 3 bonus + 22 API)
- **smoke-tests-runtime-critical.md** — 3 tests S10/S18/S23
- **smoke-tests-2026-05-18-session.md** — full 28 tests
- **t<XXX>-apply-migration-prompt.md** — Claude-for-Google migration prompts (v17/v18/v19/v20/v21 đã apply)
- **t026-apply-migration-prompt.md** — v16 prompt (đã apply)

---

## Established patterns (đã proven session 2026-05-18)

1. **Atomic PG function pattern** (T-026, T-020 transfer_tenant) — wrap multi-write trong plpgsql function với RAISE EXCEPTION tiếng Việt.
2. **Backward compat code-first deploy** — code mới hoạt động ngay cả khi chưa apply migration (T-016b, T-029 audit_logs fail-open, T-019 schema-free).
3. **Claude-for-Google migration prompt** — sentinel `[SQL-XXX-START/END]` blocks tránh markdown nesting. Pattern reusable.
4. **Fail-open security** cho dev/decorative features (T-029 audit, T-031 JWT verify DB cache).
5. **In-process Map cache TTL** (T-031) — đơn giản cho 4-room scale, scale to Redis nếu cần.
6. **Server action FormData upload** (T-033) — Next.js 14 supports File trong FormData, không cần API route riêng.
7. **assert-then-act security helper** (T-034 assertDocumentBelongsToTenant) — verify ownership trước action.
8. **Reuse PG function semantic** (T-019, T-036) — tenant insertion với is_primary logic đã có trong create_tenant_account, UI chỉ cần expose.
9. **Migration numbering** — tiếp v22 cho task tiếp theo có migration.

---

## Worktree topology

```
C:/aloha/nha-tro-app                                            # detached, legacy worktree
C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce  # main branch — dùng cho ff-merge
C:/aloha/nha-tro-app/.claude/worktrees/pedantic-jepsen-90feaa   # session work, detached HEAD
C:/aloha/nha-tro-app/.claude/worktrees/<other>                  # legacy branches
```

Cwd làm việc: `pedantic-jepsen-90feaa` (detached). Tạo branch mới từ HEAD này khi start task.

---

## Đề xuất task pick session sau

Theo priority + scope phù hợp tired-user:

1. **Run smoke tests runtime** (~10-30 phút) — verify 17 tasks merged work end-to-end. Trước khi tích lũy thêm task.
2. **Audit log JWT events** (~1-2h) — extend T-029, security value cao, well-scoped.
3. **Cron job debt warning** (~1-2h) — replace on-page check, scale-up improvement.
4. **Transfer Flow 2** (~2-3h) — close UC-08 fully. Open question: notification type 'transfer_proposal' CHECK constraint cần ALTER không?
5. **CommunityPage refactor** (~2-3h) — split 2147 LOC, maintenance.

---

## Session 2026-05-18 commits (17 + 3 chore)

```
fe624a9 done: T-037 maintenance notification dispatch
505bb6f chore: audit Module 6 + CLAUDE.md status
130c1fd done: T-036 make-primary checkbox AddTenantDialog
36c49ef done: T-035 settings UI debt_warning_threshold_days
9eeb6d0 done: T-034 Module 3 Phase 2 tenant view
3e9585a fix(t033): index name sync
9d72729 done: T-033 Module 3 Giấy tờ Phase 1
5163fe4 done: T-032 make-primary swap
ee1adff done: T-031 JWT verify DB lookup
227209f done: T-020 chuyển phòng nội bộ
051496b done: T-019 thêm khách thứ 2
77f3b89 chore: CLAUDE.md Module 2 → 🟢
9eca031 done: T-017 debt warning system
ee705e0 done: T-016b drop rooms.tenant_id
2bb327b done: T-029 impersonate audit_logs
e6d75ef T-026 Phase E pass verify (chore)
5bf8f8f done: T-026 RPC transactional wrap
c2f5c95 done: T-028 impersonate force_complete
```

---

## Start session mới — gợi ý mở đầu

Khi paste handover này vào session mới, hỏi:
- "Bạn muốn run smoke test trước hay pick task mới?"
- Hoặc "Pick task nào trong backlog?"

Nếu user nói "tiếp tục autonomous":
- Default pick: **Audit log JWT events** hoặc **Cron job debt warning** (medium scope, well-defined, no architectural decision).
- KHÔNG pick Module 4 Camera AI (cần phần cứng + open decision).
- KHÔNG pick Transfer Flow 2 mà không hỏi notification type CHECK constraint trước.
