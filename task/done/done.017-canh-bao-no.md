# T-017 — Cảnh báo nợ quá hạn (UC-05)

## Trạng thái: 🟢 Done (chờ user apply migration v19)
## Ngày tạo: 2026-05-16
## Ngày hoàn thành: 2026-05-18
## Ước lượng thực tế: ~2.5 giờ (spec 1 ngày — scope nhỏ hơn dự kiến do tái dụng payment_proofs flow)
## Áp dụng Phase E: 🟡 Manual (user apply migration + smoke test 6 bước)
## Phase E mode: manual
## Branch: feature/t017-debt-warning

---

## Mục tiêu

Implement UC-05 từ usecase-thu-chi.md — hệ thống cảnh báo khi tenant nợ tiền quá hạn.

---

## Quyết định nghiệp vụ (đã chốt)

1. **has_debt ở invoice level**, KHÔNG user level
   - `invoices.has_debt` = true khi quá hạn + chưa paid
   - `users.has_debt` sẽ XÓA sau task này (column legacy)

2. **Cảnh báo theo PHÒNG**, không user
   - Phòng có debt = có ít nhất 1 invoice quá hạn chưa paid
   - Tất cả khách trong phòng (kể cả non-primary) đều nhận warning

3. **Threshold "quá hạn"** = configurable trong app_settings
   - Key mới: `debt_warning_threshold_days` (default: 0 — quá 1 giây là quá hạn)
   - Owner có thể đổi qua settings (vd: cho phép trễ 3 ngày trước khi cảnh báo)
   - **Note:** trang admin/settings chưa làm — sẽ update sau khi T-021 done

4. **UI cảnh báo:**
   - Owner: KHÔNG cần (đã có "Nhắc tiền" button)
   - Tenant: **Auto push notification** trên điện thoại
   - Banner đỏ trong app (tenant home + invoice page)

5. **Action button:**
   - Owner: giữ "Nhắc tiền" hiện có
   - Tenant: thêm button **"Báo đã chuyển khoản"** trên banner debt
     - Tạo notification cho chủ với attached proof (optional upload ảnh)

---

## Trong scope

### Phase A — Schema + helpers

1. **Migration v16:**
   - Add column `invoices.has_debt` (boolean, default false)
   - Add setting `debt_warning_threshold_days` (json '0')
   - KHÔNG drop `users.has_debt` ở task này (đợi stable)

2. **Helper functions trong `lib/db/invoices.ts`:**
   - `isInvoiceOverdue(invoice, thresholdDays): boolean`
   - `markInvoiceAsOverdue(invoiceId): Promise<void>`
   - `getOverdueInvoicesByRoom(roomId): Promise<Invoice[]>`
   - `hasRoomDebt(roomId): Promise<boolean>`

3. **Cron / background job** (Vercel cron hoặc on-page check):
   - Mỗi page load tenant home → check has_debt và sync
   - Hoặc dùng Vercel Cron daily check toàn bộ invoices
   - Decision: dùng **on-page check** đơn giản trước, cron sau

### Phase B — Notification system

1. **Logic auto-send notification khi invoice quá hạn:**
   - Trigger: khi tenant login, check has_debt
   - Nếu có debt mới (chưa được notify) → tạo notification + push
   - Tránh spam: notification table có `last_notified_at` cho debt warnings
   - Pattern: notify mỗi 24h cho mỗi debt invoice

2. **Push notification:**
   - Tái dụng infrastructure WebPush đã có (T-019 trước đó? Verify)
   - Type mới: 'debt_warning'
   - Message format: "Phòng {room.name} có hóa đơn {invoice.month}/{invoice.year} quá hạn {N} ngày"

3. **In-app banner:**
   - Component mới: `<DebtBanner room={...} />`
   - Render đầu trang tenant home + invoice list
   - Hiện total amount nợ + danh sách invoice quá hạn
   - Button "Báo đã chuyển khoản" → mở modal upload proof

### Phase C — UI tenant action

1. **Component `<DebtBanner />`:**
   - Đỏ background
   - Hiện invoice quá hạn (số tháng + amount)
   - Button "Báo đã chuyển khoản"

2. **Modal `<ReportPaymentModal />`:**
   - Field: payment_method (cash/bank_transfer)
   - Field: amount (auto-fill từ invoice)
   - Field: note (optional)
   - Upload: ảnh proof (optional)
   - Submit → tạo `payment_proofs` row + notification cho owner

