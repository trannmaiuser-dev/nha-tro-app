# T-016c Progress — Hotfix legacy API routes + login link UI

Branch: claude/upbeat-cori-d3cfd5 (push lên feature/t016-multi-tenant)
Bắt đầu: 2026-05-16

## Audit BƯỚC 1 — tenant_id usage trong app/

**Phải fix (UPDATE direct):** 1 file
- `app/api/owner/create-tenant/route.ts:55` — UPDATE rooms.tenant_id → DELETE per D21

**Giữ nguyên (legacy compat — Category B):**
- `app/admin/finance/invoices/[id]/export/route.ts` — nested join `tenant:users!tenant_id`
- `app/admin/finance/invoices/[id]/page.tsx` — nested join
- `app/dashboard/page.tsx` — owner branch reads tenant_id (Phase C dual-write giữ nguyên)

**Giữ nguyên (đọc room qua tenant_id — sẽ fix trong T-016b khi drop column):**
- `app/api/owner/bulk-remind/route.ts` — query rooms by tenant_id
- `app/tenant/move-out/actions.ts`, `app/tenant/guests/actions.ts` — find user's room
- `app/profile/[userId]/page.tsx`, `app/profile/page.tsx` — find user's room

**Không liên quan rooms.tenant_id (cột tenant_id của bảng khác):**
- `app/api/profile/save/route.ts`, `app/api/profile/get/route.ts`, `app/api/profile/[userId]/route.ts` — tenant_documents.tenant_id, emergency_contacts.tenant_id, related_persons.tenant_id (FK tới tenant_profiles.id, không phải users)
- `app/profile/setup/page.tsx` — same
- `app/tenant/payments/actions.ts` — payment_proofs.tenant_id

→ Scope T-016c: chỉ delete 1 file legacy + migrate caller.

## Checklist

- [✅] Audit BƯỚC 1 (đã liệt kê trên)
- [✅] Tạo task/todo/todo.016c + memory/t016c-progress.md
- [✅] lib/utils/password.ts (genTempPassword 8 ký tự, bỏ 0/O/1/I/l)
- [✅] lib/schemas/tenant.ts (id_card_number optional — D22)
- [✅] lib/db/tenants.ts (genTempPassword + idCardNumber optional, void unused)
- [✅] app/admin/tenants/actions.ts (return loginLink + roomName + expiresAt — D20)
- [✅] components/tenants/AddTenantDialog.tsx (loginLink box xanh dương, CCCD optional, copy all)
- [✅] components/CreateTenantModal.tsx (migrate sang server action — D23, validate 10-digit phone)
- [✅] Delete app/api/owner/create-tenant/route.ts (D21) — `git rm`
- [✅] tsc --noEmit exit 0 (đã clean .next cache)
- [⬜] Commit + push
