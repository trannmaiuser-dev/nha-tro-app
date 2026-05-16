import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Room, RoomInput, RoomWithTenants, RoomTenantEntry } from '@/types'

export async function getAllRooms(): Promise<Room[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .select('*, tenant:users!tenant_id(id, full_name, phone)')
    .order('name')
  if (error) throw new Error('Không thể lấy danh sách phòng')
  return data ?? []
}

export async function getRoomById(id: string): Promise<Room | null> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .select('*, tenant:users!tenant_id(id, full_name, phone)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createRoom(input: RoomInput): Promise<Room> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .insert({ ...input, tenant_id: null })
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
    .select('tenant_id, name')
    .eq('id', id)
    .single()

  if (fetchError || !room) throw new Error('Không tìm thấy phòng')
  if (room.tenant_id) throw new Error('Phòng này đang có khách thuê, không thể xóa')

  const { error } = await sb.from('rooms').delete().eq('id', id)
  if (error) throw new Error('Không thể xóa phòng')
}

export async function searchRoomsByTenantName(name: string): Promise<Room[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rooms')
    .select('*, tenant:users!tenant_id(id, full_name, phone)')
    .order('name')
  if (error) throw new Error('Không thể tìm kiếm phòng')

  const keyword = name.trim().toLowerCase()
  if (!keyword) return data ?? []

  return (data ?? []).filter(r =>
    r.tenant?.full_name?.toLowerCase().includes(keyword)
  )
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
      tenant:users!tenant_id(id, full_name, phone),
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
      tenant:users!tenant_id(id, full_name, phone),
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
