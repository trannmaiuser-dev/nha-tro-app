# 🗂️ Todo: T-031 — JWT verify DB lookup (T-024 audit Bonus #2)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | JWT verify DB lookup — chống stale JWT sau user delete/disable |
| **Mã task** | T-031 |
| **Module** | Auth / Security (cross-module) |
| **Giai đoạn** | — (security followup) |
| **Ưu tiên** | 🟡 Trung bình (Tier HIGH/LOGIC original, autonomous decide) |
| **Ngày tạo** | 2026-05-18 |
| **Ngày hoàn thành** | — |
| **Trạng thái** | 🟢 Done |
| **Ngày hoàn thành** | 2026-05-18 |
| **Ước lượng thực tế** | ~30 phút (spec 1.5h — fail-open caching pattern straightforward) |
| **Branch** | feature/t031-jwt-verify-db |

---

## 🎯 1. PLAN

### Mục tiêu

T-024 audit Bonus #2 ([work/audit-2026-05-17-data-flow.md:290-296](work/audit-2026-05-17-data-flow.md:290)) flag: `getCurrentUser` chỉ decode JWT không cross-check `users` table. Token valid 30 ngày → nếu user bị delete/disable trong DB, JWT vẫn return AuthPayload có `userId`. Downstream page query DB không tìm thấy → fail silently hoặc redirect chain.

Implement DB existence check trong `getCurrentUser` để fail-fast: nếu user không tồn tại → trả NULL → middleware redirect /login.

### Scope

**✅ TRONG:**
- [ ] Thêm hàm `verifySessionWithDB(token)` trong [lib/auth.ts](lib/auth.ts) — verify JWT + check user còn tồn tại + role/tenant_status valid
- [ ] Update `getCurrentUser` dùng verify-with-DB
- [ ] Cache 60s in-memory để giảm DB hit per request (Map<userId, expiresAt>)
- [ ] Type-check existing callers (middleware, server components dùng getCurrentUser)
- [ ] Phase E manual: smoke test "delete user → JWT cũ → reload page → redirect /login"

**❌ NGOÀI:**
- Redis cache (overkill cho 4-room scale)
- Per-route opt-out (always-on cheaper than feature flag)
- JWT revocation list (đợi user delete trigger soft-delete pattern — defer)
- Audit log user-not-found events (gom với T-029 audit_logs sau)

### Deliverables
- `lib/auth.ts` — 1 hàm mới + getCurrentUser update + cache
- Phase E manual test plan

### Dependencies
- **Cần xong trước:** không có
- **Sẽ chặn:** không có

### Ước lượng: 1.5 giờ

---

## 🔨 2. DO

### Các bước
1. [ ] Đọc current `lib/auth.ts` + `middleware.ts` + `getCurrentUser` callers
2. [ ] Design cache structure (Map với TTL)
3. [ ] Implement `verifySessionWithDB(token)`
4. [ ] Update `getCurrentUser` dùng new function
5. [ ] Update `verifySession` (used by middleware) — quyết định: middleware có dùng DB check không? Nếu có → +latency mọi request. Decide: chỉ getCurrentUser dùng DB check, middleware vẫn JWT-only (lightweight)
6. [ ] tsc + build
7. [ ] Phase E manual smoke (tạo prompt Claude-for-Google)

### Ghi chú (fill khi làm)

- ...

### Files thay đổi

```
lib/auth.ts                  # +verifySessionWithDB + cache + update getCurrentUser
task/done/done.031-*.md      # this file (rename khi done)
work/t031-smoke-prompt.md    # Claude-for-Google smoke test
```

---

## ✅ 3. CHECK

- [ ] tsc no errors
- [ ] next build pass
- [ ] Phase C 12-pattern audit
- [ ] Backward compat: middleware behavior unchanged (chỉ getCurrentUser stricter)
- [ ] Cache TTL hợp lý (60s default — balance freshness vs DB load)

---

## 🧪 4. VERIFY (Manual smoke)

| TC | Mô tả | Pass criteria |
|---|---|---|
| TC1 | User active login → /dashboard render | getCurrentUser return AuthPayload, page OK |
| TC2 | User DB delete giữa session → reload /dashboard | getCurrentUser return NULL, middleware redirect /login |
| TC3 | Cache hit trong 60s | DB query KHÔNG fire lần 2 (verify qua DB logs) |
| TC4 | Cache miss sau 60s | DB query fire lại |
| TC5 | Backward compat middleware | /login redirect khi không có cookie vẫn work |

