# Skill: todo-workflow

> Skill này hướng dẫn Claude cách làm việc với hệ thống task PDCA của dự án Nhà Trọ App.
> Khi user yêu cầu bất kỳ việc gì liên quan đến task/todo, Claude PHẢI tuân theo skill này.

---

## KHI NÀO KÍCH HOẠT SKILL NÀY

Bất kỳ khi nào user nói các từ khóa sau:
- "tạo task mới", "thêm todo", "task tiếp theo"
- "verify task", "kiểm tra task", "check todo"
- "task này xong chưa", "đánh dấu done", "rename todo"
- "bắt đầu làm T-XXX", "code task XXX"
- "check requirement", "đối chiếu requirement", "có lệch yêu cầu không"
- Hoặc đề cập đến mã task (T-001, T-002...) / file `todo.XXX-*.md`

---

## QUY ƯỚC FILE

### Đường dẫn cố định
```
tasks/template/TEMPLATE.todo.md    ← template gốc, KHÔNG sửa
tasks/todo/todo.XXX-ten-task.md    ← task đang làm
tasks/done/done.XXX-ten-task.md    ← task đã xong

memory/                            ← TỰ ĐỘNG QUÉT, không cần liệt kê
├── nha_tro_app_requirements.md    ← yêu cầu tổng (LUÔN đọc)
├── usecase-*.md                   ← use case từng module
├── retrospective-*.md             ← bài học từ các retrospective
└── (bất kỳ file *.md nào khác)    ← cũng đọc nếu liên quan
```

### Quy tắc đặt tên
- `XXX` = số 3 chữ số, tăng dần: `001`, `002`, `003`...
- Hậu tố fix: `XXXb`, `XXXc`... cho task con sửa lỗi (vd: `todo.014b-notification.md`)
- `ten-task` = tiếng Việt không dấu, gạch ngang nối

---

## HÀNH VI 1: TỰ ĐỌC TODO TRƯỚC KHI CODE

### Thứ tự đọc
1. Đọc `.claudes/CLAUDE.md`
2. **Liệt kê toàn bộ file trong `memory/`** (ghi nhớ tên file)
3. Liệt kê tất cả file trong `tasks/todo/`
4. Hỏi user: "Việc này thuộc task nào?"
5. Sau khi user xác nhận, đọc đầy đủ file todo đó

### Kiểm tra trước khi code (tự trả lời)

```
✓ Việc user yêu cầu CÓ trong "Trong scope" không?
✓ Tất cả "Dependencies" đã ở folder done/ chưa?
✓ Có item nào trong "Ngoài scope" mà user đang cố làm không?
```

### Khi phát hiện vấn đề
- **Việc nằm ngoài scope** → STOP, đề xuất tạo task mới hoặc mở rộng scope
- **Dependency chưa done** → STOP, hỏi: "Làm task nào trước?"
- **Việc trong "Ngoài scope"** → STOP, từ chối, đề xuất tạo task khác

---

## HÀNH VI 2: TẠO TODO MỚI

### Bước 1: Xác định mã task
1. Liệt kê file trong `tasks/todo/` và `tasks/done/`
2. Tìm số XXX cao nhất + 1
3. Format 3 chữ số

### Bước 2: Tự sinh nội dung dựa trên:
- Tên task user yêu cầu → Mục tiêu, Scope
- Context từ CLAUDE.md → Module, Giai đoạn
- File requirements + tất cả usecase trong `memory/` → deliverables, dependencies
- Các task hiện có → Dependencies

### Bước 3-6: Điền PLAN, DO, VERIFY chi tiết

### Bước 7: Báo cáo user

```
✅ Đã tạo: tasks/todo/todo.XXX-ten-task.md
📋 Tóm tắt: <module, giai đoạn, số việc, dependencies>
📚 File memory tham khảo: <list>
```

---

## HÀNH VI 3: REQUIREMENT CHECK

> Bắt buộc TRƯỚC khi verify.

### Quy trình 4 bước

#### BƯỚC 1 — TỰ SCAN MEMORY/

1. Đọc file todo, xác định Module/chủ đề
2. Liệt kê toàn bộ `*.md` trong `memory/`
3. Với mỗi file, check keyword match module:
   - **LUÔN đọc:** `nha_tro_app_requirements.md`
   - **LUÔN đọc:** `retrospective-*.md` (bài học cũ)
   - **Đọc nếu match:** tên file chứa keyword module
4. Log: "📚 Đã đọc: <list>"

