# 🗂️ Todo: Báo cáo thu chi + xuất PDF hóa đơn + chi phí sửa chữa

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Báo cáo thu chi theo khoảng thời gian + xuất PDF hóa đơn + quản lý expenses |
| **Mã task** | T-015 |
| **Module** | Thu chi |
| **Giai đoạn** | 2 |
| **Ưu tiên** | 🟡 Trung bình |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Hoàn thiện module Thu chi với 3 phần cuối: (1) quản lý chi phí sửa chữa, (2) xuất PDF hóa đơn, (3) báo cáo thu chi tổng theo khoảng thời gian. Bao gồm UC-12, UC-13, UC-14.

### Phạm vi (Scope)

**✅ TRONG phạm vi:**

**Phần 1 — Expenses (chi phí sửa chữa):**
- [ ] Zod schema `expenseSchema`
- [ ] `lib/db/expenses.ts`:
   - createExpense, getExpenses(filters), updateExpense, deleteExpense
- [ ] Trang `/admin/finance/expenses`:
   - List view với filter (type, room, khoảng thời gian)
   - Nút "Thêm chi phí"
- [ ] Form ExpenseForm:
   - Type dropdown (5 loại)
   - Room dropdown (có option "Toàn nhà" = NULL)
   - Amount
   - Description (textarea)
   - Date picker (default hôm nay)
   - MultiImageUpload (optional, max 3 ảnh biên lai)

**Phần 2 — PDF Export:**
- [ ] Cài thư viện PDF (đề xuất: `@react-pdf/renderer` hoặc `pdfkit`)
- [ ] Component `InvoicePDF.tsx` — template PDF format đơn giản
- [ ] Hỗ trợ tiếng Việt có dấu (load font Roboto/Inter)
- [ ] Nút "Xuất PDF" trên trang chi tiết hóa đơn
- [ ] Tên file: `hoa-don-phong-{room}-{month}-{year}.pdf`
- [ ] Nội dung PDF: header, info phòng/người ở, breakdown chi tiết, total, ghi chú

**Phần 3 — Báo cáo thu chi:**
- [ ] `lib/db/finance-report.ts`:
   - getReport(fromDate, toDate, roomIds?) — aggregate query
- [ ] Trang `/admin/finance/report`:
   - DateRangePicker (default: tháng hiện tại)
   - Optional filter phòng
   - 4 cards thống kê:
     • Tổng thu (đã trả)
     • Tổng chi (expenses)
     • Lợi nhuận (thu - chi)
     • Số hóa đơn chưa thu (count + total)
   - Bảng chi tiết:
     • Tab 1: Thu (list invoices)
     • Tab 2: Chi (list expenses)
   - Breakdown thu theo phòng (bar chart đơn giản hoặc list)
   - Breakdown chi theo loại (bar chart hoặc list)

**❌ NGOÀI phạm vi:**
- Export Excel/CSV — confirm không cần
- Email PDF tự động cho khách — chưa cần
- Predictive analytics / forecast — quá xa

### Deliverables

```
# Phần 1: Expenses
lib/db/expenses.ts
lib/schemas/expense.ts
app/admin/finance/expenses/
  page.tsx
  actions.ts
  ExpenseForm.tsx
  ExpenseCard.tsx

# Phần 2: PDF
lib/pdf/InvoicePDF.tsx
app/admin/finance/invoices/[id]/export/route.ts   # API route trả về PDF stream

# Phần 3: Report
lib/db/finance-report.ts
app/admin/finance/report/
  page.tsx
  ReportFilters.tsx
  StatCards.tsx
  RevenueByRoomChart.tsx
  ExpenseByTypeChart.tsx
```

### Dependencies
- **Cần xong trước:** T-011 (schema expenses), T-013 (hóa đơn), T-014 (paid_amount đúng)
- **Chặn:** Không (kết thúc module Thu chi)

### Ước lượng: 8-10 giờ

---

## 🔨 2. DO

