# T-038 — Dashboard "Việc cần làm hôm nay" widget

## P — Plan
**Requirements §4**: "Danh sách việc cần làm hôm nay (nhắc lịch, thu tiền...)"

Aggregate 4 nguồn việc cho **owner dashboard**:
1. Số hóa đơn quá hạn (has_debt=true) + tổng tiền chưa thu
2. Move requests pending (status='pending')
3. Payment proofs pending (status='pending')
4. Hôm nay là `meter_reading_day` → đến hạn chốt chỉ số

**Trong scope:**
- Component `components/dashboard/TodayTasksWidget.tsx`
- Data fetch trong `app/dashboard/page.tsx` (owner branch)
- Render giữa stats row và tabs trong OwnerDashboard

**Ngoài scope:**
- Contract renewal reminder (defer T-042 — cần schema mới)
- Tenant widget riêng (requirements chỉ nhắc cho chủ trọ)

## D — Do
1. Tạo component `TodayTasksWidget` (client component, pure UI)
2. Server fetch trong dashboard/page.tsx
3. Pass props vào OwnerDashboard
4. OwnerDashboard render widget

## C — Check
- tsc pass
- build pass
- 12-pattern audit: chỉ stats query đơn giản, không có concerns

## E — Phase E (smoke)
- Login owner → /dashboard
- Verify widget hiện 4 dòng với count đúng
- Click 1 dòng → navigate đúng route

## A — Act
- Commit + FF merge main + push
