# 🗂️ Todo: UI cấu hình Settings cho thu chi

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | UI cấu hình Settings: đơn giá điện nước, phí khác |
| **Mã task** | T-012 |
| **Module** | Thu chi |
| **Giai đoạn** | 2 |
| **Ưu tiên** | 🔴 Cao |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Trang `/admin/settings` cho chủ trọ cấu hình tất cả tham số liên quan thu chi: đơn giá điện mặc định, mode nước + đơn giá 3 loại, 4 loại phí (rác, xe, internet, quá người), ngày chốt chỉ số, cảnh báo nợ. Đây là trang phải có trước khi T-013 (tạo hóa đơn) hoạt động được.

### Phạm vi (Scope)

**✅ TRONG phạm vi:**

**Data layer:**
- [ ] `lib/db/settings.ts` — getSetting(key), setSetting(key, value), getAllSettings()
- [ ] Cache settings để giảm query (revalidate khi update)
- [ ] Server Actions: updateSettings (batch update nhiều key)

**UI:**
- [ ] Trang `/admin/settings` với 4 tab/section:
   - Tab 1: **Điện nước** — đơn giá điện default, mode nước (radio), 3 đơn giá nước
   - Tab 2: **Phí khác** — 4 toggle bật/tắt, mỗi cái có input đơn giá khi bật
   - Tab 3: **Thời gian** — ngày chốt chỉ số, ngày phải đóng tiền, ngày bắt đầu cảnh báo nợ, interval nhắc lại
   - Tab 4: **Khác** — pattern mật khẩu tạm, data retention years
- [ ] Form react-hook-form cho mỗi section
- [ ] Hiển thị giá trị hiện tại
- [ ] Nút "Lưu thay đổi" cho mỗi section riêng (không lưu tất cả 1 lúc)
- [ ] Tooltip giải thích cho từng cài đặt
- [ ] Toast khi save thành công

**Riêng cho phòng:**
- [ ] Trên trang `/admin/rooms` → form sửa phòng → thêm field `electricity_rate` (override default)
- [ ] Nếu để trống → dùng default từ settings
- [ ] Hiển thị giá điện hiện tại của từng phòng trên card

**❌ NGOÀI phạm vi:**
- Tạo hóa đơn → T-013
- Settings không liên quan thu chi (vd: thông báo) → không thuộc task này
- Settings cho nhiều dãy trọ (nếu mở rộng sau) → task riêng

### Deliverables

```
lib/db/settings.ts
lib/cache/settings.ts          # Cache layer
app/admin/settings/
  page.tsx
  actions.ts
  components/
    UtilitiesSettingsForm.tsx      # Tab 1
    FeesSettingsForm.tsx           # Tab 2
    TimingSettingsForm.tsx         # Tab 3
    MiscSettingsForm.tsx           # Tab 4

# Cập nhật:
components/rooms/RoomForm.tsx  # Thêm field electricity_rate
components/rooms/RoomCard.tsx  # Hiển thị giá điện
```

### Dependencies
- **Cần xong trước:** T-005 (UI phòng), T-011 (schema)
- **Chặn:** T-013 (cần settings để tính hóa đơn)

### Ước lượng: 5-6 giờ

---

## 🔨 2. DO

1. [ ] Tạo `settings.ts` data layer:
   - `getSetting<T>(key): Promise<T>`
   - `setSetting(key, value): Promise<void>`
   - `getAllSettings(): Promise<Record<string, any>>`
   - `updateMultipleSettings(updates: Record<string, any>): Promise<void>`
2. [ ] Tạo cache layer (React `cache()` hoặc `unstable_cache`):
   - Cache settings trong server-side render
   - Revalidate khi update
3. [ ] Server Action `updateSettingsAction(section, data)`:
   - Verify admin role
   - Parse Zod schema riêng cho mỗi section
   - Update tất cả keys trong section
   - `revalidatePath('/admin/settings')`
4. [ ] Trang `/admin/settings/page.tsx`:
   - Server Component: fetch all settings
   - Pass xuống Client Component với tabs (shadcn Tabs)
5. [ ] Tab 1 — UtilitiesSettingsForm:
   - Input: electricity_rate_default
   - Radio: water_billing_mode (3 lựa chọn)
   - Conditional input: hiện đúng input theo mode đã chọn
   - Nút "Lưu cài đặt điện nước"
6. [ ] Tab 2 — FeesSettingsForm:
   - Switch toggle cho mỗi loại phí
   - Khi bật → hiện input số tiền
   - Nút lưu
7. [ ] Tab 3 — TimingSettingsForm:
   - Number input: meter_reading_day (1-28), payment_due_day (1-28)
   - Number input: overdue_warning_days, overdue_remind_interval
   - Nút lưu
8. [ ] Tab 4 — MiscSettingsForm:
   - Select: pattern mật khẩu tạm
   - Number input: data_retention_years
9. [ ] Cập nhật RoomForm:
   - Thêm field "Đơn giá điện (VNĐ/kWh)" — optional, placeholder hiện default
   - Validate: nếu nhập, phải > 0
