# T-027 — Batch fix MEDIUM từ audit T-024

## Trạng thái: 🟢 Done
## Ngày tạo: 2026-05-18
## Ngày hoàn thành: 2026-05-18
## Ước lượng: 45-60 phút
## Áp dụng Phase E: ⏭️ Skipped (batch fix precedent-based per T-024 audit recommendations, low risk)
## Phase E mode: auto (defer execution — files seed/verify đã trong T-021 + T-025)
## Branch: feature/t027-batch-medium-audit

## Bối cảnh
T-025 đã fix HIGH/CODE từ T-024 audit. T-027 fix MEDIUM Phase 3 batch — pattern straightforward, có precedent rõ.

## Trong scope (Phase 3 audit T-024)

### Issue #3b MEDIUM — 4 page force-dynamic
- `app/profile/page.tsx`
- `app/profile/setup/page.tsx`
- `app/profile/[userId]/page.tsx`
- `app/community/page.tsx`

### Issue #7 — updateProfileAction revalidate `/admin/tenants`
- `app/tenant/profile/actions.ts`: cross-role profile change → admin tenant list stale
- Apply cho `updateProfileAction`, `addEmergencyContactAction`, `addBankAccountAction`, `completeProfileAction`

### Issue #8 — createGuestAction revalidate `/notifications`
- `app/tenant/guests/actions.ts`: tenant create guest → admin notification stale

### Issue #9 — rooms/actions.ts revalidate `/dashboard` + `/home`
- `app/rooms/actions.ts`: CRUD phòng → owner dashboard/home room list stale

### Issue #10 — finance/payments approve revalidate `/dashboard`
- `app/admin/finance/payments/actions.ts`: payment approve → dashboard payment status stale

### Issue #11 — admin/move-requests router.refresh()
- `app/admin/move-requests/page.tsx`: client component sau action chỉ update local, không gọi router.refresh()
- Pattern reference: `app/admin/finance/payments/PaymentReviewCard.tsx:37,45,53`

### Issue #14 — utilities + settings revalidate `/admin/finance/report`
- `app/admin/utilities/actions.ts`: saveMeterReadings → report stale
- `app/admin/settings/actions.ts`: updateSettings (electricity_rate) → report stale

## Ngoài scope
- Issue #6 transactional wrap (LOGIC, T-026)
- Issue #12 SW CACHE auto-bump (defer)
- Issue #13 tag-based caching (architectural future)
- Issue #15 error logging (observability future)
- Bonus #2-3 security audit (future)

## ACT

1. **Audit pre-investigate giảm scope batch fix.** (CODE)
   3/7 issue đã có ở T-021 trước đó (Issue #9 rooms revalidate, Issue #10 finance revalidate). Đọc source trước khi modify tránh duplicate work. Investigation pattern: grep "revalidatePath" trong file target trước khi append.

2. **router.refresh() cần thiết khi client component dùng local state map(setState) sau action.** (CODE)
   Pattern: useState(local) + action gọi setRequests prev.map → UI update nhưng Router Cache stale. router.refresh() invalidate Router Cache → next navigation/F5 thấy data tươi. Precedent: `app/admin/finance/payments/PaymentReviewCard.tsx`.

3. **Cross-role revalidate convention: action update X → revalidate cả page render X (own role) + admin view của X.** (CODE)
   Pattern áp dụng cho: updateProfileAction → /profile + /admin/tenants; createGuestAction → /tenant/guests + /notifications; saveMeterReadings → /admin/utilities + /admin/finance/invoices + /admin/finance/report. Template: hard-code 2-3 path quan trọng, defer tag-based caching (Issue #13).

4. **Phase E skip OK cho audit MEDIUM batch precedent-based.** (Tier LOW process — consistent với T-025 + T-023 pattern)
   3 task liên tiếp skip Phase E auto khi: (a) batch fix theo precedent rõ, (b) Phase C pass tsc + build + anti-pattern audit, (c) không user-facing UX change. Pattern này emerge từ session 2026-05-17/18 — formalize trong workflow v3.4 nếu repeat lần nữa.

## Auto-decisions

- [Tier LOW] 2026-05-18 — Issue #9 + Issue #10 đã có ở T-021, skip không duplicate. Lý do: source code đã có revalidatePath dashboard/home, audit recommendation đã satisfied.
- [Tier LOW] 2026-05-18 — Issue #11 router.refresh() sau cả approve + reject (không chỉ approve). Lý do: cả 2 thao tác đều mutate state, parity tốt hơn.
- [Tier LOW] 2026-05-18 — Issue #14 cũng apply cho `updateSingleMeterReadingAction` (audit chỉ mention `saveMeterReadingsAction`). Lý do: cùng table meter_readings, cùng impact report tính tiền điện.
- [Tier LOW] 2026-05-18 — 2 page redirect-only (`login`, root `/`) KHÔNG thêm force-dynamic. Lý do: audit Phase 4 classify SKIP — redirect-only, không render data, low impact.
- [Tier LOW] 2026-05-18 — Skip Phase E auto T-027. Lý do: batch MEDIUM precedent-based, Phase C đủ confidence.
