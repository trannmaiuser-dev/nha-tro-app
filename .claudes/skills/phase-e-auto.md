# Skill: Phase E Auto Test (v1.0)

> Phase E chạy autonomous qua Claude in Chrome thay vì user test tay.
> Áp dụng khi todo metadata declare `Phase E mode: auto`.

---

## Khi nào áp dụng

Phase E auto KHI todo metadata có:

```markdown
## Phase E mode: auto
```

Phase E manual (default) KHI:

```markdown
## Phase E mode: manual
```

Phase E hybrid (setup auto, execute manual) KHI:

```markdown
## Phase E mode: hybrid
```

Tasks chọn `manual` thường vì:
- Test visual design / responsive breakpoints (cần human eye)
- Test camera/AI module (cần thiết bị thật)
- Test workflow nhạy cảm không nên auto (vd payment hợp đồng pháp lý)

Tasks chọn `hybrid` thường vì:
- UX flow cần human judgement, nhưng data setup phức tạp (auto seed/verify)
- Animation/transition cần feel (manual execute), data check (auto verify)

Tasks chọn `auto` cho hầu hết task có UI change + data flow rõ ràng + reproducible.

---

## Tech stack Phase E auto

| Layer | Tool | Mục đích |
|---|---|---|
| Login | `/api/dev/impersonate` (T-022) | Bypass password cho admin/tenant |
| Seed/Verify SQL | Supabase Studio Web UI | Paste Monaco editor + Ctrl+Enter |
| Execute UI | localhost:3000 qua Claude in Chrome | Navigate, fill form, click |
| Cookie | Auto-set qua endpoint impersonate | Session persistent trong Chrome |

Yêu cầu user trước khi chạy:
1. Đã login Supabase Studio (cookie persistent).
2. Có `DEV_IMPERSONATE_TOKEN` trong `.env.local`.
3. Dev server `npm run dev` đang chạy ở localhost:3000.
4. Đã cài Claude in Chrome extension và authorize.

---

## 4 sub-phase trong 1 chat Claude in Chrome

```
E-setup       → seed SQL vào Supabase Studio
E-impersonate → navigate /api/dev/impersonate, cookie set
E-execute     → test UI flow ở localhost:3000
E-verify      → SQL post-test vào Supabase Studio, compare expected
```

1 chat duy nhất lo cả 4, không tách instance.

---

## Format prompt cho Claude in Chrome

User paste vào sidebar Claude in Chrome:

```markdown
# Phase E auto T-XXX

## Context
- Task: T-XXX (link `task/todo/todo.XXX-*.md`)
- Branch: feature/tXXX-...
- localhost: http://localhost:3000
- Supabase Studio: https://supabase.com/dashboard/project/<id>/sql/new

## Test variables (user fill)
- DEV_IMPERSONATE_TOKEN: <paste>
- OWNER_UUID: <paste>
- TENANT_UUID: <paste>
- <other vars task-specific>

## E-setup (seed)
1. Mở tab Supabase Studio SQL Editor URL trên.
2. Clear editor.
3. Paste nội dung `task/<task-id>/seed.sql` (file đã có trong repo). Replace placeholders {{OWNER_UUID}}, etc bằng giá trị thực ở trên.
4. Ctrl+Enter chạy.
5. Verify Results panel báo Success / số rows inserted match expected.

## E-impersonate
6. Mở tab mới: `http://localhost:3000/api/dev/impersonate?token=<TOKEN>&user_id=<TARGET_UUID>`
7. Verify redirect đúng (admin → /dashboard, tenant → /tenant/home hoặc /profile/setup tùy state).
8. Cookie auth-token set OK.

## E-execute
9. <bước UI cụ thể của task>
   ví dụ: Onboarding wizard điền 8 required, bỏ trống 3 optional, click "Hoàn thành đăng ký".
10. Đọc DOM verify UI assertion.
11. Screenshot evidence.

## E-verify
12. Quay lại Supabase Studio.
13. Clear editor.
14. Paste nội dung `task/<task-id>/verify.sql`.
15. Ctrl+Enter chạy.
16. Đọc Results panel.
17. Compare với expected trong todo.

## E-cleanup (optional)
18. Nếu task có data seed cần cleanup (vd tenant test), paste `task/<task-id>/cleanup.sql` (nếu có) và chạy.

