# T-044 — UI Mobile Audit Findings

**Viewport**: 390×844 (iPhone 12/13/14)
**Date**: 2026-05-19
**Tester**: Claude autonomous via Chrome DevTools MCP
**Total pages audited**: 23 (17 owner + 6 tenant)

## Summary

| Status | Count | Pages |
|---|---|---|
| ✅ PASS | 21 | All except utilities + invoices |
| 🔴 FAIL → FIXED | 2 | /admin/utilities, /admin/finance/invoices |

## Method

Per page:
1. Emulate mobile 390×844 DPR 3 + touch
2. Run JS audit: `document.scrollWidth > viewport.w` + scan elements with `right > viewport.w + 1`
3. Visual screenshot
4. Record issues

## Results

### Owner pages (17 total)

| Route | scrollW | offenders | Status |
|---|---|---|---|
| /dashboard | 390 | 0 | ✅ |
| /rooms | 390 | 0 | ✅ |
| /admin/tenants | 390 | 1 (scrollable filter tabs — intentional) | ✅ |
| /admin/chat-groups | 390 | 0 | ✅ |
| /admin/documents | 390 | 8 (scrollable category tabs — intentional) | ✅ |
| /admin/guests | 390 | 0 | ✅ |
| /admin/move-requests | 390 | 0 | ✅ |
| /admin/settings | 390 | 0 | ✅ |
| /admin/utilities | 390 | 17 (table inside overflow-x-auto wrapper) | 🔴 → ✅ FIXED |
| /admin/finance/expenses | 390 | 0 | ✅ |
| /admin/finance/invoices | 390 | 18 (table 601px wide) | 🔴 → ✅ FIXED |
| /admin/finance/payments | 390 | 0 | ✅ |
| /admin/finance/report | 390 | 0 | ✅ |
| /notifications | 390 | 0 | ✅ |
| /profile | 390 | 0 | ✅ |
| /community | 390 | 0 | ✅ |
| /chat | 390 | 0 | ✅ |

### Tenant pages (6 total)

| Route | scrollW | offenders | Status |
|---|---|---|---|
| /dashboard (tenant) | 390 | 0 | ✅ |
| /tenant/payments | 390 | 0 | ✅ |
| /tenant/move-out | 390 | 0 | ✅ |
| /tenant/guests | 390 | 0 | ✅ |
| /tenant/documents | 390 | 0 | ✅ |
| /tenant/change-password | 390 | 0 | ✅ |
| /chat-groups | 390 | 0 | ✅ |

## Issues found + fixes

### 🔴→✅ /admin/utilities

**Issues**:
1. Header crammed: title "Chỉ số điện nước" wraps 2 lines + overlaps month picker
2. Table 5-7 cột (Phòng, Số cũ kWh, Số mới kWh, Tiêu thụ, [Nước cũ, Nước mới], Trạng thái) — cột cuối "Trạng thái" bị cắt mất, user phải scroll horizontal

**Fix** ([app/admin/utilities/page.tsx](../app/admin/utilities/page.tsx)):
- Header: `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` → stack mobile, row tablet+
- Title `truncate` + container `min-w-0`

**Fix** ([app/admin/utilities/MeterReadingTable.tsx](../app/admin/utilities/MeterReadingTable.tsx)):
- Added mobile card view (`md:hidden`) — 1 card per room, all fields stacked vertically với label rõ
- Desktop table giữ nguyên (`hidden md:block`)

**Verify**: 0 offenders sau fix, screenshot rõ ràng.

### 🔴→✅ /admin/finance/invoices

**Issues**:
1. Header crammed (same pattern)
2. Table 7 cột (Phòng, Tháng, Tổng, Đã trả, Trạng thái, Hạn, Actions) — width 601px trong viewport 390px

**Fix** ([app/admin/finance/invoices/page.tsx](../app/admin/finance/invoices/page.tsx)):
- Header: same `flex-col gap-3 sm:flex-row` pattern

**Fix** ([app/admin/finance/invoices/InvoiceList.tsx](../app/admin/finance/invoices/InvoiceList.tsx)):
- Mobile card view: "Phòng + Tháng + Hạn" header row, "Tổng/Đã trả" inline, status badge top-right, actions row "Xem chi tiết" full-width + delete icon
- Desktop table giữ nguyên (`hidden md:block`)

**Verify**: 0 offenders, "Chưa thanh toán" badge hiện đầy đủ.

## Sticky element overview (cross-page)

Per page typical sticky elements:
- Header `<header>` 76px (sticky top)
- Bottom nav `<nav>` 60px (sticky bottom)
- Total reserved chrome: ~136px → ~708px visible content area

Padding bottom `pb-24` (96px) consistent across pages → no nav overlap.

## Recommendations (defer — optional polish)

- **`/admin/finance/expenses`** dùng cùng table pattern. Hiện không có data nên audit không thấy issue — nếu thêm data nhiều cột tương lai, apply mobile card pattern luôn.
- **`/admin/utilities` desktop fallback** vẫn dùng table cũ. Có thể consolidate khi refactor.
- **Touch target audit**: chưa kiểm 44×44px minimum cho từng button — visual ok ở screenshots.

## Screenshots

Saved tại [work/t044-screenshots/](.):
- `admin-utilities.jpeg` (before fix)
- `admin-utilities-after.jpeg` (after fix)
- `admin-finance-invoices.jpeg` (before fix)
- `admin-finance-invoices-after.jpeg` (after fix)
