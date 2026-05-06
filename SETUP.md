# Aloha Tran Home — Hướng dẫn cài đặt

## 1. Cài dependencies

```bash
cd nha-tro-app
npm install
```

## 2. Tạo project Supabase

1. Vào https://app.supabase.com → New project
2. Lấy 3 giá trị từ **Project Settings → API**:
   - `Project URL`
   - `anon public key`
   - `service_role key` (secret)

## 3. Tạo database schema

1. Vào Supabase → **SQL Editor**
2. Copy toàn bộ nội dung file `supabase/schema.sql`
3. Paste vào SQL Editor và nhấn **Run**

## 4. Tạo file .env

```bash
cp .env.example .env
```

Điền vào `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=<32+ ký tự ngẫu nhiên>
NEXT_PUBLIC_APP_DOMAIN=localhost
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<tạo bên dưới>
VAPID_PRIVATE_KEY=<tạo bên dưới>
VAPID_EMAIL=mailto:admin@alohahome.app
```

### Tạo JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Tạo VAPID keys (cho Push Notification)

```bash
node scripts/generate-vapid.js
```

## 5. Seed dữ liệu mẫu

```bash
npm run seed
```

Sẽ tạo 2 tài khoản:
- **Chủ nhà**: 0901000001 / 123456 (Minh Anh)
- **Khách thuê**: 0901000002 / 123456 (Anh Hùng, phòng P201)

## 6. Chạy app

```bash
npm run dev
```

Mở http://localhost:3000

---

## Test vân tay trên máy tính

### Windows (Windows Hello)
1. Đăng nhập bằng phone + password lần đầu
2. Khi popup "Bật đăng nhập bằng vân tay?" hiện ra → nhấn **Bật ngay**
3. Windows sẽ hiện hộp thoại xác thực → dùng **PIN Windows** hoặc **cảm biến vân tay**
4. Lần sau mở app → nhấn **Đăng nhập bằng vân tay** → nhập PIN Windows

### Mac (Touch ID)
1. Tương tự Windows Hello
2. Dùng Touch ID hoặc nhập password Mac

### Chrome (DevTools testing)
- Mở DevTools → Application → Storage → Credentials (WebAuthn)
- Có thể add virtual authenticator để test

---

## Test Push Notification

1. Đảm bảo app đang chạy ở **HTTPS** (hoặc localhost)
2. Đăng nhập → app sẽ xin quyền notification
3. **Owner** nhấn "🔔 Nhắc tiền" → **Tenant** sẽ nhận push
4. **Tenant** nhấn "✅ Đã thanh toán" → **Owner** sẽ nhận push

> 💡 Trên localhost, push notification chỉ hoạt động khi cả 2 tab đang mở trong cùng trình duyệt.

---

## Deploy lên Vercel

```bash
npx vercel
```

Thêm tất cả biến môi trường trong Vercel Dashboard.

Sau khi deploy, cập nhật `.env`:
```
NEXT_PUBLIC_APP_DOMAIN=your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```
