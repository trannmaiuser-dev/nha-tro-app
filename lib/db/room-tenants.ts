/**
 * Data layer cho bảng `room_tenants` (UC-02 multi-tenant).
 *
 * Phase B (T-016): impl đầy đủ 6 hàm.
 *
 * Convention (theo `lib/db/rooms.ts`, `lib/db/guests.ts`):
 *   - import { createServerSupabaseClient } from '@/lib/supabase-server'
 *   - throw Error tiếng Việt khi fail; server-action layer wrap thành Result<T>
 *   - select với nested join cho UI: `*, user:users(...)`, `room:rooms(...)`
 *
 * Backward compat (T-016 Phase B — chưa drop rooms.tenant_id):
 *   - room_tenants là source-of-truth mới cho membership
 *   - rooms.tenant_id được sync về user primary hiện tại (hoặc null khi phòng trống)
 *     để code/UI cũ tiếp tục hoạt động cho đến khi Phase C refactor xong
 *   - rooms.status: 'vacant' khi không còn active tenant; 'occupied' khi có ít nhất 1
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { RoomTenant, RoomTenantWithDetails } from '@/types'

// ─── 1. Thêm 1 user vào phòng ────────────────────────────────
export async function addTenantToRoom(
  roomId: string,
  userId: string,
  isPrimary: boolean = false,
): Promise<RoomTenant> {
  const sb = createServerSupabaseClient()

  // Reject duplicate active membership
  const { data: existing } = await sb
    .from('room_tenants')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle()
  if (existing) throw new Error('Khách này đã ở trong phòng')

  // Nếu set primary mới → unset primary cũ trong cùng phòng (chỉ active rows)
  if (isPrimary) {
    await sb
      .from('room_tenants')
      .update({ is_primary: false })
      .eq('room_id', roomId)
      .is('left_at', null)
  }

  const { data, error } = await sb
    .from('room_tenants')
    .insert({
      room_id:    roomId,
      user_id:    userId,
      is_primary: isPrimary,
      joined_at:  new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw new Error('Không thể thêm khách vào phòng: ' + error.message)

  // Dual-write backward compat: nếu là primary → sync rooms.tenant_id
  if (isPrimary) {
    await sb.from('rooms').update({ tenant_id: userId, status: 'occupied' }).eq('id', roomId)
  } else {
    // Không đụng tenant_id (primary cũ vẫn giữ). Chỉ đảm bảo status = occupied.
    await sb.from('rooms').update({ status: 'occupied' }).eq('id', roomId)
  }

  return data as RoomTenant
}

// ─── 2. Đánh dấu user đã rời phòng (set left_at, không xóa) ──
export async function removeTenantFromRoom(
  roomId: string,
  userId: string,
  leftAt: Date = new Date(),
): Promise<RoomTenant> {
  const sb = createServerSupabaseClient()

  const { data: membership, error: findError } = await sb
    .from('room_tenants')
    .select('id, is_primary')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle()
  if (findError || !membership) throw new Error('Không tìm thấy khách trong phòng')

  const { data: updated, error: updateError } = await sb
    .from('room_tenants')
    .update({ left_at: leftAt.toISOString() })
    .eq('id', membership.id)
    .select()
    .single()
  if (updateError) throw new Error('Không thể đánh dấu khách rời phòng: ' + updateError.message)

  // Nếu vừa rời là primary → chọn người ở lâu nhất (joined_at sớm nhất) làm primary mới
  let nextPrimaryUserId: string | null = null
  if (membership.is_primary) {
    const { data: nextPrimary } = await sb
      .from('room_tenants')
      .select('id, user_id')
      .eq('room_id', roomId)
      .is('left_at', null)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextPrimary) {
      await sb.from('room_tenants').update({ is_primary: true }).eq('id', nextPrimary.id)
      nextPrimaryUserId = nextPrimary.user_id
    }
  }

  // Sync rooms.tenant_id + status
  const { count } = await sb
    .from('room_tenants')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .is('left_at', null)

  if ((count ?? 0) === 0) {
    // Phòng trống → tenant_id null, status vacant
    await sb.from('rooms').update({ tenant_id: null, status: 'vacant' }).eq('id', roomId)
  } else if (nextPrimaryUserId) {
    // Còn người + primary đã chuyển → sync rooms.tenant_id sang primary mới
    await sb.from('rooms').update({ tenant_id: nextPrimaryUserId, status: 'occupied' }).eq('id', roomId)
  }

  return updated as RoomTenant
}

// ─── 3. Lấy danh sách tenants của 1 phòng (default: active) ──
export async function getTenantsByRoom(
  roomId: string,
  activeOnly: boolean = true,
): Promise<RoomTenantWithDetails[]> {
  const sb = createServerSupabaseClient()
  let q = sb
    .from('room_tenants')
    .select('*, user:users!user_id(id, full_name, phone)')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true })
  if (activeOnly) q = q.is('left_at', null)

  const { data, error } = await q
  if (error) throw new Error('Không thể lấy danh sách khách của phòng')
  return (data ?? []) as unknown as RoomTenantWithDetails[]
}

// ─── 4. Lấy danh sách phòng của 1 user (default: active) ─────
export async function getRoomsByTenant(
  userId: string,
  activeOnly: boolean = true,
): Promise<RoomTenantWithDetails[]> {
  const sb = createServerSupabaseClient()
  let q = sb
    .from('room_tenants')
    .select('*, room:rooms!room_id(id, name)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
  if (activeOnly) q = q.is('left_at', null)

  const { data, error } = await q
  if (error) throw new Error('Không thể lấy danh sách phòng của khách')
  return (data ?? []) as unknown as RoomTenantWithDetails[]
}

// ─── 5. Lấy primary tenant đang active của phòng ─────────────
export async function getPrimaryTenant(roomId: string): Promise<RoomTenantWithDetails | null> {
  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('room_tenants')
    .select('*, user:users!user_id(id, full_name, phone)')
    .eq('room_id', roomId)
    .is('left_at', null)
    .eq('is_primary', true)
    .maybeSingle()
  return (data as RoomTenantWithDetails | null)
}

// ─── 6. Chuyển quyền primary sang user khác ──────────────────
export async function setPrimaryTenant(roomId: string, userId: string): Promise<void> {
  const sb = createServerSupabaseClient()

  const { data: membership } = await sb
    .from('room_tenants')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle()
  if (!membership) throw new Error('Khách không có trong phòng (active)')

  // Unset tất cả primary trong phòng (active)
  await sb
    .from('room_tenants')
    .update({ is_primary: false })
    .eq('room_id', roomId)
    .is('left_at', null)

  // Set primary mới
  const { error } = await sb
    .from('room_tenants')
    .update({ is_primary: true })
    .eq('id', membership.id)
  if (error) throw new Error('Không thể chuyển quyền primary: ' + error.message)

  // Sync rooms.tenant_id sang primary mới
  await sb.from('rooms').update({ tenant_id: userId }).eq('id', roomId)
}