#### BƯỚC 2 — ĐỐI CHIẾU 3 CHIỀU

```
✅ ĐÚNG: <deliverable> khớp <file>:<UC/mục>
⚠️ THIẾU: <file>:<UC> nói "<trích dẫn>" → code chưa có
❌ THỪA: code có "<mô tả>" không có trong requirement
```

#### BƯỚC 3 — ĐÁNH GIÁ MỨC ĐỘ LỆCH

- 🟢 **KHỚP** — Tất cả ✅
- 🟡 **LỆCH NHẸ** — 1-3 ⚠️ nhỏ
- 🔴 **LỆCH NGHIÊM TRỌNG** — ❌ thừa, hoặc ⚠️ về bảo mật / logic / use case chính

#### BƯỚC 4 — QUYẾT ĐỊNH

- 🟢 → Tiếp tục VERIFY
- 🟡 → Ghi vào "Ghi chú khi làm", hỏi user fix/bỏ qua
- 🔴 → DỪNG, không verify, không rename

---

## HÀNH VI 4: VERIFY TASK

> Bắt buộc chạy Requirement Check trước.

### Quy trình 5 bước

**BƯỚC 1 — KIỂM TRA SCOPE**

Với từng mục: ✅ / ❌ / ⚠️

**BƯỚC 2 — KIỂM TRA DELIVERABLES**

**BƯỚC 3 — CHẠY CHECK (BẮT BUỘC v3.2)**

1. `npx tsc --noEmit` exit 0
2. `npm run build` **PHẢI PASS** (KHÔNG skip với lý do env-dependent)
3. `npm run lint` warning OK, error fail
4. `.gitignore` đúng
5. Không hardcode env

> ⚠️ **Rule v3.2:** `tsc --noEmit` KHÔNG catch ESLint errors. T-021 phát hiện
> `react/no-unescaped-entities` sau khi tsc pass. v3.2 yêu cầu build pass trước
> khi commit. Nếu env thiếu (Supabase URL...), tạo `.env.local` từ `.env.example`
> để build chạy được — KHÔNG bỏ qua bước này.

**BƯỚC 4 — VERIFY TEST CASES** ⭐ MỚI v3.0

> Mỗi test case PHẢI có 1 trong 3 trạng thái:

| Trạng thái | Khi nào | Yêu cầu |
|---|---|---|
| ✅ **Pass** | Test thật, kết quả đúng | Bắt buộc ghi cụ thể kết quả |
| ❌ **Fail** | Test thật, kết quả sai | Bắt buộc ghi lý do |
| ⏭️ **Skipped** | Không test được | **Bắt buộc** ghi lý do skip (vd: "cần data thật, chưa có") |

🚨 **TUYỆT ĐỐI CẤM:** Để ⬜ trống ở test case khi đã verify.

Nếu Test Case còn ⬜ → KHÔNG được kết luận verify pass, phải làm 1 trong 2:
- Quay lại test thật → đánh ✅/❌
- Hoặc chuyển sang ⏭️ Skipped + ghi lý do

**BƯỚC 5 — RA QUYẾT ĐỊNH**

#### KẾT LUẬN A — ĐẠT HOÀN TOÀN
Điều kiện:
- Tất cả scope ✅
- Requirement Check pass (🟢 hoặc 🟡 đã duyệt)
- Mọi test case có trạng thái rõ (✅/❌/⏭️), không còn ⬜
- Số test case ❌ = 0
- Tỷ lệ ⏭️ Skipped < 30% tổng test (không skip quá nhiều)
- **Phase E pass (nếu áp dụng)** — tất cả smoke test case đã check ✅, không phát hiện regression. Nếu task không áp dụng Phase E → ghi `Phase E — N/A` với 1 dòng lý do.

→ Chạy **Hành vi 4b (Phase E)** nếu áp dụng, sau đó xem **Hành vi 5** để rename.

#### KẾT LUẬN B — CẦN SỬA NHỎ (1-3 điểm, < 15 phút mỗi điểm)

KHÔNG rename. Liệt kê:
```
[ ] Điểm 1: <mô tả> — <file> — <ước lượng>
Bạn muốn tôi sửa luôn không?
```

#### KẾT LUẬN C — CẦN SỬA LỚN

Điều kiện: ❌ quan trọng, > 3 điểm, Requirement Check 🔴, hoặc Skipped > 30%.

KHÔNG rename, KHÔNG tự sửa. Đề xuất tạo `todo.XXXb-fix-*.md`.

