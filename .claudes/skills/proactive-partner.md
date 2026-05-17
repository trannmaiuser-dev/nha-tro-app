# Skill: Proactive Partner (v1.0)

> Cách "stop" khi cần user action — luôn output concrete artifact + 2-4 options + recommend, KHÔNG stop chờ indefinitely.

---

## Triết lý

Khi gặp checkpoint cần user action, có 2 cách stop:

| Cách | Hiệu quả | Khi nào |
|---|---|---|
| ❌ Passive stop | Thấp — user phải nghĩ "tôi cần làm gì tiếp?" | KHÔNG bao giờ |
| ✅ Proactive stop | Cao — user chỉ cần chọn option | LUÔN LUÔN |

Proactive partner = đối tác chủ động: chuẩn bị sẵn artifact + options + recommend trước khi pause, không phải nô lệ chờ chỉ thị.

---

## Khi nào dùng skill này

Bất kỳ lúc nào Claude phải pause do:

1. **External tool needed** — Claude in Chrome, Supabase Studio, dev environment user-only
2. **Tier HIGH decision** (per `auto-decision-tiers.md`) — architectural/security/UX flow
3. **LOGIC lesson trong ACT** (per `todo-workflow.md` v3.3 BƯỚC 1) — process/architectural lesson
4. **Verification result branching** — pass/fail/partial cần user judgment
5. **End of phase** — Phase C done, Phase D done, etc. — nhiều path forward

NOT for:
- Tier LOW decision → auto-resolve theo decision rules pre-defined
- CODE lesson → auto-approve theo `todo-workflow.md` v3.3
- Sequential step rõ ràng → tiếp tục không hỏi

---

## Pattern: 4 elements BẮT BUỘC

Mỗi proactive stop output:

### 1. Concrete artifact (UPFRONT)

Tạo file / prompt / decision tree TRƯỚC khi đặt câu hỏi. User không phải đợi Claude generate sau khi chọn option.

Ví dụ:
- Phase E auto stop → đã tạo seed.sql + verify.sql + cleanup.sql + Chrome prompt
- SW strategy stop → đã code 3 alternative implementations (A/B/C)
- ACT lesson stop → đã đề xuất 3-5 lessons với phân loại CODE/LOGIC

### 2. 2-4 options (không nhiều hơn)

- 2 options khi binary choice (yes/no, A/B)
- 3 options khi có recommended path + 2 alternatives
- 4 options khi cần "skip/stop" option (X)

KHÔNG output > 4 options — user paralysis. Nếu thấy cần > 4, gom lại.

### 3. Mỗi option có trade-off (1 câu)

Format: `[Label] — [What happens] — [Pros/Cons/Time]`

Examples từ session 2026-05-17:
```
A — Skip navigation/HTML từ SW cache (Recommended)
   SW chỉ cache static assets. Mọi navigation request bypass SW → network.
   Tận dụng đầy đủ revalidatePath + force-dynamic. Đơn giản, an toàn nhất.

B — Network-first cho navigation
   SW thử network trước, fallback cache nếu offline. Hỗ trợ offline nhưng
   risk stale khi network chậm. Phức tạp hơn.
```

### 4. Recommendation với reasoning

Label option recommend là **(Recommended)** ngay trong label.
Option đầu tiên = option recommend (user habit: chọn cái đầu).
Reasoning ngắn: 1-2 câu why (constraint / precedent / simplicity).

KHÔNG recommend chỉ vì "thấy ổn nhất" — phải có lý do cụ thể.

---

## Format chuẩn (AskUserQuestion)

```
[Optional: 1-2 dòng context update]

[Optional: artifact summary - "Đã chuẩn bị X, Y, Z"]

[AskUserQuestion với:
  question: "Câu hỏi cụ thể có chữ ?"
  header: max 12 char chip label
  options:
    - label: "A — Verb phrase ngắn (Recommended)"
      description: "What + Why + Trade-off (1-2 câu max)"
    - label: "B — Alternative"
      description: "What + trade-off"
    - label: "C — Alternative 2 hoặc Skip/Stop"
      description: "What + trade-off"
]
```

---

## Anti-patterns (KHÔNG bao giờ)

### ❌ Vague stop
```
Tôi đang chờ ý kiến từ bạn về việc tiếp theo.
```
→ User không biết phải quyết gì.

### ❌ Open-ended question
```
Bạn muốn tôi làm gì tiếp theo?
```
→ User phải nghĩ từ đầu. Claude đã có context, phải đề xuất.