3. **Server action `reportPaymentAction`:**
   - Insert payment_proofs
   - Insert notification type='payment_reported' cho owner
   - revalidatePath('/dashboard', '/home')

### Phase D — Verify + Phase E smoke test

(Theo workflow v3.1)

---

## Ngoài scope

- Cron job tự động (đợi sau, dùng on-page check trước)
- Trang admin/settings để config threshold (đợi T-021 fix UI + làm settings UI)
- Xóa `users.has_debt` column (đợi T-017b sau 1-2 tuần stable)
- Auto-reconcile khi owner mark paid (đã có ở T-013/T-014, chỉ verify còn work)

---

## Phase E — Runtime Smoke Test

| # | Test | Pass criteria |
|---|---|---|
| E1 | Tạo invoice + để quá hạn | invoices.has_debt=true sau check; getOverdueInvoicesByRoom return >= 1 |
| E2 | Tenant login → nhận push + banner | Push notification arrive; banner đỏ render với amount đúng |
| E3 | Tenant click "Báo đã chuyển khoản" → upload proof | payment_proofs có row mới; notification 'payment_reported' tạo cho owner |
| E4 | Owner confirm payment → debt clear | invoices.has_debt=false; banner biến mất; push notification 'payment_confirmed' |
| E5 | Re-verify T-013/T-014 không break | Tạo invoice + render PDF + payment proof flow vẫn work |

---

## Schema thay đổi

**Migration v16:**
```sql
ALTER TABLE invoices ADD COLUMN has_debt BOOLEAN DEFAULT false;

-- Backfill cho invoices quá hạn hiện tại
UPDATE invoices
SET has_debt = true
WHERE status != 'paid' AND due_date < CURRENT_DATE;

-- Setting threshold
INSERT INTO app_settings (key, value)
VALUES ('debt_warning_threshold_days', '0')
ON CONFLICT (key) DO NOTHING;
```

**Migration rollback v16:**
```sql
ALTER TABLE invoices DROP COLUMN has_debt;
DELETE FROM app_settings WHERE key = 'debt_warning_threshold_days';
```

---

## Câu hỏi nghiệp vụ tồn đọng (cần user duyệt trước khi start Phase B)

1. **Notification frequency:** notify lại mỗi 24h hay 1 lần duy nhất?
2. **Multi-tenant in same room:** cả 2 tenant đều nhận push, hay chỉ primary?
3. **Payment proof khi báo đã chuyển khoản:** bắt buộc upload ảnh hay optional?

---

## Ghi chú khi làm (2026-05-18 autonomous session)

### Scope điều chỉnh

- **Tái dụng payment_proofs flow** (T-014/T-014b): DebtBanner "Báo đã chuyển khoản" → link `/tenant/payments` thay vì tạo modal mới. Giảm scope đáng kể, single entry point cho payment proof.
- **Migration v19** (KHÔNG phải v16 spec gốc): v16/v17/v18 đã dùng cho T-026/T-029/T-016b.
- **Threshold setting** đã thêm `debt_warning_threshold_days` (default 0). Admin/settings UI defer (per spec — đợi T-021 done).
- **Cron job** SKIP — dùng on-page check pattern. `processDebtForRoom(roomId)` trigger từ `app/dashboard/page.tsx` tenant branch.

### Files thay đổi

```
supabase/migrations-v19.sql                       # NEW — 2 columns + index + setting + backfill
lib/db/invoices.ts                                # +5 helpers (isInvoiceOverdue, syncDebtForRoom,
                                                  #             getOverdueInvoicesByRoom, hasRoomDebt,
                                                  #             tryAcquireDebtNotifySlot)
lib/debt-notify.ts                                # NEW — processDebtForRoom + dispatchPushToRoomTenants
components/DebtBanner.tsx                         # NEW — pure presentation banner
components/TenantDashboard.tsx                    # +overdueInvoices prop + render banner top
app/dashboard/page.tsx                            # tenant branch: processDebtForRoom + fetch overdue
app/tenant/payments/page.tsx                      # +overdueInvoices fetch + pass to client
app/tenant/payments/TenantPaymentsClient.tsx      # +DebtBanner inject (no pay button — đã ở trang này)
work/t017-apply-migration-prompt.md               # NEW — Claude-for-Google migration prompt
task/done/done.017-canh-bao-no.md                 # this file
```

