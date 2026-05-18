# 🗂️ Todo: T-035 — Admin settings UI cho debt_warning_threshold_days

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Settings UI input cho debt threshold (T-017 followup) |
| **Mã task** | T-035 |
| **Module** | Thu chi & hóa đơn (Module 2) |
| **Giai đoạn** | 2 |
| **Ưu tiên** | 🟢 Thấp (polish) |
| **Ngày tạo** | 2026-05-18 |
| **Ngày hoàn thành** | 2026-05-18 |
| **Trạng thái** | 🟢 Done |
| **Ước lượng thực tế** | ~10 phút (existing infra reuse) |
| **Branch** | feature/t035-settings-debt-threshold |

---

## ACT

### Files thay đổi
- `lib/schemas/settings.ts`: +1 field `debt_warning_threshold_days` trong timingSettingsSchema
- `app/admin/settings/page.tsx`: +1 line trong timing object asNumber default 0
- `app/admin/settings/components/TimingSettingsForm.tsx`: +1 input block với help text

### Decisions (autonomous)
- **D1:** Add field vào TimingSettingsForm thay vì tạo tab mới. Lý do: 1 setting đủ, không justify tab riêng.
- **D2:** Min 0, max 30. 0 = quá 1 ngày là cảnh báo ngay (default). 30 = max 1 tháng grace period.
- **D3:** Reuse existing updateSettingsAction('timing', ...) — no new action needed.
- **D4:** Help text rõ ràng: "Số ngày trễ sau hạn đóng tiền mới gửi push notification + banner đỏ cho khách."

### Phase C 12-pattern audit
- SA1-4: action reuse updateSettingsAction (existing, đã PASS T-018 audit) ✅
- SC1: settings/page.tsx line 13 force-dynamic ✅
- SC2-3, DL1-3, SW1-2, BN1: N/A
- All PASS hoặc N/A.

### Phase E smoke
- Test 1: Login owner → /admin/settings → Timing tab → field "Ngưỡng cảnh báo nợ cho khách" hiện với default 0
- Test 2: Change to 3 → Save → toast success → reload page → field hiện value 3
- Test 3: Tenant flow T-017 nay respect threshold (chỉ trigger sau N ngày)

---

## 🎯 1. PLAN

### Mục tiêu

T-017 thêm setting `debt_warning_threshold_days` (default 0) nhưng KHÔNG có UI để owner đổi. Hiện tại phải sửa qua Supabase Studio SQL. T-035 expose input trong `/admin/settings` Timing tab.

### Scope

**✅ TRONG:**
- [ ] `lib/schemas/settings.ts` — Add `debt_warning_threshold_days` vào timingSettingsSchema (min 0, max 30, int)
- [ ] `app/admin/settings/page.tsx` — Add to `timing` object: `asNumber(settings.debt_warning_threshold_days, 0)`
- [ ] `app/admin/settings/components/TimingSettingsForm.tsx` — Add input field với label + help text

**❌ NGOÀI:**
- New tab "Debt warnings" (overkill, 1 setting đủ trong Timing)
- Validation phức tạp (min 0 + max 30 đủ)

### Deliverables
- 1 input mới trong settings UI
- Save action reuse existing updateSettingsAction('timing', ...)

### Dependencies
- T-017 done ✅

### Ước lượng: 30 phút

---

## 🔨 2. DO

1. [ ] Update schema
2. [ ] Update page.tsx fetcher
3. [ ] Update TimingSettingsForm
4. [ ] tsc + build
5. [ ] Phase C 12-pattern audit