### Phần 1: Expenses (2-3 giờ)
1. [ ] Zod schema, types
2. [ ] Data layer
3. [ ] Trang list với filter
4. [ ] Form thêm/sửa
5. [ ] Confirm dialog xóa

### Phần 2: PDF (3-4 giờ)
6. [ ] Cài `@react-pdf/renderer`
7. [ ] Tạo template InvoicePDF với font Tiếng Việt
   - Tải Roboto VN font (Vietnamese subset)
   - Embed vào PDF
8. [ ] Layout PDF:
   ```
   Header: "HÓA ĐƠN TIỀN PHÒNG"
   Tháng/năm
   ─────────────────────────
   Phòng:
   Người ở:
   Ngày tạo:
   Hạn đóng:
   ─────────────────────────
   Tiền phòng:
   Điện (X kWh × Y):
   Nước (...):
   Phí rác:
   ...
   ─────────────────────────
   TỔNG:
   ─────────────────────────
   Ghi chú:
   ```
9. [ ] API route generate PDF stream
10. [ ] Nút "Xuất PDF" gọi API, download file

### Phần 3: Báo cáo (3 giờ)
11. [ ] Query aggregate SQL:
   - SUM(paid_amount) FROM invoices WHERE paid_at BETWEEN
   - SUM(amount) FROM expenses WHERE expense_date BETWEEN
   - GROUP BY room, GROUP BY expense_type
12. [ ] Trang `/admin/finance/report`:
   - DateRangePicker (shadcn calendar)
   - Server fetch report
13. [ ] StatCards component (4 thẻ số)
14. [ ] Charts: dùng recharts hoặc tự vẽ với CSS
15. [ ] Tabs Thu/Chi với bảng chi tiết
16. [ ] Format tiếng Việt: ngày dd/mm/yyyy, số 1,000,000 VNĐ

---

## ✅ 3. CHECK