---

## HÀNH VI 4b: PHASE E — RUNTIME SMOKE TEST ⭐ MỚI v3.1, MỞ RỘNG v3.2

> Bắt buộc cho task có UI change. Khắc phục lỗ hổng "verify tĩnh pass nhưng runtime fail" (phát hiện qua T-016).

### Mode declare (v3.2)

Todo metadata BẮT BUỘC declare 1 trong 3 mode:

```markdown
## Phase E mode: auto | manual | hybrid
```

| Mode | Khi nào | Tool | Skill chi tiết |
|---|---|---|---|
| `auto` | UI change + data flow rõ + reproducible | Claude in Chrome + Supabase Studio | `phase-e-auto.md` (v1.0) |
| `manual` | Visual design / responsive / camera / payment pháp lý | User test tay (legacy v3.1) | `runtime-smoke-test.md` |
| `hybrid` | UX cần human + data setup phức tạp | Auto seed/verify, manual execute | Cả 2 skill trên |

Áp dụng từ **T-021 trở đi** (eat-our-own-dogfood). Task done T-001 → T-020 giữ
nguyên implicit manual mode — KHÔNG retroactive.

### Khi áp dụng

Bắt buộc thêm Phase E vào todo khi task có:
- Sửa **server component** (`app/**/page.tsx`)
- Sửa **shared component** (RoomCard, dashboard, modal...)
- Sửa **schema** (migration) + có UI đọc/ghi schema đó
- **Refactor schema/API** (như T-016 multi-tenant)

KHÔNG bắt buộc khi:
- Task chỉ sửa lib/utils (pure functions)
- Task chỉ thêm test/docs
- Task setup config (gitattributes, env...)

→ Task không áp dụng: ghi `Phase E — N/A` + 1 dòng lý do, không cần section đầy đủ.

### Format Phase E trong file todo

Section đặt sau Phase D verify, trước ACT. Chi tiết template tuỳ mode:

- `mode: manual` → format trong `.claudes/skills/runtime-smoke-test.md`
- `mode: auto` → format trong `.claudes/skills/phase-e-auto.md` (kèm `data-seed-pattern.md` cho SQL convention)
- `mode: hybrid` → kết hợp 2 file trên

Khung chung:

```markdown
## Phase E — Runtime Smoke Test (mode: manual | auto | hybrid)

⚠️ Bắt buộc pass trước khi rename todo → done.

### Smoke test cases
| # | Test | Cách làm | Pass criteria |
|---|---|---|---|
| E1 | <happy path> | <bước UI cụ thể> | <UI assertion + SQL verify> |
| E2 | <edge case quan trọng nhất> | ... | ... |
| E3 | <re-verify task cũ bị ảnh hưởng> | ... | ... |

### SQL verify queries
(query check schema mới + backward compat)

### Kết luận
- [ ] E1 pass
- [ ] E2 pass
- [ ] E3 pass
- [ ] Không phát hiện regression task cũ
```

Mode `auto`/`hybrid` BẮT BUỘC có thêm `task/<task-id>/seed.sql` + `verify.sql`
(xem `data-seed-pattern.md` cho convention).

### Test case selection (3 rules)
1. **Happy path** — cover 80% use case
2. **Edge case quan trọng nhất** — KHÔNG phải edge ngẫu nhiên
3. **Re-verify task cũ** — 1-2 task done trước có khả năng bị ảnh hưởng

→ 3-5 test case là đủ. >7 case là sign of bad scope splitting.

### 3 yếu tố BẮT BUỘC mỗi test case
- **Bước UI cụ thể** (data thật, copy-paste được — SĐT/tên/số tiền cụ thể)
- **UI assertion** (cái user phải thấy)
- **SQL verify** (UI có thể đúng nhưng data sai — race, cache, dual-write drift)

### Khi Phase E FAIL

User dùng skill `.claudes/skills/debug-workflow.md`:
1. User mở Claude Code, paste prompt `prompt-debug-from-symptom.md` template
2. Claude Code tự debug → fix → commit → report (1 task riêng, hậu tố b/c/d)
3. User test lại Phase E
4. Loop tới khi Phase E pass → quay lại Hành vi 5 (Rename)

KHÔNG sửa todo gốc — bug runtime sau Phase E luôn fix bằng task hậu tố mới.

---

## HÀNH VI 5: RENAME TODO → DONE

