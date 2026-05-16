/**
 * Data layer cho bảng `room_tenants` (UC-02 multi-tenant).
 *
 * Phase A (T-016): chỉ skeleton — các hàm dưới throw 'Not implemented'.
 * Phase B sẽ implement, dùng pattern hiện tại của `lib/db/rooms.ts`, `lib/db/guests.ts`:
 *   - import { createServerSupabaseClient } from '@/lib/supabase-server'
 *   - throw error tiếng Việt; server-action layer wrap thành Result<T>
 *   - select với nested join cho UI: `*, user:users!user_id(...), room:rooms!room_id(...)`
 */

import type { RoomTenant, RoomTenantWithDetails } from '@/types'

/** Thêm 1 user vào phòng. Nếu phòng trống → mặc định is_primary=true. */
export async function addTenantToRoom(
  _roomId: string,
  _userId: string,
  _isPrimary: boolean = false,
): Promise<RoomTenant> {
  throw new Error('Not implemented yet — T-016 Phase B')
}

/** Đánh dấu user đã rời phòng: set `left_at` thay vì xóa. Nếu là primary → cần set primary mới ở action layer. */
export async function removeTenantFromRoom(
  _roomId: string,
  _userId: string,
  _leftAt: Date = new Date(),
): Promise<RoomTenant> {
  throw new Error('Not implemented yet — T-016 Phase B')
}

/** Lấy danh sách tenants của 1 phòng. Mặc định chỉ active (left_at IS NULL). */
export async function getTenantsByRoom(
  _roomId: string,
  _activeOnly: boolean = true,
): Promise<RoomTenantWithDetails[]> {
  throw new Error('Not implemented yet — T-016 Phase B')
}

/** Lấy danh sách phòng mà 1 user đang ở (hoặc đã từng ở nếu activeOnly=false). */
export async function getRoomsByTenant(
  _userId: string,
  _activeOnly: boolean = true,
): Promise<RoomTenantWithDetails[]> {
  throw new Error('Not implemented yet — T-016 Phase B')
}

/** Lấy primary tenant đang active của phòng (null nếu phòng trống hoặc chưa set primary). */
export async function getPrimaryTenant(_roomId: string): Promise<RoomTenantWithDetails | null> {
  throw new Error('Not implemented yet — T-016 Phase B')
}

/** Chuyển quyền primary sang user khác (unset cờ cũ + set cờ mới trong cùng transaction ở Phase B). */
export async function setPrimaryTenant(_roomId: string, _userId: string): Promise<void> {
  throw new Error('Not implemented yet — T-016 Phase B')
}
