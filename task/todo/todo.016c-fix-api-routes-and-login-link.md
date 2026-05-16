# T-016c — Fix API routes legacy + login link UI

> Fix task phát sinh sau T-016 manual test fail T1.
> Phát hiện: `app/api/owner/create-tenant/route.ts` không được Phase B refactor,
> còn dùng legacy `rooms.tenant_id` direct update + block multi-tenant + giấu login link.

## Trạng thái: 🔴 Đang làm
## Ngày tạo: 2026-05-16
## Ước lượng: 1-2 giờ
## Branch: feature/t016-multi-tenant (chưa merge main → fix tại đây)

---

## Bối cảnh

Manual test T-016 fail ở TC1:
- Tạo tenant cho P102 → `users` insert OK
- `rooms.tenant_id` update OK
- Nhưng `room_tenants` 0 rows
- Login link "biến mất" → admin không gửi được cho khách

Root cause: `AddTenantDialog` gọi `/api/owner/create-tenant/route.ts` chứ KHÔNG gọi
`createTenantAction` server action. Route handler là code legacy.

---

## Trong scope

### 1. Audit tất cả API routes / server actions còn ref `rooms.tenant_id` direct

Tìm bằng grep: `git grep -n "rooms.*tenant_id" -- "app/**/*.ts" "app/**/*.tsx"`
Liệt kê tất cả file còn ref → fix hết.

### 2. Xóa `app/api/owner/create-tenant/route.ts`

Lý do: trùng chức năng với `createTenantAccount` ở `lib/db/tenants.ts` (đã refactor Phase B).
Hai chỗ tạo tenant logic lệch nhau → bug bể đầu.

### 3. Refactor `AddTenantDialog` gọi server action

- Bỏ `fetch('/api/owner/create-tenant')` (nếu đang gọi vậy)
- Gọi `createTenantAction` từ `@/app/admin/tenants/actions`
- Server action wrap `createTenantAccount(roomId, phone, idCardNumber, fullName)`

### 4. Đảm bảo response trả về `loginLink` + `tempPassword`

`createTenantAccount` đang return:
```typescript
{ user, tempPassword, loginToken }
```

Cần wrap thêm `loginLink` trong server action:
```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const loginLink = `${baseUrl}/first-login?token=${result.loginToken}`
return { success: true, data: { ..., loginLink, tempPassword: result.tempPassword } }
```

### 5. Update password generation logic

User confirmed: dùng **random 8 ký tự** (không phải 6 số cuối CCCD nữa).

Sửa `createTenantAccount` ở `lib/db/tenants.ts`:
- Bỏ logic `const tempPassword = idCardNumber.slice(-6)`
- Thay bằng `const tempPassword = genPassword(8)` (helper từ route.ts cũ, copy về `lib/utils/`)
- Cẩn thận: thay đổi này ảnh hưởng UC-01 — đã được user duyệt

### 6. Update `AddTenantDialog` hiển thị cả login link và password

User confirmed: hiện CẢ 2.

Sửa state `result`:
```typescript
const [result, setResult] = useState<{
  tempPassword: string
  phone: string
  loginLink: string  // mới
} | null>(null)
```

UI render:
- Box password tạm (đã có)
- Box login link mới (text + copy button)
- Nút "Copy tất cả" gộp cả 2

### 7. Verify không còn API route nào miss

Re-grep sau khi xóa route.ts:
```
git grep -n "tenant_id" -- "app/**/*.ts" "app/**/*.tsx"
```
Chỉ được phép còn trong:
- `lib/db/room-tenants.ts` (dual-write D10)
- `lib/db/rooms.ts` (legacy fallback nếu có)
- File generated types

### 8. Test runtime lại TC1 + TC2

TC1: phòng trống → thêm khách → có row `room_tenants` + status='occupied' + tenant_id = user mới
TC2: phòng có 1 người → thêm khách thứ 2 → 2 rows `room_tenants` + primary cũ giữ

---

## Ngoài scope

- Cleanup data P102 cũ (legacy data, user tự xóa thủ công sau)
- Refactor route handlers khác chưa break test (chỉ fix khi grep ra)
- Webpack crash `__webpack_require__` (không reproducible stable, ignore)

---

## Test cases sau fix

| TC | Cách test | Kết quả mong đợi |
|---|---|---|
| TC1 phòng trống + khách đầu | Thêm khách cho P102 | room_tenants 1 row, is_primary=true |
| TC2 thêm khách thứ 2 | Thêm khách nữa vào P102 | 2 rows, primary cũ giữ, mới = false |
| TC-login-link | Sau submit, dialog hiện link | Có link `/first-login?token=...` |
| TC-password | Password tạm hiển thị | Random 8 ký tự, không phải 6 số CCCD |
| TC-copy | Click "Copy tất cả" | Clipboard có cả phone + password + link |

---

## Ghi chú khi làm

(Claude Code fill in autonomous mode)

---

## ACT — Bài học rút ra

(Claude Code fill cuối session)
