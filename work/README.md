# Working Artifacts

Thư mục này chứa **working artifact** của các task — file tạm chỉ liên quan task gốc.

## Phân biệt với memory/

- `memory/` = **reference memory** (long-term, đọc mỗi task qua auto-scan):
  - `nha_tro_app_requirements.md`, `usecase-*.md`, `retrospective-*.md`
  - `*-decisions.md` (decisions cross-task reference)
- `work/` = **working artifact** (per-task, đọc lúc làm task gốc):
  - `audit-*.md` — audit report 1 lần
  - `debug-*.md` — debug session log
  - `*-progress.md` — checklist trong task lifecycle

## Khi nào archive

Working artifact có thể `git rm` hoặc gộp vào ACT của task gốc sau khi task done. Nếu giữ lại, để trong `work/`.

## Auto-scan

Workflow Requirement Check chỉ auto-scan `memory/`, KHÔNG scan `work/`. File trong `work/` đọc trực tiếp khi cần (vd "check audit T-024 lần trước").
