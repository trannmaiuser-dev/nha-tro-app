# T-042 — Nhắc gia hạn hợp đồng

## P — Plan
**Requirements §3.5**: "Nhắc gia hạn hợp đồng sắp hết hạn".

**Schema**: hợp đồng theo từng người (user trả lời) → `room_tenants.contract_end_date DATE NULL` (per active membership).

**Detection**: on-page check khi owner load /dashboard. Query active membership có `contract_end_date <= today + 30d`. Dedup 1 notification/tháng.

**Notification type**: `contract_renewal_reminder` (mới thêm migration v22).

**UI**: owner click "Đặt ngày hết hạn hợp đồng" trên TenantCard → EditContractDialog (date picker + xóa).

## D — Do
- supabase/migrations-v22.sql:
  - ALTER notifications.sender_id DROP NOT NULL (cleanup latent T-017 bug)
  - Extend type CHECK: add `meter_reading_reminder`, `contract_renewal_reminder`
  - ADD COLUMN room_tenants.contract_end_date DATE NULL
  - Partial index cho fast "due soon" lookup
- work/t042-apply-migration-prompt.md — Claude-for-Google paste prompt
- lib/contract-notify.ts — `notifyContractsExpiringSoon(ownerId)` best-effort
- app/admin/tenants/actions.ts — `setContractEndDateAction(membershipId, dateStr)`
- lib/db/tenants.ts — extend `TenantRow.active_membership`, getAllTenants query
- components/tenants/TenantCard.tsx — contract badge + edit button
- components/tenants/EditContractDialog.tsx — date picker modal
- app/dashboard/page.tsx — call notifyContractsExpiringSoon trong owner branch

## C — Check
- tsc + build pass
- Sender ID dùng ownerId (avoid NULL — backward compat với schema cũ)
- Badge tone: red ≤7d, orange ≤30d, gray rest

## E — Phase E (smoke)
**Prerequisite**: apply migration v22 (xem work/t042-apply-migration-prompt.md).

1. Apply migration v22 qua Supabase Studio
2. Restart dev server
3. Impersonate owner → /admin/tenants → click "Đặt ngày hết hạn hợp đồng" cho test1
4. Set date = today + 20 days → save
5. Verify badge "📅 Hợp đồng còn 20 ngày" hiện
6. Impersonate owner → /dashboard
7. Verify bell badge +1 + notification "📅 1 hợp đồng sắp hết hạn trong 30 ngày tới: ..."
8. Cleanup: clear contract_end_date qua dialog "Xóa ngày"

## A — Act
- Commit + FF merge main + push
- **MIGRATION v22 PENDING APPLY** — runtime smoke phụ thuộc user apply