10. [ ] Cập nhật RoomCard:
    - Hiển thị "Điện: 4,000 đ/kWh" (lấy từ rooms.electricity_rate hoặc default)
11. [ ] Test toàn bộ tabs trên desktop + mobile

---

## ✅ 3. CHECK

- [ ] Build pass, không TS error
- [ ] Tiếng Việt 100%
- [ ] Format số VNĐ đẹp (3,000 thay vì 3000)
- [ ] Tooltip hiển thị khi hover
- [ ] Mỗi section lưu độc lập (lưu tab 1 không ảnh hưởng tab 2)
- [ ] Validation: số âm bị reject, ngày 0 hoặc > 28 bị reject
- [ ] Cache hoạt động: nhiều page render cùng lúc không gây N+1 query
- [ ] Mobile (390px): tabs hiển thị đẹp, form không tràn

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/usecase-thu-chi.md` mục 4 (Settings)

Đối chiếu:
- 18 keys settings trong bảng — có UI cho tất cả không?
- Mode nước 3 lựa chọn → có radio không?
- electricity_rate theo phòng → có override field không?
- "Cấu hình mặc định trong Settings, có thể override khi tạo từng hóa đơn" — override khi tạo HĐ thuộc T-013, không thuộc task này

---

## 🧪 5. VERIFY

### Test Case 1: Cấu hình điện nước
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Vào /admin/settings, tab Điện nước | Hiển thị giá trị hiện tại | ⬜ |
| 2 | Đổi electricity_rate_default → 4500 | Input cập nhật | ⬜ |
| 3 | Đổi mode nước sang per_person | Hiện input water_rate_per_person | ⬜ |
| 4 | Lưu | Toast "Đã lưu", DB cập nhật | ⬜ |
| 5 | Reload trang | Giá trị mới được giữ | ⬜ |

### Test Case 2: Bật phí rác
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tab Phí khác | Hiển thị 4 toggle | ⬜ |
| 2 | Bật toggle "Phí rác" | Hiện input số tiền | ⬜ |
| 3 | Nhập 25000, lưu | OK | ⬜ |
| 4 | Tắt toggle → input ẩn nhưng giữ value 25000 | OK | ⬜ |

### Test Case 3: Đơn giá điện theo phòng
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Vào /admin/rooms → sửa phòng A | Form hiện | ⬜ |
| 2 | Field electricity_rate có placeholder "Mặc định: 4,000" | OK | ⬜ |
| 3 | Nhập 4500, lưu | OK | ⬜ |
| 4 | Card phòng A hiển thị "Điện: 4,500 đ/kWh" | OK | ⬜ |
| 5 | Card phòng B (không override) hiển thị "Điện: 4,000 đ/kWh" | OK | ⬜ |

### Test Case 4: Validation
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Nhập electricity_rate = -100 | Lỗi: "Phải lớn hơn 0" | ⬜ |
| 2 | Nhập meter_reading_day = 32 | Lỗi: "Từ 1 đến 28" | ⬜ |
| 3 | Để trống required field | Lỗi: "Bắt buộc" | ⬜ |

### Test Case 5: Phân quyền
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant cố vào /admin/settings | Middleware redirect | ⬜ |
| 2 | Admin truy cập | OK | ⬜ |

### Edge cases
- [ ] Spam click "Lưu" liên tục → có double save không? (disable button khi loading)
- [ ] 2 admin cùng update settings cùng lúc → ai thắng? (last-write-wins là OK)
- [ ] Số tiền > 999,999,999 → có overflow không?

---

## 👀 6. HUMAN REVIEW
- [x] **Cần review** — settings ảnh hưởng tất cả hóa đơn sau này

Cần xem:
- [ ] UX có dễ hiểu không (tooltip đủ rõ?)
- [ ] Cache có miss khi update không?
- [ ] Có để lộ key sensitive trong client không?

---

## 🎬 7. ACT

### Bài học rút ra
- **Cache layer dùng Next.js native thay vì file riêng** — `revalidatePath` + `force-dynamic` trong page là đủ cho quy mô 4 phòng. Không cần `lib/cache/settings.ts` riêng → tiết kiệm boilerplate.
- **Section-based save**: 4 form tab lưu độc lập (1 action chung nhận `section` param + dict `SCHEMAS`) — tránh lưu nhầm cả 18 key cùng lúc, mỗi tab có nút "Lưu" riêng.
- **Type coercion ở boundary**: `app_settings.value` là JSONB không đảm bảo type → cần helper `asNumber/asBoolean/asString` ở page boundary ([app/admin/settings/page.tsx:15-34](app/admin/settings/page.tsx:15)) để pass typed input xuống form, tránh runtime error.

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.012-settings-thu-chi.md` → `done.012-settings-thu-chi.md`
2. Commit: `done: T-012 settings thu chi`
3. Task tiếp: `todo.013-nhap-chi-so-tao-hoa-don.md`
