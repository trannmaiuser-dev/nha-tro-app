import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Room, RoomInput } from '@/types'

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
