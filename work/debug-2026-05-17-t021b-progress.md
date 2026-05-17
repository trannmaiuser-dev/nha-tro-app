# T-021b Debug Progress — 2026-05-17

Task: Fix dashboard cache stale sau khi admin duyệt move-request.
Branch: `feature/t021-fix-onboarding-ui` (commit hậu tố, KHÔNG tạo branch riêng).

## Checklist 7 bước (skill debug-workflow.md)

- [x] B1 Setup context — verify branch + memory dir
- [x] B2 Reproduce triệu chứng (tĩnh) — đọc source admin/move-requests + dashboard
- [x] B3 Hypothesis — liệt kê 4 hypothesis vào decisions.md
- [x] B4 Verify hypothesis bằng code reading → H2 CONFIRMED
- [x] B5 Fix — thêm `export const dynamic = 'force-dynamic'` vào dashboard/page.tsx
- [x] B6 Verify fix — tsc pass, build pass (/dashboard = ƒ Dynamic)
- [x] B7 Commit + push