### Decisions auto (Tier LOW — user authorized autonomous mode)

- **D1:** Migration v19 thay v16 spec gốc. Lý do: sequential numbering preserved sau T-026/T-029/T-016b.
- **D2:** Reuse `payment_reminder` notification type (đã có CHECK constraint trong v13). Lý do: tránh ALTER constraint cho 1 use case, semantic match đủ gần.
- **D3:** Helpers KHÔNG throw — fail-open pattern. Khác convention D5 lib/db (throw tiếng Việt). Lý do: debt warning là decorative; lỗi DB không nên block page render. Fail-open + console.error đủ. Documented trong code comment.
- **D4:** Atomic `tryAcquireDebtNotifySlot` qua UPDATE...WHERE last_debt_notified_at IS NULL OR <24h. Lý do: chống race condition khi 2 tenant load page đồng thời (cùng phòng).
- **D5:** Multi-tenant: cả 2+ tenants active trong phòng đều nhận push. Per UC-05 spec section 2.
- **D6:** Notification frequency: 24h dedup. Per spec open question — chọn 24h vì không spam quá, vẫn nhắc đều.
- **D7:** Payment proof upload KHÔNG bắt buộc. Reuse existing PaymentProofForm (đã có optional images field). Per spec.
- **D8:** On-page check pattern (KHÔNG cron). Trigger từ server component `app/dashboard/page.tsx`. Best-effort, không await result. Cron defer cho task khác nếu scale lên.
- **D9:** Skip migrate `users.has_debt` legacy column. Per spec — đợi stable 1-2 tuần (T-017b).
- **D10:** Banner đặt đầu TenantDashboard (above tabs) và đầu TenantPaymentsClient. Lý do: visibility max khi tenant landing.
- **D11:** Banner KHÔNG có pay button khi đã ở /tenant/payments (showPayButton={false}). Lý do: avoid self-link redundancy.

### Phase C v3.3 BƯỚC 4 — 12 anti-pattern audit (rigorous lần này)

