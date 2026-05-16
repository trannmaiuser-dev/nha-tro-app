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

**BƯỚC 3 — CHẠY CHECK**

- `npm run build` không lỗi
- `npm run lint` ghi warning
- `.gitignore` đúng
- Không hardcode env

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

→ Xem **Hành vi 5** để rename.

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

## HÀNH VI 5: RENAME TODO → DONE

**KHÔNG BAO GIỜ** tự rename trừ khi:
- User yêu cầu rõ ràng, HOẶC
- Verify đạt KẾT LUẬN A **VÀ** Requirement Check pass **VÀ** ACT đã đầy đủ

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

## QUY TRÌNH TỔNG THỂ v3.0

```
PLAN → DO → CHECK → REQUIREMENT CHECK → VERIFY → ACT → RENAME
                                                    ↑
                                          Đề xuất bài học, đợi duyệt
```

Thứ tự:
1. **PLAN** — đọc todo, hiểu scope
2. **DO** — code theo checklist, GHI CHÚ kỹ trong "Ghi chú khi làm"
3. **CHECK** — self-check code quality, build, lint
4. **REQUIREMENT CHECK** — tự scan memory/
5. **VERIFY** — test cases (mọi case phải có ✅/❌/⏭️, không được ⬜)
6. **ACT** — Claude đề xuất bài học, user duyệt
7. **RENAME** — đổi tên + update CLAUDE.md module table

---

## QUY TẮC CHUNG (v3.0)

### Không bao giờ
- ❌ Sửa `TEMPLATE.todo.md`
- ❌ Sửa file trong `memory/`
- ❌ Tự rename mà chưa verify
- ❌ Verify mà KHÔNG chạy Requirement Check trước
- ❌ **Rename khi ACT "Bài học rút ra" trống** (RULE MỚI)
- ❌ **Kết luận verify pass khi còn test case ⬜** (RULE MỚI)
- ❌ Code việc ngoài scope
- ❌ Bỏ qua dependency chưa done
- ❌ Dùng bảng mapping cứng cho memory/ — LUÔN scan động

### Luôn luôn
- ✅ Đọc file todo ĐẦY ĐỦ trước khi code
- ✅ **Tự scan toàn bộ memory/ trước mỗi requirement check**
- ✅ Log danh sách file memory/ đã đọc
- ✅ **Trước rename: đề xuất bài học ACT, đợi user duyệt** (RULE MỚI)
- ✅ **Sau rename: update bảng module trong CLAUDE.md** (RULE MỚI)
- ✅ **Mọi test case kết thúc với ✅/❌/⏭️, không được ⬜** (RULE MỚI)
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

*Skill version: 3.0 · Cập nhật: 2026-05-16*

**Changelog:**
- v3.0 (16/05/2026): Sau retrospective T-015
  - Rule: cấm rename khi ACT trống → Claude đề xuất bài học, user duyệt
  - Rule: cấm verify pass khi còn test case ⬜ → buộc dùng ✅/❌/⏭️
  - Rule: sau rename phải auto-update bảng module trong CLAUDE.md
  - Test case có 3 trạng thái: Pass / Fail / Skipped
- v2.1: Auto-scan memory/, không dùng mapping cứng
- v2.0: Thêm Requirement Check
- v1.0: PDCA cơ bản
