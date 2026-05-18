---
name: Phantom "regression" từ dev server stale
description: Khi chạy smoke test, verify dev server đang chạy từ đúng worktree HEAD trước khi suspect regression
type: feedback
---

## Sự kiện (2026-05-18 session — smoke test runtime)

Trong khi run S10 DebtBanner smoke test, thấy tenant /dashboard render "Chưa có
thông tin phòng" — tưởng là regression từ T-016b (drop `rooms.tenant_id`).
Quick DB query confirm column dropped + 7 callsite trong code "vẫn query
`tenant_id`". Bắt đầu task T-038 fix.

Sau khi fix legacy (cwd `C:/aloha/nha-tro-app/`), git status reveal: **fix đi
sang worktree LEGACY top-level**, không phải worktree đang làm việc
(`vibrant-solomon-4f867c`). Worktree HEAD `fe624a9` đã có **toàn bộ fix sẵn**.

Root cause: **dev server `npm run dev` đang chạy từ LEGACY path** (HEAD
`1b1ba12` = pre-T-016b stale state), không phải worktree HEAD. UI smoke test
qua port 3000 đang test code cũ.

Sau khi:
1. Revert legacy edits
2. Restart `npm run dev` từ worktree cwd
3. Copy `.env` + `.env.local` từ legacy sang worktree

→ S10/S11/S18/S23 all PASS. T-038 task không cần thiết.

## Why

**How to apply:**

- Trước khi smoke test runtime: **luôn verify dev server đang chạy từ worktree
  cwd** đang có HEAD bạn muốn test. Check:
  - `netstat -ano | grep :3000` → tìm PID
  - PowerShell `Get-Process -Id <PID>` → check WorkingDirectory
  - Hoặc `tail dev.log` → "Local: http://localhost:3000" message + verify path
    trong log
- Khi suspect regression UI từ stale data hay schema mismatch: empirically test
  database trước (đã làm — confirmed `rooms.tenant_id does not exist`), NHƯNG
  cũng phải verify code path đang chạy. Nếu DB schema mismatch nhưng code đã
  được refactor, app vẫn work — và ngược lại.
- Mỗi worktree CẦN có `.env` + `.env.local` riêng (gitignored). Khi tạo
  worktree mới, copy từ worktree gốc trước khi `npm run dev`.
- **Edit operations dùng absolute path** — đảm bảo dùng full worktree path
  `C:\aloha\nha-tro-app\.claude\worktrees\<name>\...`, không phải shortcut
  `C:\aloha\nha-tro-app\...` (resolve về legacy top-level).
