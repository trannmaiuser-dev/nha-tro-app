# Requirements 2026-05-19 — Owner/Tenant edit + Notification compose

User feedback session EOD 2026-05-19 (trannm.AIuser@gmail.com). Ghi nguyên văn
để session sau làm scope + schema migration.

## 1. Bug — Cài đặt chưa vào được từ dashboard

- Hiện trạng: nút "Cài đặt" trên dashboard owner không dẫn đến trang settings
  (đã fix một phần ở commit `c0f5190` T-017b: ProfileSelfPage → /admin/settings).
- Cần verify lại từ dashboard chính (không phải profile page) xem còn link sai
  ở đâu nữa không.

## 2. Edit thông tin cá nhân (self-edit)

- Cần thêm chức năng để **chủ** edit được thông tin cá nhân của bản thân.
- Cần thêm chức năng để **khách** edit được thông tin cá nhân của bản thân.
- (Hiện tại ProfileSelfPage owner/tenant đều view-only.)

## 3. Edit thông tin khách (owner-edit-tenant)

- Cần thêm chức năng để **chủ** có thể edit thông tin của **khách**.
- Hiện tại `/profile/[userId]` owner xem khách chỉ READ-ONLY (TenantSummaryPage).

## 4. Quản lý account khách (owner-manage-account)

Cần chức năng để **chủ** quản lý account khách, gồm:
- **Disable** account (tạm khóa)
- **Xóa** account
- **Reactivate** account (mở lại sau khi disable)

## 5. Soạn thông báo (notification compose)

Cần thêm chức năng soạn thông báo để chủ và khách liên lạc với nhau nhanh.

### 5.1 Quyền dùng
- Cả **chủ và khách** đều dùng được tính năng soạn thông báo (không phải
  chỉ chủ → khách như một số module hiện tại).

### 5.2 Tham số khi soạn
Soạn thông báo phải chỉ định được:
- **Người nhận** (cụ thể ai — 1 người, nhiều người, hay broadcast).
- **Thời gian nhận thông báo** (gửi ngay hay đặt lịch gửi sau).
- **Tần suất repeat** (1 lần / lặp lại).
- **Option repeat mỗi xxx ngày / giờ cho đến khi đối phương nhấn xác nhận**
  (= acknowledge-required notification — auto-repeat đến khi recipient confirm).

## Open decisions cho session sau

Cần Tier HIGH STOP — ask user clarify trước khi code:

| # | Decision | Options đề xuất |
|---|---|---|
| D1 | Owner profile data model | (a) reuse tenant_profiles, (b) bảng owner_profile riêng, (c) mở rộng users |
| D2 | UX tenant edit (owner sửa khách) | (a) convert /profile/[userId] editable role-based, (b) route /admin/tenants/[userId]/edit, (c) modal từ list |
| D3 | Disable/Delete semantics | (a) soft only (users.locked_at + tenant_status='archived'), (b) soft + hard delete option, (c) thêm enum 'disabled' vào tenant_status |
| D4 | Notification entity model | bảng `notifications` mới? Reuse messages? Có schedule + repeat_until_ack column? |
| D5 | Acknowledge flow | recipient nhấn nút "Đã xác nhận" → write notification_ack row → cron stop repeat. Hay update notification.acked_at trực tiếp? |
| D6 | Scheduled delivery infra | dùng PostgreSQL pg_cron? Supabase Scheduled Functions? Hay app-level cron check mỗi N phút? |

## Suggested task split

- **T-045** Owner self-edit profile + documents (D1 cần chốt trước)
- **T-046** Owner edit tenant profile + documents (D2)
- **T-047** Owner manage tenant account: disable/delete/reactivate (D3 + migration v25)
- **T-048** Notification compose entity + schedule + recipient targeting (D4 + D6 + migration v26)
- **T-049** Notification acknowledge + auto-repeat-until-ack (D5)
- **T-050** Re-audit dashboard "Cài đặt" link bug (verify trên trang dashboard chính)

(Order: T-050 đầu vì là bug nhanh; rồi T-045 → T-047 batch self-management;
cuối T-048 + T-049 batch notification stack vì cần infra mới.)
