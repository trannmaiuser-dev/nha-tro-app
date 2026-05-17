# T-026 — Transactional wrap approveMoveRequest + createTenantAccount qua Supabase RPC

## Trạng thái: 🟢 Done (chờ user apply migration)
## Ngày tạo: 2026-05-18
## Ngày hoàn thành: 2026-05-18
## Ước lượng: 2.5 giờ
## Áp dụng Phase E: 🟡 Manual (user apply migration + smoke test sau merge)
## Phase E mode: manual
## Branch: feature/t026-rpc-transactional-wrap

## Bối cảnh

T-024 audit Issue #6 (`work/audit-2026-05-17-data-flow.md:197-203`) flag 2 hàm phức tạp chained mutation không atomic:

**approveMoveRequest** ([lib/db/move-requests.ts:71-105](lib/db/move-requests.ts:71)) — 4-6 writes:
1. UPDATE move_requests (status, reviewed_by, reviewed_at)
2. UPDATE users.tenant_status='moved_out'
3. removeTenantFromRoom: UPDATE room_tenants.left_at + (maybe) UPDATE next primary + UPDATE rooms (tenant_id/status)
4. INSERT notifications

**createTenantAccount** ([lib/db/tenants.ts:20-76](lib/db/tenants.ts:20)) — 3-5 writes:
1. INSERT users
2. addTenantToRoom: (maybe) UPDATE primary cũ + INSERT room_tenants + UPDATE rooms
3. INSERT tenant_profiles

**Failure mode** (current): nếu fail write 3/4 giữa chừng → DB ghost state (move_request approved nhưng room không cập nhật, hoặc user tạo xong nhưng room_tenant insert fail).

User chose **Option A** (Supabase RPC cho cả 2) trên Tier HIGH/LOGIC decision. Precedent codebase: 2 PG functions hiện có ([supabase/migrations-v12.sql:155,183](supabase/migrations-v12.sql:155)).

## Trong scope

1. **`supabase/migrations-v16.sql`** — 2 PG function plpgsql:
   - `approve_move_request(p_request_id UUID, p_reviewer_id UUID) RETURNS VOID`
   - `create_tenant_account(p_room_id UUID, p_phone TEXT, p_full_name TEXT, p_password_hash TEXT, p_token TEXT, p_token_expires TIMESTAMPTZ) RETURNS JSONB`
2. **TS caller refactor**:
   - `lib/db/move-requests.ts::approveMoveRequest` → `sb.rpc('approve_move_request', ...)`
   - `lib/db/tenants.ts::createTenantAccount` → `sb.rpc('create_tenant_account', ...)` (giữ bcryptjs ở TS layer)
3. **Remove import** orphan: `removeTenantFromRoom`, `addTenantToRoom` không còn dùng trong 2 caller này
4. **Error propagation**: `RAISE EXCEPTION 'tiếng Việt'` → `error.message` propagate qua `sb.rpc()`

## Ngoài scope

- Xóa hàm `addTenantToRoom`/`removeTenantFromRoom` trong `lib/db/room-tenants.ts` — vẫn public exports, T-019/T-020 backlog cần
- Phase E auto qua Claude in Chrome — DB migration cần apply manual trong Supabase Studio trước
- Wrap thêm 3-write chain khác (createMoveRequest, completeProfile, ...) — defer task riêng nếu cần
- Schema migration (cột mới, drop column) — không touch schema, chỉ thêm function
- Performance benchmark — chưa cần với scale 4 phòng

## Decisions

- **D1:** Password hash + token generate ở TS layer (bcryptjs + randomBytes), KHÔNG move vào PG. Lý do: PG core không có bcrypt; cần extension `pgcrypto` thì chỉ có `crypt()` với MD5/SHA — không bcrypt-compatible. TS pre-compute + pass hash là pattern an toàn (function only handles DB writes).
- **D2:** Return JSONB cho `create_tenant_account` thay vì OUT params hoặc multiple RETURNS. Lý do: TS parse JSON đơn giản, không cần unwrap row. `approve_move_request` không cần return → VOID.
- **D3:** `RAISE EXCEPTION 'message'` không dùng ERRCODE custom. Lý do: Supabase JS surfaces message qua `error.message` — đủ cho user-facing. Custom error code phức tạp + ngoài scope.
- **D4:** KHÔNG drop hoặc rename `addTenantToRoom`/`removeTenantFromRoom` trong `room-tenants.ts`. Lý do: backlog T-019 (them-khach-thu-2) + T-020 (chuyen-phong-noi-bo) reference. Premature cleanup.
- **D5:** Migration mới là file riêng `migrations-v16.sql`, không append vào v15 hay RUN-IN-SUPABASE.sql. Lý do: convention codebase (v2-v15 đều numbered file), RUN-IN-SUPABASE.sql là hotfix patch separate.
- **D6:** Function body BEGIN/END plpgsql implicit atomic. KHÔNG cần wrap thêm `BEGIN; ... COMMIT;` trong function body — function call tự là transaction.
- **D7:** Error message format `error.message || 'fallback'` — match pattern existing (login route + auth code). PG RAISE EXCEPTION text propagate trực tiếp.

