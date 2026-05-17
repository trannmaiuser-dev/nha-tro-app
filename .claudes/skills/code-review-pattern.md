# Skill: Code Review Pattern (v1.0)

> Bắt buộc check Phase C v3.3. Áp dụng cho mọi task có code change.

---

## Triết lý

Catch bug ở Phase C (CHECK) thay vì Phase E (runtime). Bug Phase C fix bằng amend cùng task. Bug Phase E fix bằng task hậu tố — đắt hơn nhiều.

---

## 12 anti-pattern check trước commit

### Server actions (4 check)

**SA1 [HIGH/CODE]**: Action mutate DB không có `revalidatePath` nào.
- Grep: `grep -n 'use server\|revalidatePath' app/<action_file>`
- Fix: thêm `revalidatePath` cho mọi page render data action vừa update
- Reference: `app/admin/tenants/actions.ts:41-44` (createTenantAction, 4 path)

**SA2 [HIGH/CODE]**: `revalidatePath` gọi path không tồn tại trong `app/`.
- Check: với mỗi path trong revalidatePath, verify `app/<path>/page.tsx` exists
- Fix: dùng path đúng

**SA3 [MEDIUM/CODE]**: Action update data + client component caller không có `router.refresh()` follow-up.
- Reference pattern: `app/admin/finance/payments/PaymentReviewCard.tsx:37,45,53`
- Fix: thêm `router.refresh()` sau khi action return success

**SA4 [MEDIUM/CODE]**: Action throw error không có try/catch wrapper, không return Result<T>.
- Fix: wrap try/catch, return `{success: false, error: '...'}`

### Server components (3 check)

**SC1 [HIGH/CODE]**: Page dùng `cookies()` (trực/gián tiếp qua getCurrentUser) KHÔNG có `export const dynamic = 'force-dynamic'`.
- Grep: `grep -l 'cookies()\|getCurrentUser' app/<page>/page.tsx`
- Verify: `grep -n "export const dynamic" app/<page>/page.tsx`
- Fix: thêm `export const dynamic = 'force-dynamic'` đầu file
- Lý do: Bug 4 T-021 — dù `cookies()` ngầm trigger dynamic, response không có `Cache-Control: no-store` đủ mạnh

**SC2 [MEDIUM/CODE]**: Page có cả `force-dynamic` + `revalidate` (xung đột).
- Fix: xóa `revalidate`

**SC3 [HIGH/CODE]**: Server component fetch trong `useEffect` (sai pattern).
- Fix: chuyển sang async server component hoặc tách client component

### Data layer (3 check)

**DL1 [MEDIUM/LOGIC]**: Function wrap `unstable_cache` không có tag.
- LOGIC: cần quyết định tag naming strategy → defer LOGIC review
- Auto-fix: NO

**DL2 [MEDIUM/CODE]**: Function dùng `createClient` thay `createServerSupabaseClient`.
- Grep: `grep -n 'createClient' lib/db/`
- Fix: replace

**DL3 [MEDIUM/CODE]**: Function ở DB layer return `Result<T>` (vi phạm D5 — DB layer throw).
- Fix: throw error, để server action layer wrap Result<T>

### Service worker (2 check)

**SW1 [CRITICAL/LOGIC]**: SW cache-first không exclude navigation requests.
- LOGIC: cần quyết định strategy (network-only / network-first / stale-while-revalidate cho navigation)
- Auto-fix: NO

**SW2 [HIGH/CODE]**: SW không exclude `/api/*` route.
- Fix: thêm exclusion condition trong fetch handler

### Bonus

**BN1 [MEDIUM/CODE]**: `<Image src>` từ domain không trong `next.config.js` images.remotePatterns.
- Fix: hoặc thêm domain whitelist, hoặc thay URL về NULL/local

---

## Workflow integration với Phase C v3.3

Phase C BƯỚC 4 (mới):

```bash
# Audit anti-pattern (Claude Code tự chạy)
grep -l "use server" app/ | while read f; do
  grep -l "revalidatePath" "$f" || echo "SA1 violation: $f"
done

# (etc. cho 11 check khác)
```

Nếu phát hiện violation:
- CODE auto-fixable → fix tại chỗ, log decision vào todo Auto-decisions section
- LOGIC → STOP, ask user

---

## Reference T-024 audit findings

15 issues + 3 bonus từ audit ngày 2026-05-17. Xem `work/audit-2026-05-17-data-flow.md` cho evidence cụ thể.

---

## Changelog

- v1.0 (17/05/2026): Initial skill từ T-024 audit findings + T-021 lessons
