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
| **Trạng thái** | 🔲 Todo |

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
