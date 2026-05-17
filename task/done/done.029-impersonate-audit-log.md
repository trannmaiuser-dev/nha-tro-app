# T-029 — Persistent audit log cho /api/dev/impersonate (T-024 Bonus #3)

## Trạng thái: 🟢 Done (chờ user apply migration v17)
## Ngày tạo: 2026-05-18
## Ngày hoàn thành: 2026-05-18
## Ước lượng: 45 phút
## Áp dụng Phase E: 🟡 Manual (user apply migration v17 + verify insert)
## Phase E mode: manual
## Branch: feature/t029-impersonate-audit-log

## Bối cảnh

T-024 audit Bonus #3 ([work/audit-2026-05-17-data-flow.md:298-304](work/audit-2026-05-17-data-flow.md:298)) flag: `/api/dev/impersonate` chỉ console.log audit event — volatile, mất sau server restart. Nếu `DEV_IMPERSONATE_TOKEN` leak, không có evidence persistent.

T-022 đã có console.log audit (line 67-72) — cải tiến T-029 là dual-write thêm vào bảng `audit_logs` generic.

## Trong scope

1. **`supabase/migrations-v17.sql`** — bảng `audit_logs` generic:
   - `id` UUID PK
   - `event_type` TEXT NOT NULL (namespaced: `dev_impersonate`, `auth_login`, ...)
   - `actor_user_id` UUID nullable (NULL cho dev endpoint, system event)
   - `target_user_id` UUID nullable (ai bị tác động)
   - `ip` TEXT
   - `metadata` JSONB DEFAULT '{}'
   - `created_at` TIMESTAMPTZ DEFAULT NOW
   - 3 index: created_at DESC, event_type+created_at, target_user_id+created_at
   - DISABLE RLS (consistent codebase pattern)

2. **`app/api/dev/impersonate/route.ts`** — sau console.log, INSERT INTO audit_logs:
   - `event_type='dev_impersonate'`
   - `target_user_id=user.id`
   - `metadata={role, full_name, force_complete}`
   - **Fail-open**: nếu insert lỗi → console.error rồi continue (không block dev workflow)

## Ngoài scope

- Audit log UI (SELECT trong Supabase Studio đủ cho dev tool monitoring)
- Audit cho endpoint khác (login, logout, JWT verify, ...) — defer task khác khi cần
- Retention policy / log rotation — defer (4 phòng scale, log nhỏ)
- Replay/forensics tooling — defer
- Production audit (endpoint dev-only, L1 strip prod, không có production audit cần thiết)

## Decisions

- **D1:** Bảng `audit_logs` generic thay vì `dev_impersonate_logs` narrow. Lý do: reusable cho event type tương lai (login, logout, password reset, ...). `event_type` discriminator pattern phổ biến.
- **D2:** 2 cột `actor_user_id` + `target_user_id` (không phải 1 `user_id`). Lý do: nhiều event có cả 2 (vd owner approve tenant move → owner=actor, tenant=target). Dev impersonate có target nhưng không có actor (dev access không phải logged-in user).
- **D3:** ON DELETE SET NULL cho cả 2 FK. Lý do: xóa user không xóa audit history. Pattern match `meter_reading_logs.changed_by`.
- **D4:** `metadata` JSONB NOT NULL DEFAULT `'{}'`. Lý do: flexible schema cho mỗi event type (force_complete cho impersonate, room_id cho approve, ...). NOT NULL để query .metadata.* không gặp null.
- **D5:** Fail-open audit insert. Lý do: endpoint dev-only (L1 strip), console.log đã capture. Audit DB lỗi không nên block dev workflow. Production case: L1 chặn trước.
- **D6:** Index event_type+created_at descending. Lý do: query phổ biến nhất "lấy 100 dev_impersonate event gần đây" — composite index optimize.

## Auto-decisions