## Auto-decisions

- [Tier LOW] 2026-05-18 — Skip Phase E auto, dùng manual mode. Lý do: DB migration phải user apply trong Supabase Studio trước; Claude in Chrome không có quyền apply migration. Manual smoke test SQL queries documented bên dưới.
- [Tier LOW] 2026-05-18 — Giữ `void idCardNumber` placeholder trong createTenantAccount signature. Lý do: backward compat với caller `app/admin/tenants/actions.ts:createTenantAction` truyền 3 params. T-016c D22 đã document.
- [Tier LOW] 2026-05-18 — `COALESCE(p_full_name, 'Khách phòng ' || v_room_name)` thay logic TS `fullName ?? 'Khách phòng ${room.name}'`. Lý do: equivalent semantics, ít hơn 1 TS step.

## ACT

1. **PG function = transaction implicit cho atomicity simple, không cần BEGIN/COMMIT explicit.** (CODE)
   - PostgreSQL function gọi tự động wrap trong transaction (savepoint). Nếu RAISE EXCEPTION giữa chừng → toàn bộ writes rollback.
   - Pattern: function body chỉ cần `CREATE FUNCTION ... AS $$ BEGIN ... END $$ LANGUAGE plpgsql;` — không cần BEGIN/COMMIT bên trong.
   - Đối chiếu: migrations-v15.sql wrap migration script trong `BEGIN; ... COMMIT;` vì là DDL multi-statement, khác function.

2. **Bcrypt phải ở TS, không PG.** (LOGIC — observation từ research)
   - PostgreSQL core không có bcrypt. Extension `pgcrypto` chỉ MD5/SHA/Blowfish, KHÔNG bcrypt-compatible với output `$2a$10$...`.
   - Pre-compute hash ở TS + pass vào RPC là pattern đúng. Function chỉ làm pure DB writes.
   - Tương tự: token randomBytes(32) ở TS (cũng có thể dùng `gen_random_uuid()` nhưng format khác).

3. **Error propagation qua sb.rpc(...).error.message tự nhiên cho user-facing Vietnamese.** (CODE)
   - `RAISE EXCEPTION 'Số điện thoại đã được đăng ký'` → `error.message = 'Số điện thoại đã được đăng ký'`.
   - Không cần custom error class, không cần ERRCODE mapping.
   - Pattern reusable cho mọi RPC function tương lai.

4. **Giữ helper function (addTenantToRoom/removeTenantFromRoom) dù không còn caller hiện tại.** (Tier LOW — kept per D4)
   - Backlog T-019, T-020 reference. Premature deletion sẽ regress khi vào.
   - Pattern: chỉ xóa public export khi confirm không reference cross-task.

## Files thay đổi

```
supabase/migrations-v16.sql                # NEW (200 lines, 2 PG function)
lib/db/move-requests.ts                    # -34 / +9 lines (approveMoveRequest RPC)
lib/db/tenants.ts                          # -28 / +12 lines (createTenantAccount RPC)
task/done/done.026-rpc-transactional-wrap.md  # this file
```

## Phase E — Manual smoke test (BẮT BUỘC trước khi mark DONE)

### Setup
1. **User apply migration** trong Supabase Studio:
   ```
   SQL Editor → New Query → Paste supabase/migrations-v16.sql → Run
   ```
2. Verify 2 function exist:
   ```sql
   SELECT proname FROM pg_proc
    WHERE proname IN ('approve_move_request', 'create_tenant_account')
    ORDER BY proname;
   ```
   Expected: 2 rows.