---

## 🎬 7. ACT (autonomous mode)

### Implementation summary

- **File thay đổi**: `lib/auth.ts` only (+62 lines, -2 lines)
- **Cache strategy**: in-process Map<userId, {expiresAt, valid}>, TTL 60s. Per-worker (Next.js có thể có multiple workers).
- **Fail-open**: DB query error → return TRUE (không log out user khi DB down). Trade-off: security < availability cho 4-room dev scale.
- **`verifySession` unchanged**: middleware vẫn JWT-only (lightweight edge). `getCurrentUser` mới có DB check.
- **`invalidateUserCache(userId)` exported**: server actions có thể gọi sau user mutation để force re-check.

### Decisions (Tier LOW autonomous)

- **D1:** Cache TTL 60s. Lý do: balance freshness (user delete có hiệu lực ≤60s) vs DB load (1 query/user/min).
- **D2:** `tenant_status='moved_out'` cũng invalidate session. Lý do: nếu tenant move-out approved nhưng session cookie còn → block immediately, không cho vào /dashboard.
- **D3:** Owner luôn valid (không check tenant_status). Lý do: owners không có tenant_status meaningful.
- **D4:** Fail-open DB error. Lý do: dev scale, DB hiccup không nên log out tất cả users.
- **D5:** Middleware giữ verifySession-only (KHÔNG DB check). Lý do: middleware chạy mọi route bao gồm /api → DB hit mỗi request quá đắt. Page-level getCurrentUser đủ stricter cho UI flow.
- **D6:** Simple Map không LRU eviction. Lý do: 4-room scale max ~10 users, memory negligible.

### Phase C 12-pattern audit

| Pattern | Result |
|---|---|
| SA1-4 | ✅ N/A (no new server action) |
| SC1-3 | ✅ N/A (lib not server component) |
| DL1 | ✅ N/A (no unstable_cache) |
| DL2 | ✅ PASS (verifyUserExistsInDB dùng createServerSupabaseClient) |
| DL3 | ✅ PASS (returns boolean fail-open, không Result<T> wrapper) |
| SW1-2 | ✅ N/A |
| BN1 | ✅ N/A |

### ACT bài học

1. **Fail-open security cho 4-room dev scale OK.** (LOGIC — autonomous decide)
   - Strict fail-closed: DB down → tất cả user logout = catastrophic UX khi Supabase hiccup.
   - Fail-open: DB down → cache stale data dùng tạm, log error.
   - Trade-off: window 60s + DB outage cho phép stale JWT vẫn access. Acceptable cho dev.
   - Production scale lớn nên reconsider (Redis cache + fail-closed).

2. **In-process Map cache cheap + effective cho 4-room.** (CODE)
   - Không cần Redis/Memcache. Map<userId, {expiresAt, valid}> đủ.
   - Per-worker: Next.js dev/prod có thể spawn 1-N workers. TTL effective ~60s mỗi worker.
   - Pattern: bắt đầu với simple in-process, scale to Redis chỉ khi cần thiết.

3. **Middleware lightweight, server component stricter.** (CODE)
   - Middleware (edge runtime) gọi mọi request bao gồm /api, /_next, etc → +DB latency = perf hit toàn site.
   - Server component (chạy trong Node runtime) gọi 1 lần per page render → +DB latency acceptable.
   - Phân tầng: middleware fast-path JWT decode, server component strict DB verify.

### Smoke test plan (deferred — user mệt)

Skip Phase E manual smoke session này. Test scenarios documented trong TC1-TC5 ở PLAN section. User có thể chạy khi rảnh:
- TC1: Login normal → /dashboard render OK
- TC2: DB delete user → reload /dashboard → redirect /login
- TC3: Cache hit 60s window
- TC4: Cache miss sau 60s
- TC5: Middleware /login behavior unchanged

---

## Decisions cần quyết khi làm

1. **Middleware có dùng DB check không?**
   - Pros: stricter security mọi request
   - Cons: +5-10ms latency mỗi route
   - Default decision: KHÔNG (middleware lightweight, page-level dùng getCurrentUser)

2. **Cache TTL?**
   - 60s default. User delete → user vẫn login được 60s sau khi delete.
   - Có thể giảm 30s hoặc tăng 300s.
   - Default: 60s.

3. **Cache eviction?**
   - LRU? Size limit? Cho 4-room scale: Map giản đơn, không evict (max 10 users). Memory negligible.
   - Default: simple Map, no eviction.