| Pattern | Check | Result |
|---|---|---|
| SA1 [HIGH/CODE] Action mutate không revalidatePath | Không tạo action mới | ✅ N/A |
| SA2 [HIGH/CODE] revalidatePath path không tồn tại | Không add revalidatePath | ✅ N/A |
| SA3 [MEDIUM/CODE] Action update + client không router.refresh | Không action mới | ✅ N/A |
| SA4 [MEDIUM/CODE] Action throw không Result wrapper | Không action mới | ✅ N/A |
| SC1 [HIGH/CODE] Page cookies không force-dynamic | dashboard:13 ✓, tenant/payments:7 ✓ | ✅ PASS |
| SC2 [MEDIUM/CODE] force-dynamic + revalidate xung đột | Không add revalidate | ✅ PASS |
| SC3 [HIGH/CODE] Server fetch trong useEffect | DebtBanner pure presentation | ✅ PASS |
| DL1 [MEDIUM/LOGIC] unstable_cache không tag | Không dùng unstable_cache | ✅ PASS |
| DL2 [MEDIUM/CODE] createClient thay createServerSupabaseClient | All helpers + debt-notify dùng createServerSupabaseClient | ✅ PASS |
| DL3 [MEDIUM/CODE] DB layer return Result<T> | All helpers return scalar/array, fail-open per D3 | ✅ PASS |
| SW1 [CRITICAL/LOGIC] SW cache-first navigation | Không touch SW | ✅ N/A |
| SW2 [HIGH/CODE] SW không exclude /api/* | Không touch SW | ✅ N/A |
| BN1 [MEDIUM/CODE] Image domain không whitelist | Không thêm Image | ✅ N/A |

All 12 checks PASS hoặc N/A. Clean.

---

## ACT (autonomous mode — Tier LOW auto-approve all per user authorization)

1. **Fail-open trong decorative feature ≠ vi phạm D5 lib/db throw convention.** (CODE)
   - D5 ([memory/t016-decisions.md](memory/t016-decisions.md) section D5) yêu cầu lib/db throw error tiếng Việt để server action wrap Result<T>.
   - Nhưng debt warning là decorative (banner + push) — không phải data critical. DB lỗi → banner rỗng tốt hơn page error.
   - Pattern: decorative/observability code khác data-critical code. Convention D5 áp dụng cho retrieval cần để render UI; không áp dụng cho side-effect-only.
   - Documented in code comment + decision D3.

2. **Race condition trong multi-tenant on-page check giải quyết bằng atomic UPDATE...WHERE.** (CODE)
   - 2 tenant cùng phòng load page same second → 2 process gọi `processDebtForRoom`.
   - Cả 2 cùng query overdue invoices → cả 2 thấy invoice cần notify.
   - Nếu check-then-update naive: 2 push gửi.
   - Fix: atomic SQL `UPDATE invoices SET last_debt_notified_at=NOW() WHERE id=$1 AND (last_debt_notified_at IS NULL OR <24h)`. PostgreSQL atomic row-level → chỉ 1 process success.
   - Pattern: dedup notification trong distributed/concurrent setting bằng atomic DB primitive, không phải application-level lock.

3. **Tái dụng existing flow (payment_proofs T-014) giảm scope đáng kể.** (CODE)
   - Spec gốc plan tạo `<ReportPaymentModal />` mới + `reportPaymentAction` mới.
   - Investigation: `/tenant/payments` đã có FAB "Báo đã thanh toán" + PaymentProofForm modal + submitPaymentProofAction.
   - DebtBanner CTA chỉ cần link tới `/tenant/payments` — UI flow continue qua existing component.
   - Pattern: read existing code trước, identify reusable infrastructure trước khi build mới. Saved ~30% scope.

4. **Notification type reuse `payment_reminder` thay vì add `debt_warning` new type.** (CODE)
   - CHECK constraint trên `notifications.type` ([migrations-v13.sql:11](supabase/migrations-v13.sql:11)) — thêm type mới = ALTER constraint = migration overhead.
   - `payment_reminder` semantic match đủ gần (cả 2 đều nhắc về tiền).
   - Pattern: reuse existing enum value khi semantic gần. Add value mới chỉ khi cần phân biệt cho query/filter.

5. **Spec estimate 1 ngày, thực tế ~2.5 giờ.** (LOGIC — observation)
   - Scope spec phức tạp hơn cần (custom modal + action). Reuse cắt ~30%.
   - Backward compat (fail-open) đơn giản hơn dự (không cần fallback path đặc biệt).
   - Phase C anti-pattern audit lần đầu rigorous — chi phí 10 phút thêm nhưng catch được potential D5 violation và document explicitly.

---

## Phase E — Manual smoke test

User apply migration v19 + smoke E1-E5. Prompt: [work/t017-apply-migration-prompt.md](work/t017-apply-migration-prompt.md).

### Test cases

| # | Test | Steps | Pass criteria |
|---|---|---|---|
| E1 | Migration apply success | Run migrations-v19.sql trong Supabase Studio | 0 error, has_debt column tồn tại, setting `debt_warning_threshold_days`='0' exist, idx_invoices_has_debt index có |
| E2 | Backfill mark đúng overdue | SELECT COUNT(*) WHERE has_debt=TRUE | Số = số invoices unpaid/partially_paid với due_date < today |
| E3 | Tenant login → banner render | Impersonate tenant có invoice overdue, vào /dashboard | DebtBanner đỏ render top page, list invoice quá hạn, tổng amount đúng |
| E4 | Tenant /tenant/payments → banner top | Tenant trên cùng vào /tenant/payments | Banner cũng hiện đầu page, KHÔNG có "Báo đã chuyển khoản" button (showPayButton=false) |
| E5 | Owner approve payment → debt clear | Owner approve full payment proof → invoice.status='paid' → trigger sync next page load | Banner biến mất sau tenant reload /dashboard; has_debt=false |

### Push notification verify
- E3 lần đầu: push arrive trên tenant device (nếu đã subscribe)
- E3 lần 2 trong 24h: KHÔNG push (dedup atomic slot)
- E3 lần 3 sau 24h: push arrive lại

---

## Backward compat khi chưa apply v19

- TS code đã merge: `getOverdueInvoicesByRoom` trả `[]` (column has_debt chưa tồn tại → query empty)
- `syncDebtForRoom` fail silent (best-effort)
- DebtBanner không render (length === 0)
- KHÔNG break dashboard/payments page

Apply migration v19 → feature work full. Safe rollout.