**KHÔNG BAO GIỜ** tự rename trừ khi:
- User yêu cầu rõ ràng, HOẶC
- Verify đạt KẾT LUẬN A **VÀ** Requirement Check pass **VÀ** ACT đã đầy đủ **VÀ** Phase E pass (nếu áp dụng — xem Hành vi 4b)

### Quy trình rename (cập nhật v3.0)

**BƯỚC 1 — HOÀN THIỆN PHẦN ACT** ⭐ MỚI v3.0

> 🚨 **TUYỆT ĐỐI CẤM** rename nếu phần "Bài học rút ra" trong ACT trống.

Trước khi rename, Claude PHẢI:

1. **Quét lại file todo** để rút bài học từ:
   - Mục "Ghi chú khi làm" trong DO
   - Lỗi đã gặp và cách fix
   - Quyết định kỹ thuật đã chọn
   - Pattern tốt vừa áp dụng

2. **Đề xuất 1-3 bullet "Bài học rút ra"** cho user xem:
   ```
   📝 Đề xuất bài học từ T-XXX:
   - <bài học 1 dựa trên ghi chú/lỗi>
   - <bài học 2>
   - <bài học 3>
   
   Bạn duyệt/sửa các bài học này trước khi tôi rename?
   ```

3. **Đợi user duyệt** — không tự rename nếu user chưa OK

4. Sau khi user duyệt → ghi bài học vào file → rename

**BƯỚC 2 — CẬP NHẬT METADATA**
- Trạng thái → 🟢 Done
- Ngày hoàn thành → hôm nay
- ACT → "Bài học rút ra" (đã có ở Bước 1)

**BƯỚC 3 — DI CHUYỂN FILE**
```
tasks/todo/todo.XXX-*.md → tasks/done/done.XXX-*.md
```

**BƯỚC 4 — UPDATE BẢNG TRẠNG THÁI MODULE** ⭐ MỚI v3.0

> Bắt buộc cập nhật bảng "6 Module và trạng thái" trong CLAUDE.md.

- Đọc CLAUDE.md, tìm section "6 Module và trạng thái"
- Update cột Trạng thái module liên quan đến task vừa done
- Nếu module hoàn thành hết task → đổi sang 🟢 Done
- Nếu vẫn còn task chưa làm → giữ 🟡 Đang làm + ghi rõ tiến độ (vd: "8/10 task done")

**BƯỚC 5 — ĐỀ XUẤT COMMIT**
```
done: T-XXX <tên ngắn>
```

**BƯỚC 6 — BÁO CÁO USER**
- Task đã done
- Module status đã update
- Task tiếp theo gợi ý

---

## AMEND PATTERN ⭐ MỚI v3.2

> Khi nào amend commit hiện tại vs khi nào tạo task hậu tố.

### Phase C/D fail TRƯỚC commit đầu tiên
→ Fix tại chỗ, KHÔNG tạo task hậu tố. Vẫn cùng todo, cùng commit.

### Phase C/D fail SAU commit + push

| Tình huống | Hành động |
|---|---|
| Cùng session, chưa rời flow | `git commit --amend --no-edit` + `git push --force-with-lease` |
| Khác session, đã ngừng work | Tạo task hậu tố `T-XXXa` (cosmetic) hoặc `T-XXXb` (logic) |

### Phase E fail SAU khi Phase A-D pass

→ Luôn tạo task hậu tố `T-XXXb/c/d`, dùng skill `debug-workflow.md`. KHÔNG amend
commit cũ vì:
- Bug đã làm phiền user (mất thời gian test)
- Cần audit trail riêng để retrospective sau
- 1 debug session = 1 commit (rule v3.1)

### Bài học từ T-021

ESLint `react/no-unescaped-entities` phát hiện ở Phase C sau tsc pass. Amend trong
cùng task hợp lý vì chưa rời flow (chưa qua Phase E). Nếu phát hiện sau Phase E
pass → bắt buộc task hậu tố.

---

## QUY TRÌNH TỔNG THỂ v3.2

```
PLAN → DO → CHECK → REQUIREMENT CHECK → VERIFY → RUNTIME SMOKE TEST → ACT → RENAME
                                                         ↑                  ↑
                                            Phase E (skill riêng)   Đề xuất bài học, đợi duyệt
```

