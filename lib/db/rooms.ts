import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Room, RoomInput, RoomWithTenants, RoomTenantEntry } from '@/types'

// T-016b: bỏ join `tenant:users!tenant_id` — cột `rooms.tenant_id` đã drop.
// Callers cần data tenants[] dùng `getAllRoomsWithTenants` / `getRoomByIdWithTenants`.
export async function getAllRooms(): Promise<Room[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .select('*')
    .order('name')
  if (error) throw new Error('Không thể lấy danh sách phòng')
  return data ?? []
}

export async function getRoomById(id: string): Promise<Room | null> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createRoom(input: RoomInput): Promise<Room> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .insert(input)
    .select()
    .single()
  if (error) throw new Error('Không thể tạo phòng mới')
  return data
}

export async function updateRoom(id: string, input: Partial<RoomInput>): Promise<Room> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    if (error.code === 'PGRST116') throw new Error('Không tìm thấy phòng')
    throw new Error('Không thể cập nhật phòng')
  }
  return data
}

export async function deleteRoom(id: string): Promise<void> {
  const sb = createServerSupabaseClient()

  const { data: room, error: fetchError } = await sb
    .from('rooms')
    .select('name')
    .eq('id', id)
    .single()

  if (fetchError || !room) throw new Error('Không tìm thấy phòng')

  // T-016b: check active tenants qua room_tenants thay vì rooms.tenant_id
  const { count: activeCount } = await sb
    .from('room_tenants')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', id)
    .is('left_at', null)
  if ((activeCount ?? 0) > 0) {
    throw new Error('Phòng này đang có khách thuê, không thể xóa')
  }

  const { error } = await sb.from('rooms').delete().eq('id', id)
  if (error) throw new Error('Không thể xóa phòng')
}

// T-016b: search qua room_tenants thay vì legacy tenant:users!tenant_id join.
// Lấy phòng có ít nhất 1 active tenant với full_name match keyword.
export async function searchRoomsByTenantName(name: string): Promise<Room[]> {
  const sb = createServerSupabaseClient()

  const keyword = name.trim().toLowerCase()
  if (!keyword) {
    const { data } = await sb.from('rooms').select('*').order('name')
    return data ?? []
  }

  const { data, error } = await sb
    .from('rooms')
    .select(`
      *,
      room_tenants!room_id(
        left_at,
        user:users!user_id(full_name)
      )
    `)
    .order('name')
  if (error) throw new Error('Không thể tìm kiếm phòng')

  return (data ?? [])
    .filter(r => {
      const tenants = (r.room_tenants as Array<{ left_at: string | null; user: { full_name: string } | null }>) ?? []
      return tenants.some(t => t.left_at === null && t.user?.full_name?.toLowerCase().includes(keyword))
    })
    .map(({ room_tenants: _rt, ...rest }) => rest as Room)
}

// ─── Multi-tenant helpers (T-016 Phase B — UC-02) ────────────
// Trả Room kèm tất cả tenants active (room_tenants.left_at IS NULL).
// Giữ getAllRooms()/getRoomById() cũ để code legacy đọc primary qua tenant_id.

/**
 * Lấy tất cả phòng kèm `tenants[]` đang active.
 * Phòng trống (không có tenant nào) vẫn trả về, `tenants = []`.
 */
export async function getAllRoomsWithTenants(): Promise<RoomWithTenants[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .select(`
      *,
      tenants:room_tenants!room_id(
        id, user_id, joined_at, is_primary, left_at,
        user:users!user_id(id, full_name, phone)
      )
    `)
    .order('name')
  if (error) throw new Error('Không thể lấy danh sách phòng')

  // Filter ở app layer: chỉ giữ active membership (left_at IS NULL)
  return (data ?? []).map(r => ({
    ...r,
    tenants: ((r.tenants ?? []) as Array<RoomTenantEntry & { left_at: string | null }>)
      .filter(t => t.left_at === null)
      .map(t => ({
        id:         t.id,
        user_id:    t.user_id,
        joined_at:  t.joined_at,
        is_primary: t.is_primary,
        user:       t.user,
      })),
  })) as RoomWithTenants[]
}

/** Lấy 1 phòng kèm `tenants[]` active. Trả null nếu không tìm thấy. */
export async function getRoomByIdWithTenants(id: string): Promise<RoomWithTenants | null> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .select(`
      *,
      tenants:room_tenants!room_id(
        id, user_id, joined_at, is_primary, left_at,
        user:users!user_id(id, full_name, phone)
      )
    `)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null

  return {
    ...data,
    tenants: ((data.tenants ?? []) as Array<RoomTenantEntry & { left_at: string | null }>)
      .filter(t => t.left_at === null)
      .map(t => ({
        id:         t.id,
        user_id:    t.user_id,
        joined_at:  t.joined_at,
        is_primary: t.is_primary,
        user:       t.user,
      })),
  } as RoomWithTenants
}
