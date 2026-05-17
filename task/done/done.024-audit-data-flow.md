# T-024 — Codebase audit: data flow patterns

## Trạng thái: 🟢 Done
## Ngày tạo: 2026-05-17
## Ngày hoàn thành: 2026-05-17
## Ước lượng: 1-2 giờ
## Áp dụng Phase E: ❌ No (task audit, không deploy code)
## Phase E mode: N/A
## Branch: feature/t024-audit-data-flow

## Bối cảnh
T-021 phát hiện 4 layer bug pattern (ESLint pre-commit, test data avatar, .next cache, service worker navigation intercept). Cần audit toàn codebase tìm bug tương tự trước khi làm T-017/T-019/T-020.

## Trong scope
1. Server actions: revalidatePath coverage check
2. Server components: force-dynamic check cho cookies/auth pages
3. Data layer: cache config check
4. Service worker: navigation handling check

## Ngoài scope
- Security audit chi tiết (JWT, env leak) → task riêng nếu cần
- Performance audit
- Style/lint cleanup
- Fix anti-pattern (chỉ inspect lần này)

## Output
- work/audit-2026-05-17-data-flow.md (full report)
- Console summary cuối phiên

## ACT

1. **Audit task không thuộc business flow, output là document — bỏ Phase E.**
   Audit thuần document/inspection, không deploy code. Workflow Phase E (runtime smoke) không áp dụng được vì không có user journey để test. Quyết định pre-task tránh được nhập nhèm sau.

2. **Severity × Category 2D matrix giúp prioritize fix batch (HIGH/CODE auto-fixable vs HIGH/LOGIC user duyệt).**
   1D severity (CRITICAL/HIGH/MEDIUM) không đủ để decide auto-fix vs user-duyệt. Thêm category (CODE/LOGIC) làm trục thứ 2: HIGH/CODE = fix ngay (precedent có sẵn), HIGH/LOGIC = STOP user duyệt (cần decide strategy). Matrix này áp dụng được cho mọi audit về sau.

3. **Working artifact phải ở work/, không memory/ — confirmed bởi restructure 8fd3292.**
   Audit output là working artifact (snapshot tại thời điểm chạy, sẽ stale sau khi fix), không phải reference. Quyết định move từ memory/ sang work/ ngay khi rebase lên main mới (sau restructure 8fd3292). Tránh stale reference auto-scan.

## Auto-decisions

- [Tier LOW] 2026-05-17 — Severity classify ambiguous case: chọn HIGH (conservative). Lý do: workflow yêu cầu conservative cho audit findings.
- [Tier LOW] 2026-05-17 — Category default cho architectural anti-pattern: LOGIC. Lý do: SW design + cache strategy thuộc cross-cutting concern.