## Report
Output cho user:
- E-setup: PASS/FAIL + lý do
- E-impersonate: PASS/FAIL + cookie evidence
- E-execute: PASS/FAIL + screenshot + DOM assertion
- E-verify: PASS/FAIL + actual data vs expected
- Issues phát hiện ngoài scope
```

---

## Phase E format trong todo (cho mode=auto)

Thay section "Phase E — Runtime Smoke Test" bằng:

```markdown
## Phase E — Runtime Smoke Test (mode: auto)

### Files cần có
- `task/<task-id>/seed.sql` — seed data trước test (với placeholder UUID)
- `task/<task-id>/verify.sql` — query verify post-test
- `task/<task-id>/cleanup.sql` (optional) — cleanup data sau test

### Test scenarios

| # | Scenario | UI steps (E-execute) | Expected (E-verify) |
|---|---|---|---|
| E1 | <happy path> | <bước UI> | <SQL row expected> |
| E2 | <edge case> | <bước UI> | <SQL row expected> |
| E3 | <re-verify task cũ> | <bước UI> | <SQL row expected> |

### Variables để Claude in Chrome thay
- {{OWNER_UUID}}: <SQL lấy ID>
- {{TENANT_UUID}}: <SQL lấy ID>
- {{TEST_PHONE}}: 0911999XXX (unique mỗi task)

### Pass criteria

- [ ] E1 SQL verify match expected
- [ ] E2 SQL verify match expected
- [ ] E3 SQL verify match expected
- [ ] Không phát hiện regression task cũ
```

---

## Workflow integration với debug-workflow

Khi Phase E auto FAIL:
1. Claude in Chrome chat KHÔNG tự fix code (không có access codebase).
2. User mở Claude Code, dùng skill `debug-workflow.md`.
3. Cung cấp 4 input bổ sung: triệu chứng auto fail + DOM assertion fail + SQL evidence + scope.
4. Claude Code tự debug → fix → commit → push.
5. Quay lại Claude in Chrome, paste lại prompt Phase E để re-test.

Loop tới khi smoke test pass → ACT + rename.

---

## STOP-AND-LOG triggers (cho Claude in Chrome)

- Element không tìm thấy → re-locate bằng accessibility tree, không retry coordinate.
- SQL Editor không load (banner che, modal popup) → screenshot + báo user, KHÔNG paste blind.
- Cookie không set sau impersonate → check console error, báo user.

## HARD STOP triggers

- Supabase Studio yêu cầu re-login → DỪNG, báo user login.
- localhost:3000 không response (dev server down) → DỪNG.
- Endpoint /api/dev/impersonate trả 404 (token chưa set hoặc prod build) → DỪNG.

---

## Lưu ý cho Claude Code khi viết todo có mode=auto

**1. Bắt buộc tạo trước:**
- `task/<task-id>/seed.sql`
- `task/<task-id>/verify.sql`
- (Optional) `task/<task-id>/cleanup.sql`

**2. SQL phải dùng placeholder:**
- `{{OWNER_UUID}}` thay vì UUID thực
- `{{TEST_PHONE}}` thay vì số điện thoại thực
- Documented danh sách placeholder trong todo

**3. SQL phải idempotent:**
- Seed: `INSERT ... ON CONFLICT DO NOTHING` hoặc `INSERT ... WHERE NOT EXISTS`
- Cleanup: `DELETE WHERE phone LIKE '0911999%'` (theo convention test data)

**4. Verify SQL phải trả về row đủ context:**
- Không chỉ COUNT, return đủ field để compare (id, name, status, flags...)

**5. Cover dual-write nếu có:**
- T-016 có rooms.tenant_id + room_tenants → verify cả 2 nguồn

---

## Note pilot test 2026-05-17

Pilot confirm Claude in Chrome work với Supabase Studio:
- Session persistent (không phải re-login)
- Monaco editor accept input bằng Ctrl+A + Delete + type
- Execute query bằng Ctrl+Enter nhanh hơn click Run
- Results panel đọc DOM table được

Gotchas observed:
- Notification banner "Terms of Service" có thể che — skill nên check + dismiss nếu có
- Cần click vào editor trước Ctrl+A để focus

---

*Skill version: 1.0 · Cập nhật: 2026-05-17*