Thứ tự:
1. **PLAN** — đọc todo, hiểu scope
2. **DO** — code theo checklist, GHI CHÚ kỹ trong "Ghi chú khi làm"
3. **CHECK** — self-check code quality, build, lint
4. **REQUIREMENT CHECK** — tự scan memory/
5. **VERIFY** — test cases tĩnh (mọi case phải có ✅/❌/⏭️, không được ⬜)
6. **RUNTIME SMOKE TEST** (Phase E) — user test runtime nếu task áp dụng (xem `.claudes/skills/runtime-smoke-test.md`)
7. **ACT** — Claude đề xuất bài học, user duyệt
8. **RENAME** — đổi tên + update CLAUDE.md module table

> ⭐ Phase E là bắt buộc khi task sửa server component, shared component, schema có UI, hoặc refactor schema/API. v3.2: declare mode `auto | manual | hybrid` ở metadata. Xem skill tương ứng:
> - `runtime-smoke-test.md` — chung + manual mode
> - `phase-e-auto.md` — auto mode (Claude in Chrome)
> - `data-seed-pattern.md` — SQL seed/verify convention
>
> Nếu task không áp dụng → ghi `Phase E — N/A` với 1 dòng lý do.

---

## QUY TẮC CHUNG (v3.2)

### Không bao giờ
- ❌ Sửa `TEMPLATE.todo.md`
- ❌ Sửa file trong `memory/`
- ❌ Tự rename mà chưa verify
- ❌ Verify mà KHÔNG chạy Requirement Check trước
- ❌ **Rename khi ACT "Bài học rút ra" trống** (RULE v3.0)
- ❌ **Kết luận verify pass khi còn test case ⬜** (RULE v3.0)
- ❌ **Rename todo → done khi task áp dụng Phase E nhưng smoke test chưa pass tất cả** (RULE v3.1)
- ❌ **Sửa todo gốc khi bug runtime phát hiện sau Phase E — phải tạo task hậu tố b/c/d** (RULE v3.1)
- ❌ **Skip `npm run build` với lý do "env-dependent" — phải fix .env.local + chạy** (RULE MỚI v3.2)
- ❌ **Áp dụng Phase E auto cho task done T-001 → T-020 retroactive — chỉ T-021 trở đi** (RULE MỚI v3.2)
- ❌ **Amend commit cũ khi bug phát hiện sau Phase E pass — phải task hậu tố** (RULE MỚI v3.2)
- ❌ Code việc ngoài scope
- ❌ Bỏ qua dependency chưa done
- ❌ Dùng bảng mapping cứng cho memory/ — LUÔN scan động

### Luôn luôn
- ✅ Đọc file todo ĐẦY ĐỦ trước khi code
- ✅ **Tự scan toàn bộ memory/ trước mỗi requirement check**
- ✅ Log danh sách file memory/ đã đọc
- ✅ **Trước rename: đề xuất bài học ACT, đợi user duyệt** (RULE v3.0)
- ✅ **Sau rename: update bảng module trong CLAUDE.md** (RULE v3.0)
- ✅ **Mọi test case kết thúc với ✅/❌/⏭️, không được ⬜** (RULE v3.0)
- ✅ **Task có UI change → áp dụng Phase E (Hành vi 4b); task không áp dụng → ghi `Phase E — N/A` + lý do** (RULE MỚI v3.1)
- ✅ **Bug runtime sau Phase E → chạy skill `debug-workflow.md`, fix bằng task hậu tố (T-XXXb/c/d), 1 debug session = 1 commit** (RULE v3.1)
- ✅ **Phase C `npm run build` PHẢI pass — fix .env.local nếu env thiếu** (RULE MỚI v3.2)
- ✅ **Phase E declare mode `auto | manual | hybrid` ở todo metadata** (RULE MỚI v3.2)
- ✅ **Phase E auto: tạo `task/<id>/seed.sql` + `verify.sql` ngay từ Phase D** (RULE MỚI v3.2)
- ✅ Báo cáo tiếng Việt + emoji
- ✅ Liệt kê file thay đổi sau mỗi lần code
- ✅ Task phát sinh ngoài scope → ghi vào "Task phát sinh"
- ✅ Trích chính xác file:dòng khi báo lệch requirement

---

## VÍ DỤ TƯƠNG TÁC MẪU (cập nhật v3.0)

### Ví dụ 1: Verify với test case ⏭️ Skipped

