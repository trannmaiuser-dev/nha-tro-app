# Handover 2026-05-19 EOD → next session

## Project state snapshot

**Main HEAD**: `52e0091` (origin/main synced)
**Worktree**: `C:/aloha/nha-tro-app/.claude/worktrees/vibrant-solomon-4f867c`
**Current branch**: `feature/t017b-drop-users-has-debt` (uncommitted work)
**Dev server**: 🟢 chạy ở `http://localhost:3000` (PID variable, kill via `netstat -ano | grep :3000` + `Stop-Process`)

### Module status (all 100% trừ Camera)

| # | Module | Status |
|---|---|---|
| 1 | Quản lý phòng & khách thuê | 🟢 100% |
| 2 | Thu chi & hóa đơn | 🟢 100% |
| 3 | Giấy tờ | 🟢 100% |
| 4 | Camera AI | ⏸️ DEFER (user skip) |
| 5 | Thông báo nội bộ | 🟢 100% (T-042 contract renewal verified) |
| 6 | Cộng đồng | 🟢 100% (T-043 group chat verified) |
| Dashboard | 🟢 T-038 today-tasks widget |

### Migrations applied (v16 → v23 verified)

| v | Task | Verified |
|---|---|---|
| v22 | T-042 contract renewal + sender_id NULL + type CHECK | ✅ applied via Supabase Studio + smoke pass |
| v23 | T-043 chat groups + messages table create | ✅ applied + smoke pass |
| **v24** | **T-017b drop users.has_debt** | ⏳ **PENDING USER APPLY** |

## 🔴 BLOCKING — User must apply migration v24

Migration v24 SQL: [supabase/migrations-v24.sql](../supabase/migrations-v24.sql)

Paste vào Supabase Studio SQL Editor:

```sql
[SQL-V24-START]
ALTER TABLE users DROP COLUMN IF EXISTS has_debt;
[SQL-V24-END]
```

Verify (expect 0 rows):
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='users' AND column_name='has_debt';
```

⚠️ **Without apply**, code on `feature/t017b-drop-users-has-debt` branch will run OK (selects no longer reference has_debt) but the column lingers in DB. Low risk — just clean-up debt.

## ⏳ Pending work — IN PROGRESS this session

### 1. T-017b drop users.has_debt — uncommitted

Files modified, not yet committed:
- `components/ProfileSelfPage.tsx` — fix Settings link bug (separate from T-017b but bundled)
- `components/tenants/TenantCard.tsx` — removed `tenant.has_debt` "Đang nợ tiền" badge
- `lib/db/tenants.ts` — removed `has_debt: boolean` from TenantRow type + 4 select queries
- `supabase/migrations-v24.sql` — new migration file (untracked)

**Action**: Wait for user to apply migration v24, then commit + merge.

Suggested commit message:
```
done: T-017b drop legacy users.has_debt column + fix Settings link bug

Migration v24 (PENDING APPLY): ALTER TABLE users DROP COLUMN IF EXISTS has_debt.

Code cleanup:
- lib/db/tenants.ts — drop has_debt từ TenantRow type + 4 select queries
- components/tenants/TenantCard.tsx — remove "Đang nợ tiền" badge (cảnh báo
  theo phòng đã có DebtBanner, không cần dual UI)

Bonus fix (ProfileSelfPage.tsx): Owner "Cài đặt" button link sai về /home,
chuyển sang /admin/settings. Thêm 3 link mới: Hóa đơn, Báo cáo thu chi,
Chỉ số điện nước. Quản lý phòng giờ link sang /rooms (was /dashboard).

Hồ sơ khách giờ link sang /admin/tenants (was /dashboard).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 2. NEW features user requested (chưa start)

User feedback session 2026-05-19:
> "tôi muốn chủ có thể thay đổi thông tin cá nhân, giấy tờ của bản thân, khách
> chủ cũng có thể xóa, disable, reactive account của khách"

#### Feature A: Owner edit own profile + documents

**Why**: hiện ProfileSelfPage cho owner chỉ là view-only. Owner cũng có profile (tenant_profiles row) như khách nhưng không có edit flow.