### E1 — `create_tenant_account` happy path
```sql
BEGIN;
-- Replace placeholders với thật:
SELECT create_tenant_account(
  (SELECT id FROM rooms WHERE name = 'P101' LIMIT 1),   -- room id
  '0911000099',                                          -- phone test
  'Test E1 RPC Tenant',                                  -- full_name
  '$2a$10$dummy_hash_for_e1_test_test_test_test_test',   -- password_hash (dummy)
  'dummy_token_e1_64_chars_test_test_test_test_test_test',
  NOW() + INTERVAL '7 days'
) AS result;
-- → Expected: jsonb với {"user_id": "uuid", "phone": "0911000099"}

-- Verify state:
SELECT id, phone, full_name, tenant_status, is_profile_complete
  FROM users WHERE phone = '0911000099';
-- → 1 row, tenant_status='invited', is_profile_complete=false

SELECT room_id, user_id, is_primary, joined_at
  FROM room_tenants
  WHERE user_id = (SELECT id FROM users WHERE phone = '0911000099');
-- → 1 row, joined_at = NOW

SELECT user_id, profile_status FROM tenant_profiles
  WHERE user_id = (SELECT id FROM users WHERE phone = '0911000099');
-- → 1 row, profile_status='draft'

ROLLBACK;  -- KHÔNG commit (test only)
```
**Pass criteria**: 3 verify queries trả đúng row. ROLLBACK cleanup.

### E2 — `create_tenant_account` reject duplicate phone
```sql
-- Test phone đã tồn tại (vd 0911999003 từ seed T-021)
BEGIN;
SELECT create_tenant_account(
  (SELECT id FROM rooms WHERE name = 'P101' LIMIT 1),
  '0911999003',  -- phone existing
  'Test E2',
  '$2a$10$dummy_hash',
  'dummy_token',
  NOW() + INTERVAL '7 days'
);
ROLLBACK;
```
**Pass criteria**: ERROR `Số điện thoại đã được đăng ký`.

### E3 — `approve_move_request` happy path
Setup: seed 1 move_request pending (xem [task/done/021/seed.sql](task/done/021/seed.sql) E2/E3 — đã có sẵn).

```sql
BEGIN;
-- Pick 1 move_request pending từ seed
SELECT approve_move_request(
  '00000000-0000-0000-0000-000000777002'::uuid,  -- request id từ seed E2
  (SELECT id FROM users WHERE role = 'owner' LIMIT 1)
);
-- → Returns VOID, no error

-- Verify:
SELECT status, reviewed_by IS NOT NULL AS reviewed FROM move_requests
  WHERE id = '00000000-0000-0000-0000-000000777002'::uuid;
-- → status='approved', reviewed=true

SELECT tenant_status FROM users
  WHERE id = '00000000-0000-0000-0000-000000999002'::uuid;
-- → 'moved_out'

SELECT left_at IS NOT NULL AS left_set FROM room_tenants
  WHERE user_id = '00000000-0000-0000-0000-000000999002'::uuid AND room_id IN (
    SELECT room_id FROM move_requests WHERE id = '00000000-0000-0000-0000-000000777002'::uuid
  );
-- → left_set=true

SELECT status FROM rooms
  WHERE id IN (SELECT room_id FROM move_requests WHERE id = '00000000-0000-0000-0000-000000777002'::uuid);
-- → 'vacant' (nếu E2 room không còn ai)

SELECT type, message FROM notifications
  WHERE receiver_id = '00000000-0000-0000-0000-000000999002'::uuid
    AND type = 'extension_approved'
  ORDER BY created_at DESC LIMIT 1;
-- → 1 row 'Yêu cầu chuyển đi của bạn đã được chấp nhận.'

ROLLBACK;
```
**Pass criteria**: 5 verify queries đúng. ROLLBACK preserve seed state.

### E4 — `approve_move_request` reject invalid id
```sql
BEGIN;
SELECT approve_move_request(
  '00000000-0000-0000-0000-999999999999'::uuid,  -- không tồn tại
  (SELECT id FROM users WHERE role = 'owner' LIMIT 1)
);
ROLLBACK;
```
**Pass criteria**: ERROR `Không tìm thấy yêu cầu`.

### Sau khi E1-E4 pass
- [ ] User confirm test pass
- [ ] Commit cleanup seed nếu test data sót
- [ ] Update CLAUDE.md changelog v1.9 (RPC pattern)

⚠️ NẾU E1-E4 FAIL → dùng [.claudes/skills/debug-workflow.md](.claudes/skills/debug-workflow.md) trace error message từ PG.

## Verify

- ✅ tsc no errors
- ✅ next build success (no warnings about unused imports)
- ✅ Phase C anti-pattern audit: SA1-4 ✓ (caller unchanged), DL1 ✓ (throw error tiếng Việt), BN1 ✓ (explicit boolean), no SC/SW change
- ✅ Imports cleaned (`removeTenantFromRoom`, `addTenantToRoom` removed from 2 callers)
- 🟡 Phase E manual (chờ user apply migration + smoke test E1-E4 trong Supabase Studio)
- ⏭️ Phase E auto skip (DB migration cần manual apply)
