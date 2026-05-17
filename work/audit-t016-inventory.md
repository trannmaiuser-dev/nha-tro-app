# Audit T-016 family — Inventory (2026-05-17)

Branch hiện tại: `feature/t021-fix-onboarding-ui` (cùng commit với `main`: 3b55789).

---

## 1. Task files

| File | Folder | Trạng thái header | Ngày done | Commit |
|---|---|---|---|---|
| `done.016-multi-tenant.md` | done/ | 🟢 Done | 2026-05-16 | 189ba87 |
| `done.016c-fix-api-routes-and-login-link.md` | done/ | 🟢 Done | 2026-05-16 | ee2e516 |
| `done.016d-fix-dashboard-and-modal.md` | done/ | 🟢 Done | 2026-05-16 | 66e93fd |
| `todo.016b-drop-tenant-id-column.md` | todo/ | 🔲 Todo | — | — (deferred, chờ T-016 stable 1-2 tuần) |
| ⚠ `todo.016c-fix-api-routes-and-login-link.md` | todo/ | 🔴 Đang làm | — | — (DUPLICATE — stale pre-work) |

## 2. Commits T-016 trên main

```
3b55789 feat(skills): bổ sung debug-workflow + runtime-smoke-test v1.0
66e93fd fix(ui): T-016d — dashboard multi-tenant render + modal refresh timing
ee2e516 fix(api): T-016c — xóa legacy /api/owner/create-tenant
189ba87 feat(ui): T-016 Phase C+D — multi-tenant UI + verify + done
0e5d9bb feat(db): T-016 Phase B — room-tenants data layer
7c8cd7b feat(schema): T-016 Phase A — room_tenants table + skeleton
4b4fe7f chore(task): add T-016 todo
```

Mapping commit ↔ task: tất cả ✓ có file done tương ứng.

## 3. Memory files

- `t016-decisions.md` — D1-D26 (cover toàn bộ T-016 + 16c + 16d)
- `t016-progress.md` — T-016 main, ghi `[✅] Test cases: 7 ✅ + 1 ⏭️ (12.5% skip)` ✓
- `t016c-progress.md` — T-016c, cuối có `[⬜] Commit + push` (đang dở khi viết, đã commit ee2e516)
- `t016d-progress.md` — T-016d, cuối có `[⬜] Commit + push` (đã commit 66e93fd)
- (KHÔNG có `debug-2026-05-16-t016d-*.md` — đã gộp vào pattern `t016d-progress.md`)

---

## 4. Workflow compliance check

### done.016-multi-tenant.md (v3.0 era)
| Phase | Status | Note |
|---|---|---|
| A PLAN | ✓ | scope chi tiết, deliverables liệt kê |
| B DO | ✓ | Phase A + B notes đầy đủ (D1-D13) |
| C CHECK | ⚠ | 7 checkboxes vẫn ⬜ trong file (không tick) |
| D VERIFY | ⚠⚠ | 8 test case tables tất cả cell `Kết quả` để ⬜ — vi phạm v3.0 rule "không được ⬜". Nhưng DO note dòng 152 ghi `[✅] Verify tĩnh — 7 ✅ + 1 ⏭️` → mâu thuẫn với bảng |
| E SMOKE | N/A | Trước v3.1 — đúng spec migration |
| ACT | ✓ | 3 bài học cụ thể |
| Cross-ref | ✓ | t016-decisions.md D1-D18 |

**Vấn đề:** Test case bảng trống ⬜ (chỉ summary outside table). Duplicate "Cải tiến cho task sau" + "Task phát sinh" sections (line 367-369 vs 375-381). Không retroactive fix.

### done.016c-fix-api-routes-and-login-link.md
| Phase | Status | Note |
|---|---|---|
| A PLAN | ✓ | bối cảnh + root cause + scope rõ |
| B DO | ✓ | audit + đã làm liệt kê file:line |
| C CHECK | ⚠ | 3 checkboxes ⬜ |
| D VERIFY | ⚠ | 6 TC chỉ có `Mô tả`+`Kỳ vọng`, không có cột Status — không có markers ✅/❌/⏭️ |
| E SMOKE | N/A | Commit ee2e516 trước skill v3.1 commit 3b55789 — đúng spec migration |
| ACT | ✓ | 3 bài học |
| Cross-ref | ✓ | t016c-progress.md, decisions D19-D23 |

**Vấn đề:** Test cases không có markers. Phase E N/A (theo timing commit) nhưng theo SPIRIT của v3.1 (task hậu tố sau bug runtime), nên có Phase E.

### done.016d-fix-dashboard-and-modal.md
| Phase | Status | Note |
|---|---|---|
| A PLAN | ✓ | 3 bug A/B/C mô tả rõ |
| B DO | ✓ | ghi chú per-bug chi tiết |
| C CHECK | ⚠ | 2 checkboxes ⬜ |
| D VERIFY | ⚠ | 4 TC chỉ có `Mô tả`+`Kỳ vọng`, không có cột Status |
| E SMOKE | ❌ MISSING | Commit 66e93fd trước skill commit 3b55789 → theo timing là N/A. Nhưng T-016d là bug runtime sau T-016c → đúng pattern v3.1 "task hậu tố → Phase E". Đây là task ĐẦU TIÊN nên có Phase E nhưng skip |
| ACT | ✓ | 3 bài học (incl. pattern `router.refresh()` deferred) |
| Cross-ref | ✓ | t016d-progress.md, decisions D24-D26 |

**Vấn đề:** Phase E nên có per spirit v3.1. Test cases không có markers.

