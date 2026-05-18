# 🗂️ Todo: T-037 — Maintenance request notify owner (Module 6 audit gap #1)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Maintenance POST dispatch notification + push cho owner |
| **Mã task** | T-037 |
| **Module** | Cộng đồng (Module 6) |
| **Giai đoạn** | 4 |
| **Ưu tiên** | 🟡 Trung bình (user-facing impact, follow audit 2026-05-18) |
| **Ngày tạo** | 2026-05-18 |
| **Ngày hoàn thành** | 2026-05-18 |
| **Trạng thái** | 🟢 Done |
| **Ước lượng thực tế** | ~15 phút (reuse notifyOwner + push pattern T-017) |
| **Branch** | feature/t037-maintenance-notify |

---

## ACT

### Implementation
- Single file change: `app/api/maintenance/route.ts` POST
- Async dispatch function `dispatchMaintenanceNotify` — fire-and-forget với `void ... .catch()` để KHÔNG block return data
- Notification insert qua existing `notifyOwner` helper (best-effort fail-open)
- Push notification per owner subscription (best-effort fail-open per-sub)

### Decisions
- **D1:** Reuse `type='extension_request'` thay vì add type mới 'maintenance_new'. Lý do: tránh ALTER CHECK constraint migration v13. Semantic gần đủ.
- **D2:** Truncate description 50 chars cho message + push body. UX clean.
- **D3:** Fire-and-forget pattern (`void async.catch`) thay vì await. Lý do: API response không block dispatch latency. Tenant nhận response ngay sau insert, owner notify async.
- **D4:** Push data field `type='maintenance_new'` (distinct từ DB type) cho future client-side handler.

### Phase C 12-pattern audit
- SA1-4: ✅ N/A (API route, không phải server action)
- SC1-3: ✅ N/A
- DL1-3: ✅ PASS (createServerSupabaseClient inside, no Result wrapper trong API route)
- SW1-2: ✅ N/A
- BN1: ✅ N/A

### Smoke test plan
| TC | Mô tả | Pass |
|---|---|---|
| TC1 | Tenant POST /api/maintenance | Return 200 + maintenance row |
| TC2 | Verify notifications table row mới type=extension_request, receiver=owner | 1+ row |
| TC3 | Owner /notifications page | Notification mới hiện top |
| TC4 | Owner có push sub | Push arrive trên device |
| TC5 | Truncate description >50 chars trong message + push body | "…" suffix |

---

## 🎯 1. PLAN

### Mục tiêu

Audit Module 6 ([work/audit-2026-05-18-module6.md](work/audit-2026-05-18-module6.md)) phát hiện: tenant báo sự cố qua `/api/maintenance` POST chỉ INSERT row, KHÔNG dispatch notification cho owner. Owner phải scroll xuống Maintenance section trong /community mới thấy.

T-037 fix: insert notification row + best-effort push (pattern T-017).

### Scope

**✅ TRONG:**
- [ ] Update `app/api/maintenance/route.ts` POST: sau INSERT maintenance_requests → notifyOwner type='extension_request' (reuse existing CHECK type) + best-effort push
- [ ] Message format: "🔧 <reporter_name> báo sự cố: <description truncated 50 chars>"
- [ ] Push notification: title "Sự cố mới", body description truncated, data { type: 'maintenance_new', request_id }
- [ ] Verify push subscriptions table có owner subscriptions

**❌ NGOÀI:**
- New CHECK constraint type 'maintenance_new' (avoid ALTER constraint — reuse extension_request semantic)
- Real-time owner UI badge (community page already realtime subscribe — sẽ auto-update)
- Status change notification (in_progress, done) — owner tự update, tenant tự thấy

### Deliverables
- POST endpoint dispatch notification + push
- Best-effort fail-open (notify lỗi không block request creation)

### Dependencies
- T-017 ✅ (push pattern)
- lib/db/notifications.ts (notifyOwner helper) ✅
- lib/push.ts ✅

### Ước lượng: 30 phút

---

## 🔨 2. DO

1. [ ] Read existing notifyOwner helper signature
2. [ ] Update maintenance POST after INSERT
3. [ ] Add push dispatch loop (all owner push_subscriptions)
4. [ ] tsc + build
5. [ ] Phase C 12-pattern audit

### Files thay đổi (dự kiến)
```
app/api/maintenance/route.ts                  # +notify dispatch sau INSERT
task/done/done.037-*.md                       # this file (rename khi done)
```

---

## ✅ 3. CHECK

- [ ] tsc + build pass
- [ ] Notification fail-open (best-effort, không block insert)
- [ ] Push fail-open (per-subscription, không block)

---

## 🧪 4. VERIFY

| TC | Mô tả | Pass criteria |
|---|---|---|
| TC1 | Tenant POST /api/maintenance | Returns 200 + maintenance row. notifications table có row mới type=extension_request receiver=owner |
| TC2 | Owner /notifications | Notification mới hiện top |
| TC3 | Owner có push subscription | Push arrive on device |
| TC4 | Notification DB lỗi giả lập | Maintenance vẫn tạo OK, console.error logged |
