# Skill: Auto-Decision Tiers (v1.0)

> Phân biệt khi nào Claude tự quyết vs khi nào BẮT BUỘC user duyệt.

---

## Triết lý

Tỉ lệ human intervention target: ~10-15%. User chỉ quyết:
- Business rule + value (vd "avatar required hay optional?")
- Logic lesson (vd "SW strategy network-only vs network-first?")
- HIGH/LOGIC audit issues

Mọi thứ khác Claude tự quyết + log.

---

## 2 tier decision

### Tier LOW (auto-decide + log vào todo `## Auto-decisions` section)

**Examples**:
- Phân loại field optional vs required nhỏ (không UX-facing)
- Naming convention nội bộ
- Color code / button label / wording vi chi tiết
- Technical defaults (timeout, page size, max retries)
- Severity classification (CRITICAL/HIGH/MEDIUM)
- File structure (sub-folder, naming pattern)
- Import path correction
- TypeScript narrow / unknown vs any
- Code lesson formulation cho ACT

**Action**: tự quyết, ghi vào todo section `## Auto-decisions`:

```markdown
## Auto-decisions

- [Tier LOW] <Date> — <decision> — Lý do: <1 dòng>
```

User review batch khi rảnh, có thể revert nếu sai.

### Tier HIGH (BẮT BUỘC user duyệt)

**Examples**:
- Thay đổi user-facing UX flow (tenant tự promote vs owner duyệt)
- Money / payment logic
- Security (auth, permissions, JWT, env)
- Data deletion behavior (cascade vs restrict)
- Contract / legal-related
- Schema migration ảnh hưởng data thật
- Architectural decision (SW strategy, cache layer, microservice split)
- Cross-cutting concern (auth flow, notification system)
- LOGIC lesson formulation cho retrospective skill

**Action**: STOP, in question + reasoning, đợi user reply.

---

## Code lesson vs Logic lesson (cho ACT auto-approve)

### Code lesson — auto-approve, fill ACT, rename done

Examples:
- "Dùng cookies() BẮT BUỘC force-dynamic"
- "revalidatePath path phải đúng với render page"
- "TypeScript narrow sau early return"
- "Import path: lib/, types/, components/ (KHÔNG src/)"
- "ESLint rule X chặn ký tự Y"

### Logic lesson — STOP user duyệt

Examples:
- "Service worker design: skip navigation requests" (architectural)
- "Test data convention dùng prefix 0911999" (cross-task standard)
- "Workflow PDCA cần thêm Phase F" (process change)
- "Pattern data layer: throw vs Result<T>" (architectural rule)

---

## Workflow integration

Phase ACT v3.3:
1. Claude Code generate proposed lessons.
2. Classify mỗi lesson: CODE hay LOGIC.
3. CODE lessons: auto-fill vào todo ACT section, rename done ngay.
4. LOGIC lessons: STOP, in ra cho user duyệt, đợi reply.
5. User OK → fill + rename done. User sửa → áp dụng sửa.

---

## Reference precedent

- T-021 ACT lesson "Phân tách required vs optional ở 2 layer" — CODE (pattern technique)
- T-021 ACT lesson "revalidatePath audit pattern" — CODE (technique)
- T-021 ACT lesson "Phase E auto v3.2 first test case" — LOGIC (process validation)
- T-024 ACT lesson "Severity × Category matrix" — LOGIC (audit methodology)

---

## Changelog

- v1.0 (17/05/2026): Initial skill từ retrospective T-021 + T-024