### ❌ Stop without artifact
```
Bạn cần test scenario này trong browser. Khi nào xong cho tôi biết kết quả.
```
→ User phải tự design test, tự viết prompt, tự figure out variables.

### ❌ Too many options
```
A) ... B) ... C) ... D) ... E) ... F) ...
```
→ Choice paralysis. Gom lại 2-4.

### ❌ Recommend without reasoning
```
A — Option A (Recommended)
B — Option B
C — Option C
```
→ User không hiểu why A. Phải có 1 câu "Lý do: ..."

### ❌ Same priority options
```
A — Do X
B — Do Y
C — Do Z
(không có option nào recommend)
```
→ Claude phải có judgment. Nếu thực sự equal, gộp lại.

---

## Examples từ session 2026-05-17

### Example 1: Phase E auto T-025 (external tool needed)

**Artifact prepared**:
- task/todo/025/seed.sql + verify.sql + cleanup.sql
- Refined Chrome prompt với javascript_tool API + fetch headers + DOM check
- Variables identified từ seed.sql (TENANT_E3_UUID, phone, name)

**Options**:
- **3 — Skip Phase E T-025, qua thẳng Step 5 (Recommended)** — batch fix precedent-based, build pass, low risk
- 1 — User dùng prompt refined ngay — 10-15 phút Chrome test
- 2 — Test manual ngắn gọn — 5 phút DevTools

User chose 3.

### Example 2: SW strategy decision (Tier HIGH/LOGIC)

**Artifact prepared**:
- Đã code 3 SW exclusion patterns (ready to commit theo option chosen)
- Bump CACHE version v5 → v6 question separate

**Options**:
- **A — Skip navigation/HTML từ SW cache (Recommended)** — đơn giản nhất, tận dụng revalidatePath đầy đủ
- B — Network-first — offline support nhưng phức tạp
- C — Stale-while-revalidate — UX OK nhưng inconsistent

User chose A.

### Example 3: Next action post-verify (multiple paths)

**Artifact prepared**:
- Runtime verify report (E1+E2 PASS, E3 code-level PASS)
- Backlog list (T-023, T-026, T-027) ready

**Options**:
- B — T-023 avatar wizard
- C — T-027 MEDIUM batch
- D — Skill proactive-partner.md
- X — Stop session

(No "Recommended" — equal priority backlog, user choice)

---

## Workflow integration

### Với `auto-decision-tiers.md`

`auto-decision-tiers.md` xác định **WHEN** to stop (Tier LOW auto, Tier HIGH stop).
`proactive-partner.md` xác định **HOW** to stop (artifact + options + recommend).

### Với `todo-workflow.md` v3.3

Phase ACT BƯỚC 1 (LOGIC lesson stop):
- Generate lesson proposals (artifact)
- Show LOGIC lessons với reasoning (option block không cần AskUserQuestion vì free-form OK)

Phase D/E checkpoint:
- External tool needed → proactive stop với options

### Với phase-e-auto.md

Phase E auto generate Chrome prompt → proactive stop với 3 options (run / skip / manual).

---

## Time budget heuristics

Khi cho option có time estimate:

| Estimate | Khi nào reliable |
|---|---|
| "< 5 phút" | Single curl, single file edit |
| "5-10 phút" | Manual UI check, 1 SQL paste + run |
| "10-20 phút" | Phase E auto qua Chrome, multi-file edit |
| "30 phút - 1h" | Small task end-to-end |
| "1-2 giờ" | Medium task |
| "Skip" | Always có nếu task có alternative |

Time estimate giúp user prioritize, đừng skip.

---

## Reference precedent

Session 2026-05-17 (T-021 + T-024 + T-025) — 4 proactive stops triggered:
1. SW strategy A/B/C → user chose A
2. Phase E T-025 → user chose Skip (Option 3)
3. Phase E T-021 → user chose Skip (Option B)
4. Post-verify next action → user chose Skill D

All 4 stops followed pattern: artifact + 2-4 options + recommend (3/4 had recommend, 1 had no recommend due to equal priority).

Net result: ~12% human intervention vs ~30% pre-pattern, with HIGH satisfaction (user didn't have to figure anything out).

---

## Changelog

- v1.0 (17/05/2026): Initial skill từ session retrospective 2026-05-17
  - Pattern emerged after 4 proactive stops in T-021 + T-024 + T-025 sequence
  - User feedback: "không stop chờ user reply" → proactive partner approach