- [ ] Build pass
- [ ] PDF mở được, hiển thị tiếng Việt có dấu đầy đủ
- [ ] PDF in ra giấy đọc được, font không bị thiếu
- [ ] Báo cáo tính đúng (test với data có sẵn)
- [ ] Date range filter hoạt động
- [ ] Mobile: trang report có responsive (admin chủ yếu dùng desktop nhưng vẫn cần dùng được mobile)
- [ ] Tiếng Việt 100%

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/usecase-thu-chi.md` (UC-12, UC-13, UC-14)

Đối chiếu:
- UC-12: expenses có room_id nullable, type 5 loại, biên lai optional → OK chưa?
- UC-13: filter khoảng thời gian (không phải tháng cố định)
- UC-13: breakdown theo phòng + theo loại chi
- UC-13: hiện hóa đơn chưa thu (overdue)
- UC-14: PDF format đơn giản, không cần chuẩn VN
- UC-13: KHÔNG cần export Excel/CSV

---

## 🧪 5. VERIFY

### Test Case 1: Thêm chi phí sửa chữa
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Vào /admin/finance/expenses, click "Thêm" | Form mở | ⬜ |
| 2 | Type=Sửa chữa, Room=Toàn nhà, 1,500,000, ngày hôm nay | OK | ⬜ |
| 3 | Upload 1 ảnh biên lai | Preview OK | ⬜ |
| 4 | Lưu | Toast, card mới | ⬜ |
| 5 | Filter: type=Sửa chữa | Hiển thị đúng | ⬜ |
| 6 | Thêm expense không upload biên lai | OK (optional) | ⬜ |

### Test Case 2: Xuất PDF hóa đơn
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Vào /admin/finance/invoices/[id] | Trang chi tiết | ⬜ |
| 2 | Click "Xuất PDF" | Download file | ⬜ |
| 3 | Mở PDF | Đầy đủ thông tin, tiếng Việt có dấu | ⬜ |
| 4 | Kiểm tra tên file | hoa-don-phong-201-thang-10-2026.pdf | ⬜ |
| 5 | In thử ra giấy | Đẹp, đọc được | ⬜ |

### Test Case 3: Báo cáo thu chi
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Vào /admin/finance/report | Default tháng hiện tại | ⬜ |
| 2 | Chọn từ 01/09 đến 31/10/2026 | Số liệu update | ⬜ |
| 3 | Card "Tổng thu" | Khớp với SUM paid_amount tháng đó | ⬜ |
| 4 | Card "Tổng chi" | Khớp với SUM expenses | ⬜ |
| 5 | Card "Lợi nhuận" | Thu - Chi | ⬜ |
| 6 | Card "Chưa thu" | Đếm + tổng tiền invoices unpaid + due_date < today | ⬜ |
| 7 | Breakdown theo phòng | 4 phòng có số liệu | ⬜ |
| 8 | Breakdown theo loại chi | Đúng % | ⬜ |
| 9 | Tab "Thu" | List invoices đã thu | ⬜ |
| 10 | Tab "Chi" | List expenses | ⬜ |

### Test Case 4: Filter phòng trong báo cáo
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Filter phòng 101 | Chỉ hiện thu chi liên quan phòng 101 | ⬜ |
| 2 | Expenses "Toàn nhà" có hiện không? | Đề xuất: hiện (vì ảnh hưởng tất cả phòng) | ⬜ |

### Test Case 5: PDF với phụ phí
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Hóa đơn có extra_items: "Sửa quạt 50,000" | OK | ⬜ |
| 2 | Xuất PDF | Có dòng "Sửa quạt: 50,000" trong breakdown | ⬜ |

### Edge cases
- [ ] Báo cáo khoảng 1 ngày (from = to) → có chạy không?
- [ ] Khoảng quá rộng (10 năm) → có timeout không?
- [ ] PDF hóa đơn có ký tự đặc biệt trong note (vd: ‹ ›) → render OK?
- [ ] Xóa expense đã hơn 1 năm → cho phép?

---

## 👀 6. HUMAN REVIEW
- [x] **Cần review** — PDF + báo cáo tổng kết module Thu chi

Cần xem:
- [ ] PDF có in ra giấy đẹp không?
- [ ] Báo cáo có dễ đọc, đủ thông tin admin cần?
- [ ] Performance query aggregate có chậm khi data nhiều không?

---

## 🎬 7. ACT

### Bài học rút ra
- **Font Việt cho PDF cần register thủ công** — `@react-pdf/renderer` không có font Việt sẵn. Cần TTF trong `public/fonts/` (BeVietnamPro-Regular + Bold) + register qua [lib/pdf/fonts.ts](lib/pdf/fonts.ts) trước khi render → diacritics đầy đủ trong PDF.
- **Aggregate report nên tách `lib/db/finance-report.ts` riêng** — không pha trộn với `lib/db/invoices.ts` hay `expenses.ts`, vì query khác biệt (SUM/GROUP BY theo room/type/time range) và scope chỉ dành cho route báo cáo.
- **Module kết thúc → là điểm tốt để retrospective + sinh skill** — pattern lặp lại qua T-013, T-014, T-015 đủ để rút skill `data-layer-pattern.md` + `server-action-pattern.md` (đã ghi trong action items retrospective).

### Cải tiến cho task sau
- [ ] Sau task này, module Thu chi hoàn thành — đây là điểm tốt để VIẾT SKILLS:
   - skill `supabase-data-layer.md` (từ T-004, T-007, T-013)
   - skill `ui-component-pattern.md` (từ T-005, T-008, T-013, T-014)
   - skill `report-aggregate.md` (mới có pattern từ T-015)

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.015-bao-cao-pdf.md` → `done.015-bao-cao-pdf.md`
2. Commit: `done: T-015 báo cáo + PDF + expenses`
3. 🎉 **Module Thu chi hoàn thành!**
4. Task tiếp: Module Giấy tờ (T-016+) hoặc viết skills retrospective