**Scope**:
- Check if `tenant_profiles` row tồn tại cho owner — likely không có (chỉ tenant role tạo qua flow UC-01)
- Decision: owner có cần profile như tenant không? Or simpler "owner info" với fields ít hơn?
- Owner upload giấy tờ tương tự (CCCD, etc.)
- Reuse Module 3 documents schema? Documents.tenant_id NULLABLE đã có → owner = building-wide docs

**Open decisions**:
- Owner data model: dùng tenant_profiles hay tạo bảng riêng `owner_profile`?
- Schema for owner avatar / CCCD: chỉnh `users.role='owner'` thêm trường, hoặc dùng tenant_profiles cho owner luôn (đơn giản)
- Documents: owner upload qua /admin/documents existing flow (Phase 1) hay có tab riêng?

#### Feature B: Owner edit TENANT profile + documents

**Why**: Hiện owner view tenant tại `/profile/[userId]` (TenantSummaryPage) chỉ READ-ONLY. Cần edit khi khách bận / không tự update.

**Scope**:
- Convert /profile/[userId] thành editable cho role=owner
- Hoặc tạo route mới `/admin/tenants/[userId]/edit`
- Reuse profile/setup wizard? Hay form đơn giản inline?
- Sync với tenant: nếu owner sửa, tenant có thông báo không?

#### Feature C: Owner manage tenant account (delete / disable / reactivate)

**Why**: tenant status hiện có `invited / active / pending_move / moved_out / archived`. User muốn thêm direct controls cho owner.

**Scope**:
- **Disable**: tạm khóa account (vd: nợ quá lâu, vi phạm) — schema cần thêm `tenant_status='disabled'` hoặc `users.locked_at TIMESTAMPTZ`
- **Reactivate**: ngược lại disable
- **Delete**: hard delete? Hay soft delete = `tenant_status='archived'`?

**Open decisions**:
- "Disable" semantically khác "moved_out" thế nào?
- "Delete" — hard delete data hay archive (giữ history 2 năm theo UC-07)?
- UI: nút trong TenantCard? Modal confirm?

### 3. Recommended approach for next session

**Step 1**: User apply migration v24 → commit T-017b + Settings fix.

**Step 2**: Tier HIGH STOP — ask user to clarify 3 features scope:
- AskUserQuestion: 3 questions about owner profile model + tenant edit flow + disable vs delete semantics
- Then design schema migration v25 + plan tasks T-045 / T-046 / T-047

**Step 3**: Implement features incrementally (1 task/branch/migration).

## Git workflow (proven pattern)

```bash
# Clean state at handover
git checkout --detach
git branch -D feature/t017b-drop-users-has-debt  # only after commit + merge

# Start new task
git checkout -b feature/t<XXX>-<short>
# ... code ...
git add -A && git commit -m "..."
git -C "C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce" merge --ff-only $(git rev-parse HEAD)
git -C "C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce" push origin main
```

## Critical workflow rules (đã proven sessions)

1. **LUÔN tạo todo.XXX-*.md** trong `task/todo/` TRƯỚC khi code.
2. **Phase C BƯỚC 4 — 12-pattern audit** mỗi task non-trivial.
3. **Auto-scan `memory/`** mỗi Requirement Check.
4. **CODE auto-fill, LOGIC user duyệt** (auto-decision-tiers.md).
5. **Tier HIGH STOP**: schema migration data thật, security, user-facing UX flow change.
6. **Verify table** trong done doc (Bước - Thao tác - Expected - Actual).

## Skills/memory files quan trọng (auto-scan target)

`memory/`:
- `nha_tro_app_requirements.md` — yêu cầu tổng
- `usecase-quan-ly-khach-thue.md` — UC-01 → UC-08 (UC-07 archive 2y note!)
- `usecase-thu-chi.md` — UC-08 → UC-14
- `retrospective-2026-05-18-stale-dev-server.md` — verify dev server cwd
- `t016-decisions.md` — D1-D26 multi-tenant
- `MEMORY.md` — index pointer

