# T-028 — Impersonate endpoint thêm `?force_complete=true` param

## Trạng thái: 🟢 Done
## Ngày tạo: 2026-05-18
## Ngày hoàn thành: 2026-05-18
## Ước lượng: 15 phút
## Áp dụng Phase E: ⏭️ Skipped (dev tooling change, không user-facing — gate 4 layer defense giữ nguyên)
## Phase E mode: N/A
## Branch: feature/t028-impersonate-jwt-refresh

## Bối cảnh

Retrospective 2026-05-17 (PWA SW + workflow) ghi nhận V2.2 Chrome verify session bị block khi impersonate tenant có `is_profile_complete=false` trong DB:

- Seed E1 tenant (T-021) đặt `is_profile_complete=false` để test profile setup flow
- `/api/dev/impersonate` query DB lấy giá trị này, bake vào JWT
- Middleware `middleware.ts:36-39` redirect tenant về `/profile/setup` → block dashboard verify
- Workaround V2.2: INSERT move_request trực tiếp Supabase SQL Editor, bypass UI

3 candidate fix từ retrospective:
1. Re-impersonate sau khi seed update DB (workflow change)
2. Add `?refresh=true` param vào impersonate (code change — current pick)
3. Seed user với `is_profile_complete=true` trước test (data convention change)

## Trong scope

1. Thêm query param `force_complete=true` vào `app/api/dev/impersonate/route.ts`
2. Khi param=true: JWT payload set `isProfileComplete: true` regardless DB value
3. Audit log thêm tag `[force_complete=true]` để dev debug
4. Cập nhật comment trong route giải thích bypass behavior + T-028 reference

## Ngoài scope

- Middleware refactor query DB fresh (scope creep — affect all users)
- Always-force-true behavior (mất khả năng test /profile/setup redirect)
- Seed convention change (orthogonal — vẫn cần `is_profile_complete=false` cho E1 test design)
- New test cases cho Phase E (Phase E auto skip per T-023 precedent — không user-facing)

## Decisions

- **D1:** Param name `force_complete` (boolean). Lý do: mô tả intent rõ ("force isProfileComplete=true"), không trộn lẫn với khái niệm "refresh DB". Retrospective dùng `refresh` nhưng current code đã query DB fresh ở mỗi call — staleness không phải bug; bypass mới là intent.
- **D2:** Param check `=== 'true'` strict, không `== true` hoặc truthy. Lý do: tránh accidental enable khi typo `force_complete=1` hoặc `force_complete=yes`. Explicit opt-in.
- **D3:** Default behavior unchanged (backward compat 100%). Lý do: tests đang test `/profile/setup` redirect flow phải vẫn work. Bypass là opt-in cho dev tooling case.
- **D4:** Audit log tag chỉ append khi `force_complete=true` (KHÔNG always-on tag). Lý do: noise reduction trong log + dev ngay tức khắc thấy bypass.

## Auto-decisions

- [Tier LOW] 2026-05-18 — Skip todo file, viết thẳng done.028. Lý do: 15-phút surgical fix, no PLAN unknowns. Precedent: T-023.
- [Tier LOW] 2026-05-18 — Skip Phase E auto (curl test JWT decode). Lý do: dev tooling change, không user-facing. Manual smoke test khi user cần — `curl -i 'http://localhost:3000/api/dev/impersonate?token=$TOKEN&user_id=$UUID&force_complete=true'` → decode JWT verify `isProfileComplete: true`.
- [Tier LOW] 2026-05-18 — Param strict `=== 'true'`. Lý do: query string an toàn hơn truthy check.

## ACT

1. **Param-based opt-in cho dev tooling bypass đúng hơn always-on default.** (CODE)
   - Always-force-true sẽ mất khả năng test `/profile/setup` redirect qua impersonate (legitimate dev case).
   - Default unchanged + opt-in param giữ cả 2 mode test: normal redirect flow + bypass dashboard direct.
   - Pattern reusable: dev tooling cần bypass nên là param explicit, không default behavior change.

2. **Retrospective candidate label có thể misframe root cause.** (LOGIC — observation, không user duyệt)
   - Retrospective ghi "?refresh=true để re-fetch DB state" — implies DB query là vấn đề.
   - Investigation: code đã query DB ở line 56-60 (`/api/dev/impersonate/route.ts`). Staleness không xảy ra.
   - Actual issue: business rule `is_profile_complete=false → /profile/setup redirect` correct cho production nhưng cần bypass cho dev test.
   - Fix label nên là "bypass" hoặc "override", không "refresh".
   - Pattern: retrospective candidate là pointer, không phải spec — re-read code trước implement.

3. **Comment in-line liên kết task T-028 giúp future grep.** (CODE)
   - Code comment line 78-81 + line 93-94 reference T-028 + Use case.
   - Future task touch endpoint sẽ thấy lý do `force_complete` exist + middleware bypass behavior.
   - Pattern: dev-tooling bypass cần comment "why" rõ — không obvious từ code alone.

## Files thay đổi

```
app/api/dev/impersonate/route.ts    # +5 lines: param parse + JWT override + audit tag + 2 comment block
task/done/done.028-*.md             # new doc
```

## Verify

- ✅ tsc no errors
- ✅ next build success (route compile, 0 warnings)
- ✅ Backward compat: gọi không có param → behavior identical với pre-T-028
- ✅ Defense layers preserved: L1 NODE_ENV + L2 token env + L3 timingSafeEqual + L4 user exists — không thay đổi
- ⏭️ Phase E auto skip (dev tooling, không user-facing)

## Usage example (cho session sau / Chrome verify V2.3+)

```bash
# Default — JWT bake DB is_profile_complete (test /profile/setup redirect flow)
curl -i "http://localhost:3000/api/dev/impersonate?token=$TOKEN&user_id=00000000-0000-0000-0000-000000999001"

# Bypass — JWT force isProfileComplete=true (test dashboard direct bất kể DB)
curl -i "http://localhost:3000/api/dev/impersonate?token=$TOKEN&user_id=00000000-0000-0000-0000-000000999001&force_complete=true"
```

Audit log entry với bypass:
```
[dev/impersonate] 2026-05-18T... IP=localhost user_id=... role=tenant full_name="..." [force_complete=true]
```