### todo.016b-drop-tenant-id-column.md
| Phase | Status | Note |
|---|---|---|
| A PLAN | ✓ | scope + dependencies rõ |
| B DO | ✓ | 8 checkbox ⬜ (chưa khởi động — đúng) |
| C/D/E/ACT | — | Chưa làm — đúng |

**Vấn đề:** None. Lưu ý: khi khởi động sẽ áp dụng v3.1 → bắt buộc Phase E (có migration script + tắt dual-write, đụng schema + UI fallback).

### ⚠ todo.016c-fix-api-routes-and-login-link.md (DUPLICATE)
- Status header: 🔴 Đang làm (stale — đã done)
- Content: 132 lines, pre-work với placeholder `(Claude Code fill in autonomous mode)` cho DO notes và `(Claude Code fill cuối session)` cho ACT
- done counterpart: 122 lines với DO notes + ACT đầy đủ
- File này LÀ pre-work draft, KHÔNG được rename khi user commit ee2e516 + tạo done version mới
- KHÔNG `git mv` được (done đã tồn tại) → cần user duyệt **xóa**

---

## 5. Skill / CLAUDE.md compliance

| File | Trên main | Kỳ vọng v3.1 | Status |
|---|---|---|---|
| `.claudes/skills/todo-workflow.md` | **v3.0** (line 374) | v3.1 (Phase E + 2 rule mới) | ⚠⚠ CHƯA BUMP |
| `.claudes/skills/debug-workflow.md` | v1.0 ✓ (line 1) | v1.0 | ✓ |
| `.claudes/skills/runtime-smoke-test.md` | v1.0 ✓ (line 1) | v1.0 | ✓ |
| `.claudes/CLAUDE.md` | **v1.2** (line 248) | v1.3 (reference 2 skill mới + 8 bước) | ⚠ CHƯA BUMP |

**Phát hiện:** Commit 3b55789 đã thêm 2 file skill v1.0 NHƯNG KHÔNG bump todo-workflow.md từ v3.0 → v3.1 và KHÔNG bump CLAUDE.md từ v1.2 → v1.3 trên main. Worktree silly-heisenberg-d4eeae (commit 3c7ef20) đã làm đủ nhưng KHÔNG được merge về main → công việc workflow v3.1 setup INCOMPLETE trên main.

Hệ quả: todo-workflow.md không có Phase E section (Hành vi 4b), không có 2 rule v3.1, KẾT LUẬN A không có điều kiện "Phase E pass".

## 6. CLAUDE.md "6 Module trạng thái"

| Module | Trạng thái trên main | OK? |
|---|---|---|
| 1 Quản lý phòng & khách | 🟢 Done (T-001→T-010 + T-016/c/d hotfix), T-016b pending | ✓ |
| 2 Thu chi | 🟡 chờ T-017 | ✓ |
| 3-6 | (chưa check) | — |

## 7. Task phát sinh / next

- ✓ T-016b — deferred (trong todo/)
- ✓ T-017 — todo created (`Áp dụng Phase E: ✅ Yes`)
- ✓ T-019 (UC-02b) — todo created (`Áp dụng Phase E: ✅ Yes`)
- ✓ T-020 (UC-08) — todo created (`Áp dụng Phase E: ✅ Yes`)
- ✓ T-021 (fix onboarding + cache) — todo created, đang làm (branch hiện tại)
- ✓ UC-02b + UC-08 đã có trong `memory/usecase-quan-ly-khach-thue.md`

---

## 8. Vấn đề tổng kết

### 🔴 Cần user quyết định
1. **DUPLICATE file** `task/todo/todo.016c-fix-api-routes-and-login-link.md` (stale pre-work) — cần xóa. KHÔNG auto-xóa theo HARD STOP rule.
2. **Workflow v3.1 incomplete trên main**:
   - `.claudes/skills/todo-workflow.md` vẫn v3.0 (thiếu Phase E section + 2 rule mới)
   - `.claudes/CLAUDE.md` vẫn v1.2 (thiếu reference 2 skill mới + 8-bước flow)
   - Cần cherry-pick / re-apply changes từ silly-heisenberg-d4eeae (commit 3c7ef20) hoặc redo manually

### 🟡 Note (KHÔNG retroactive)
3. Test case tables trong 3 file done (016, 016c, 016d) thiếu markers ✅/❌/⏭️ — vi phạm rule v3.0 nhưng task đã done; flag để task sau (T-017+) không lặp lại.
4. T-016d theo spirit v3.1 nên có Phase E section trong file done — but commit 66e93fd trước skill commit 3b55789 → theo timing là N/A. Đề xuất: T-016d ACT đã ghi đầy đủ bài học → KHÔNG cần backfill.

### 🟢 OK
5. Cross-ref task ↔ memory ↔ commits đều khớp.
6. New todos T-017/019/020/021 đều có `Áp dụng Phase E: ✅ Yes` → đã theo v3.1.
7. CLAUDE.md Module 1 status đã update đúng.

---

## 9. Hành động đề xuất

1. **User xóa** `task/todo/todo.016c-fix-api-routes-and-login-link.md` (đã có done version).
2. **User cherry-pick** commit 3c7ef20 từ silly-heisenberg-d4eeae để bump todo-workflow.md v3.0→v3.1 và CLAUDE.md v1.2→v1.3. Hoặc redo manually theo spec `todo-workflow-v3.1-update.md`.
3. (Optional) **User backfill** Phase E section vào done.016d nếu muốn document pattern cho future reference.
4. Sau khi cleanup → audit lại trước T-021 commit để chắc workflow consistent.
