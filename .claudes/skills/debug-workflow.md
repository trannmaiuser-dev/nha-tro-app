# Skill: Debug Workflow (v1.0)

> Quy trình Claude Code tự debug bug runtime báo từ user, không cần chat trung gian.
> Áp dụng khi user paste prompt `prompt-debug-from-symptom.md` hoặc nói "dùng skill debug-workflow".

---

## Triết lý

User báo triệu chứng → Claude Code **tự** audit, fix, commit, report.
- Không hỏi user lấy file (Claude Code có `view`, `grep`, `bash` đọc trực tiếp)
- Không hỏi user paste SQL kết quả (Claude Code chạy SQL qua Supabase CLI hoặc curl REST API)
- Không hỏi user xác nhận từng bước (decision rules pre-defined, STOP-AND-LOG cho quyết định business)

User chỉ làm việc duy nhất: **test runtime + paste screenshot/error nếu cần**.

---

## 4 đầu vào bắt buộc từ user

User phải cung cấp 4 thứ trong prompt:

1. **Triệu chứng UI** (cái thấy trên màn hình)
2. **Hành vi mong đợi** (cái lẽ ra phải thấy)
3. **Evidence** (screenshot, console error, SQL result — optional nếu có)
4. **Scope** (branch + commit hiện tại + URL trang bị lỗi)

Nếu thiếu input nào → Claude Code DỪNG, hỏi user. KHÔNG suy đoán.

---

## 7 bước Claude Code phải làm

### Bước 1 — Setup context

```bash
git status                              # working tree clean?
git log --oneline -3                    # commit hiện tại
git branch --show-current               # branch hiện tại
```

Tạo:
- `memory/debug-<timestamp>-progress.md` — checklist 7 bước
- `memory/debug-<timestamp>-decisions.md` — log decisions tự ra

### Bước 2 — Reproduce triệu chứng (tĩnh)

- Đọc URL user báo lỗi → tìm file route (`app/<path>/page.tsx`)
- Trace data flow: page → component → lib/db → Supabase
- Liệt kê file LIÊN QUAN (tối đa 10 file)
- Đọc TẤT CẢ file liệt kê

### Bước 3 — Hypothesis

Liệt kê 3-5 hypothesis có thể, rank theo likelihood:

```markdown
## Hypotheses

1. [HIGH] File X dòng Y query schema cũ → không có field Z UI cần
2. [MEDIUM] Component A render legacy code, không loop array B
3. [LOW] Race condition giữa setState và router.refresh
```

Ghi vào `decisions.md`.

### Bước 4 — Verify hypothesis bằng SQL nếu cần

Nếu nghi vấn ở data layer → chạy SQL qua bash:

```bash
# Option 1: psql nếu có .env DATABASE_URL
psql $DATABASE_URL -c "SELECT ..."

# Option 2: Supabase CLI nếu link
npx supabase db query "SELECT ..."

# Option 3: curl REST API
curl -X POST "$SUPABASE_URL/rest/v1/rpc/..." \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -d '{"query": "..."}'
```

Nếu KHÔNG access được DB từ terminal → log decision "Không verify được DB layer, sẽ trust schema và fix theo hypothesis cao nhất". User sẽ verify sau khi test.

### Bước 5 — Fix

Áp dụng pattern phù hợp với bug type:

| Bug type | Pattern fix |
|---|---|
| Query schema cũ | Swap function call, update import |
| Component render legacy | Update prop type + map array |
| State/refresh issue | Defer side effect đến đúng lifecycle |
| API route legacy | Migrate sang server action / lib/db |
| Missing field in response | Update return shape của data layer |

**Decision rules pre-defined** (KHÔNG hỏi user):
- Backward compat: GIỮ field cũ + thêm field mới song song trong N task tới
- Naming: theo convention project (đọc 2 file lân cận)
- Error handling: throw ở lib/db, Result<T> ở server action — theo pattern hiện tại của project
- Type safety: bắt buộc TypeScript pass, không dùng `any`

### Bước 6 — Verify fix

```bash
npx tsc --noEmit                        # phải exit 0
npm run build                           # chấp nhận env fail
```

Re-read file đã fix → confirm logic đúng.

Update `progress.md` → [✅] tất cả bước.

### Bước 7 — Commit + Report

```bash
git add <files>
git commit -m "fix(<scope>): <short description>"
git push origin <branch>
```

Báo cáo cuối:

```
✅ DEBUG XONG

🐛 Bug: <1 dòng tóm tắt>
🔍 Root cause: <file:line + lý do>
🔧 Fix: <pattern + N file thay đổi>
✓ TypeScript: pass
✓ Commit: <hash>

📋 User cần test:
1. <bước cụ thể trên UI>
2. <verify SQL nếu cần>
3. <expected result>

⚠️ Nếu vẫn fail: chạy lại skill debug-workflow với triệu chứng mới
```

---

## STOP-AND-LOG triggers

Claude Code LOG decision + tiếp tục khi gặp:

- 2+ hypothesis equal likelihood → chọn ngẫu nhiên 1, log lý do
- Pattern không có precedent trong project → áp dụng convention chuẩn (Next.js / Supabase docs)
- Thay đổi business logic không rõ ý user → giữ behavior hiện tại

## HARD STOP triggers

Claude Code DỪNG, tạo `memory/debug-<timestamp>-blocker.md`, KHÔNG commit:

- TypeScript fail > 3 lần
- Phát hiện cần thay đổi database schema (migration) → cần user duyệt
- Phát hiện cần xóa file > 5 → scope quá lớn, cần user confirm
- Bug đụng đến security/auth flow → cần user review
- Không reproduce được bug (không tìm thấy file/code liên quan triệu chứng)

---

## Nguyên tắc đặc biệt

**1. KHÔNG fix bug khác phát hiện ngoài lề**
Chỉ fix bug user báo. Bug khác → ghi vào `task/todo/todo.<next>.md` để fix sau.

**2. KHÔNG refactor**
Chỉ fix tối thiểu để bug hết. Refactor là task riêng.

**3. KHÔNG đụng migration nếu user không yêu cầu**
Migration là quyết định nghiệp vụ, không thuộc debug scope.

**4. Mỗi debug session = 1 commit**
Không chia nhỏ commit. Easier rollback.

**5. Update workflow PDCA v3.x nếu bug pattern lặp lại**
Nếu cùng kiểu bug xuất hiện 3+ lần → propose update `todo-workflow.md` (thêm Phase E hoặc check mới).