- [Tier LOW] 2026-05-18 — Skip Phase E auto, dùng manual mode. Lý do: DB migration v17 phải user apply trước. Smoke test SQL query documented.
- [Tier LOW] 2026-05-18 — Reuse Claude-for-Google prompt pattern từ T-026 ([work/t029-apply-migration-prompt.md](work/t029-apply-migration-prompt.md)). Lý do: established pattern proven trong T-026 session.
- [Tier LOW] 2026-05-18 — Đổi từ fail-closed sang fail-open audit insert. Lý do: tránh break endpoint khi user pull main mà chưa apply v17. Soft degradation ưu tiên dev tooling availability vs strict audit (dev console.log đã có evidence).

## ACT

1. **Fail-open audit cho dev endpoint là pragmatic, không weakness.** (LOGIC — observation)
   - Initial draft: fail-closed (audit lỗi → return 500). Sau khi consider migration timing → fail-open.
   - Reasoning: endpoint dev-only (L1 production strip), console.log vẫn có audit, audit_logs table chưa exist là tạm thời (do migration order). Fail-closed ở đây tạo brittleness không cần.
   - Pattern: degradation level theo criticality. Auth/payment = fail-closed. Dev tooling audit = fail-open + log error.

2. **Generic `audit_logs` table với event_type discriminator scale hơn purpose-specific tables.** (CODE — design choice)
   - Alternative: `dev_impersonate_logs`, `auth_audit_logs`, ... mỗi loại 1 bảng.
   - Generic + JSONB metadata = 1 schema phục vụ N event type. Index event_type giải quyết performance.
   - Pattern match: meter_reading_logs cũng generic theo cấu trúc (1 bảng nhiều `field_changed`).

3. **2 cột actor/target tách biệt ngay từ đầu tránh schema refactor sau.** (CODE)
   - Single `user_id` đủ cho dev_impersonate (target only), nhưng future events (approve, transfer) cần cả 2.
   - Thêm cột sau = migration + backfill = scope creep. Thêm sẵn = nullable NULL cho event không dùng.

## Files thay đổi

```
supabase/migrations-v17.sql                # NEW (audit_logs schema)
app/api/dev/impersonate/route.ts           # +21 / -7 lines (audit insert + fail-open)
task/done/done.029-impersonate-audit-log.md  # this file
work/t029-apply-migration-prompt.md        # Claude-for-Google migration apply prompt
```

## Phase E — Manual smoke test (chờ user apply migration v17)

### Setup
User apply migration v17 qua Claude-for-Google. Prompt: [work/t029-apply-migration-prompt.md](work/t029-apply-migration-prompt.md).

### E1 — Verify table exists
```sql
SELECT to_regclass('public.audit_logs') AS table_exists;
```
Pass: 1 row 'audit_logs'.

### E2 — Verify indexes
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'audit_logs'
ORDER BY indexname;
```
Pass: 4 rows (audit_logs_pkey + idx_audit_logs_created + idx_audit_logs_event_type + idx_audit_logs_target).

### E3 — Live impersonate audit insert
1. Start `npm run dev`
2. `curl -i "http://localhost:3000/api/dev/impersonate?token=$TOKEN&user_id=<UUID>"`
3. Verify trong Supabase Studio:
   ```sql
   SELECT event_type, target_user_id, ip, metadata, created_at
   FROM audit_logs
   WHERE event_type = 'dev_impersonate'
   ORDER BY created_at DESC LIMIT 1;
   ```
Pass: 1 row mới với metadata=`{"role":"...","full_name":"...","force_complete":false}`.

### E4 — Fail-open graceful (optional)
Khi audit_logs chưa exist (test edge case):
1. `DROP TABLE audit_logs;` (tạm)
2. Curl impersonate → expect 302 redirect (impersonate vẫn work)
3. Console.error trong server log
4. Restore: re-run migration v17

Pass: endpoint không return 500 dù audit fail.

## Verify

- ✅ tsc no errors
- ✅ next build success
- ✅ Phase C anti-pattern audit: DL1 ✓ (throw không áp dụng — server route), BN1 ✓ (boolean explicit), no SA/SC/SW change
- ✅ Backward compat: nếu migration v17 chưa apply → console.error nhưng endpoint vẫn work (fail-open)
- 🟡 Phase E manual (chờ user apply migration v17 + verify E1-E3)
