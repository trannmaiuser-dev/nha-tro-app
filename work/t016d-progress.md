# T-016d Progress — Hotfix dashboard UI + modal refresh

Branch: claude/upbeat-cori-d3cfd5 (push lên feature/t016-multi-tenant)
Bắt đầu: 2026-05-16 (sau commit ee2e516 của T-016c)

## 3 Bug runtime

| Bug | File | Root cause |
|---|---|---|
| A | `app/dashboard/page.tsx:21-25` | Query `tenant:users!tenant_id` cũ, không có tenants[] |
| B | `components/OwnerDashboard.tsx:197-225` | Render `room.tenant` single, không loop tenants[] |
| C | `components/CreateTenantModal.tsx:58` | `router.refresh()` ngay sau setResult → modal mất nội dung |

## Checklist

- [✅] task/todo/todo.016d + memory/t016d-progress.md
- [✅] Bug A: dashboard page.tsx — `getAllRoomsWithTenants` cho owner; chia `ownerRooms` (RoomWithTenants[]) vs `tenantRoom` (TenantRoomShape) để TypeScript không phải union; `roomIds` derive theo role
- [✅] Bug B: OwnerDashboard.tsx — bỏ interface Room local, import `RoomWithTenants`; render `room.tenants.slice(0,4).map` + badge "Đại diện" + "và N người khác"; `sendReminder` gửi tới `primary.user_id`; nút Hồ sơ navigate tới `primary.user_id`
- [✅] Bug C: CreateTenantModal.tsx — thêm state `hasCreated`, bỏ `router.refresh()` sau setResult; thêm `handleClose()` wrapper gọi `router.refresh()` chỉ khi `hasCreated`; swap 4 onClick từ `onClose` → `handleClose` (backdrop, X button, Hủy, Đóng)
- [✅] Defensive: AddTenantDialog không có router.refresh → KHÔNG bị bug C. Server action revalidatePath xử lý cache. (`onAdded` callback không được gọi — pre-existing pattern, ngoài scope)
- [✅] `npx tsc --noEmit` exit 0
- [⬜] Commit + push
