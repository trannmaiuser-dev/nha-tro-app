import type { User } from './index'

/**
 * Quan hệ nhiều-nhiều giữa rooms và users (UC-02).
 * `left_at = null` → đang ở. `left_at` có giá trị → đã rời (giữ làm lịch sử).
 * `is_primary = true` → người đứng tên hợp đồng / nhận lại cọc khi cả phòng trả.
 */
export interface RoomTenant {
  id: string
  room_id: string
  user_id: string
  joined_at: string
  left_at: string | null
  is_primary: boolean
  created_at: string
}

/** RoomTenant kèm thông tin user + room (cho UI hiển thị danh sách). */
export interface RoomTenantWithDetails extends RoomTenant {
  user?: Pick<User, 'id' | 'full_name' | 'phone'> | null
  room?: { id: string; name: string } | null
}