```
USER: verify T-014b

CLAUDE:
[Đọc todo, chạy đủ 5 bước verify]

📊 Verify T-014b:

BƯỚC 4 — Test Cases:
  ✅ TC1: createPaymentProof tạo notification — Pass (kiểm tra DB)
  ✅ TC2: approvePaymentProof tạo notification approved — Pass
  ⏭️ TC3: rejectPaymentProof — Skipped
       Lý do: chưa có data tenant + invoice để test thực tế
  ✅ TC4: Notification hiển thị đúng — Pass

Tỷ lệ skip: 1/4 = 25% — OK (< 30%)

KẾT LUẬN A — ĐẠT HOÀN TOÀN
```

### Ví dụ 2: ACT mới — Claude đề xuất bài học

```
CLAUDE: T-014b verify đạt KẾT LUẬN A. Trước khi rename, tôi rút bài học từ task này:

📝 Đề xuất bài học từ T-014b:

1. Notification pattern: dùng helper từ T-009 (lib/db/move-requests.ts:128 - notifyOwner)
   → tái sử dụng giúp code ngắn 60% so với viết lại
   
2. Khi thêm notification vào flow đã có, cần kiểm tra cả 3 action paths
   (create + approve + reject) — dễ quên 1 path
   
3. Test notification thật cần seed data; nên thêm script seed cho dev

Bạn duyệt 3 bài học này trước khi tôi rename không?

USER: OK, sửa bài học 3 thành "tạo todo riêng để build seed script"

CLAUDE: [ghi bài học (đã sửa) vào ACT]
       [rename todo.014b → done.014b]
       [update CLAUDE.md: Module Thu chi vẫn 🟡 (còn T-017)]

✅ T-014b DONE
📋 Bảng module CLAUDE.md đã update
▶ Task tiếp: T-017 (cảnh báo nợ) — bạn muốn bắt đầu chưa?
```

### Ví dụ 3: Phát hiện test case ⬜

```
CLAUDE: [đang verify T-XXX]

⚠️ BƯỚC 4 phát hiện vấn đề:
   TC2: Validation error — ⬜ Kết quả thực tế còn trống

Tôi KHÔNG được kết luận verify pass với test case bỏ trống.
Hai lựa chọn:

A. Test thật ngay bây giờ → đánh ✅/❌
B. Đánh ⏭️ Skipped với lý do

Bạn chọn cách nào?
```

---

*Skill version: 3.2 · Cập nhật: 2026-05-17*

**Changelog:**
- v3.2 (17/05/2026): Sau pilot Phase E auto (T-021, T-022)
  - **Phase C bắt buộc `npm run build`** (không skip env-dependent) — T-021 phát hiện ESLint error sau tsc pass
  - **Phase E mode declare ở todo metadata**: `auto | manual | hybrid`
  - Cross-link 2 skill mới: `phase-e-auto.md` (Claude in Chrome) + `data-seed-pattern.md` (SQL convention)
  - Áp dụng từ T-021 trở đi (eat-our-own-dogfood). Task done T-001 → T-020 giữ implicit manual mode, KHÔNG retroactive
  - **Amend pattern formalize**: Phase C/D fail trước commit → fix inline; cùng session sau commit → `--amend` + `--force-with-lease`; Phase E fail → task hậu tố b/c/d (1 debug session = 1 commit, rule v3.1)
- v3.1 (16/05/2026): Sau retrospective T-016 (verify tĩnh pass nhưng runtime fail 3 bug)
  - Thêm Phase E — Runtime Smoke Test (Hành vi 4b) — bắt buộc cho task có UI change
  - Rule: cấm rename khi task áp dụng Phase E mà smoke test chưa pass tất cả
  - Rule: bug runtime sau Phase E → chạy skill `debug-workflow.md`, fix bằng task hậu tố (b/c/d)
  - KẾT LUẬN A bổ sung điều kiện "Phase E pass (nếu áp dụng)"
  - Cross-link đến 2 skill mới: `runtime-smoke-test.md` (format Phase E) + `debug-workflow.md` (quy trình debug bug runtime)
  - Task done trước v3.1 KHÔNG retroactive — chỉ áp dụng từ T-017 trở đi
- v3.0 (16/05/2026): Sau retrospective T-015
  - Rule: cấm rename khi ACT trống → Claude đề xuất bài học, user duyệt
  - Rule: cấm verify pass khi còn test case ⬜ → buộc dùng ✅/❌/⏭️
  - Rule: sau rename phải auto-update bảng module trong CLAUDE.md
  - Test case có 3 trạng thái: Pass / Fail / Skipped
- v2.1: Auto-scan memory/, không dùng mapping cứng
- v2.0: Thêm Requirement Check
- v1.0: PDCA cơ bản
