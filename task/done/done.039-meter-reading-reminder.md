# T-039 — Notify chốt chỉ số điện nước tháng X

## P — Plan
**UC-08 usecase-thu-chi**: "Đến ngày `meter_reading_day` → hệ thống gửi notification 'Đến hạn chốt chỉ số tháng X'."

**Approach**: on-page check (giống T-017 processDebtForRoom) thay vì cron — không cần Vercel cron deploy + match scaleup pattern hiện có.

**Dedup**: `app_settings.last_meter_reading_notify_ym` = "YYYY-MM".

**DB type**: tái dụng `'payment_reminder'` (semantic gần). Push data.type='meter_reading_reminder' để client phân biệt. Pattern T-037 D1.

## D — Do
- `lib/meter-notify.ts` — `notifyMeterReadingIfDue(ownerId)` best-effort
- `app/dashboard/page.tsx` (owner branch) — gọi trước khi fetch todayTasks

## C — Check
- tsc + build pass
- Idempotent qua dedup key
- Sender = ownerId (avoid NULL constraint)

## E — Phase E
1. Set `meter_reading_day = today` via service role
2. Clear `last_meter_reading_notify_ym`
3. Impersonate owner → /dashboard
4. Verify: bell badge +1, notification "🔧 Đến hạn chốt chỉ số điện nước tháng X/Y", widget "Hôm nay (ngày N) là hạn chốt chỉ số điện nước"
5. Cleanup: restore default day=1, delete notif

**Result**: PASS — notif inserted "payment_reminder | 🔧 Đến hạn chốt chỉ số điện nước tháng 5/2026"

## A — Act
- Commit + FF merge main + push