`.claudes/skills/`:
- `todo-workflow.md` v3.3
- `code-review-pattern.md` v1.0 (12 anti-patterns)
- `auto-decision-tiers.md` v1.0
- `proactive-partner.md` v1.0
- `runtime-smoke-test.md` v1.1
- `phase-e-auto.md` v1.0
- `data-seed-pattern.md` v1.0
- `debug-workflow.md` v1.0

## Migration apply pattern (proven)

**Option A — Supabase Studio UI** (current pattern, used for v22, v23, v24):
- Paste `[SQL-XXX-START]...[SQL-XXX-END]` block(s) via Supabase Studio SQL Editor

**Option B — Personal Access Token + Management API** (user proposed but not adopted):
- Generate PAT at https://supabase.com/dashboard/account/tokens
- Add to `.env.local` as `SUPABASE_ACCESS_TOKEN`
- POST to `https://api.supabase.com/v1/projects/wmohsqktezqbssilrats/database/query`

**Option C — Chrome DevTools MCP drive Studio**:
- Required user login to MCP browser (Google blocks bot detection)
- Workaround attempts: GitHub OAuth, copy session cookie
- Not adopted in session

## Test data + smoke helpers

`scripts/smoke-helper.mjs` — Node helper, commands: `inspect / s10Setup / s10Cleanup / s18Precheck / s18Verify / s18Cleanup / s23Precheck / s23Verify`

Owner: `Minh Anh` user_id `00000000-0000-0000-0000-000000000001` phone `0901000001`
Tenant active: `test1` user_id `c2bfdb18-6df2-4af2-9828-2d1501a540ab` phone `0915817655` ở P101 (primary)

Impersonate URL:
```
http://localhost:3000/api/dev/impersonate?token=<DEV_TOKEN>&user_id=<UUID>[&force_complete=true]
```

`DEV_IMPERSONATE_TOKEN` trong `.env.local`.

## Worktree topology

```
C:/aloha/nha-tro-app                                            # legacy, detached 1b1ba12
C:/aloha/nha-tro-app/.claude/worktrees/peaceful-solomon-78a9ce  # main branch — ff-merge target
C:/aloha/nha-tro-app/.claude/worktrees/vibrant-solomon-4f867c   # CURRENT session work
+ C:/aloha/nha-tro-app/.claude/worktrees/romantic-gates-339691  # phantom (file lock từ trước, harmless)
```

Cwd làm việc: `vibrant-solomon-4f867c`.

## Commits session 2026-05-19

```
52e0091 chore: rename todo.044 → done.044
c23d607 done: T-044 UI mobile responsive audit + fix 2 critical pages
9068700 chore: T-043 fix migration v23 — CREATE TABLE IF NOT EXISTS messages
a06e46f chore: T-040 ops handover doc cho batch T-038 → T-043
40fadac done: T-043 chat nhóm multi-group
3430746 done: T-042 contract renewal reminder
190210e done: T-039 meter reading reminder on-page check
d37da1a done: T-038 dashboard 'Việc cần làm hôm nay' widget
6f4edc3 chore: smoke helper script + retrospective memory dev server stale
```

(Plus chore: cleanup 8 stale CCD worktrees + 7 branches earlier in session.)

## Start session sau — gợi ý mở đầu

1. **Read** [work/handover-2026-05-19-end.md](handover-2026-05-19-end.md) (file này)
2. **Check** migration v24 đã apply chưa qua probe:
   ```bash
   node -e "
   import('@supabase/supabase-js').then(async({createClient})=>{
     const fs=await import('fs')
     const env=Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}))
     const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
     const r=await sb.from('users').select('has_debt').limit(1)
     console.log('users.has_debt:', r.error?.message?.includes('does not exist') ? 'DROPPED ✅' : 'still exists ❌')
   })"
   ```
3. **If applied** → commit T-017b + merge (suggested message above)
4. **Then ask user** về 3 features owner-edit-profile + tenant-edit + manage-account (Tier HIGH decisions trước khi code)
