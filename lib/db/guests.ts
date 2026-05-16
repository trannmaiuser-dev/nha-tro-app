import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Guest } from '@/types'
import type { GuestInput } from '@/lib/schemas/guest'

export async function createGuest(tenantId: string, roomId: string, data: GuestInput): Promise<Guest> {
  const sb = createServerSupabaseClient()
  const { data: result, error } = await sb
    .from('guests')
    .insert({ tenant_id: tenantId, room_id: roomId, ...data })
    .select()
    .single()
  if (error) throw new Error('Không thể tạo báo cáo khách đến chơi')

  // Gửi thông báo cho admin
  const { data: owner } = await sb.from('users').select('id').eq('role', 'owner').limit(1).single()
  if (owner) {
    const { data: user } = await sb.from('users').select('full_name, phone').eq('id', tenantId).single()
    const { data: room } = await sb.from('rooms').select('name').eq('id', roomId).single()
    await sb.from('notifications').insert({
      sender_id:   tenantId,
      receiver_id: owner.id,
      type:        'payment_reminder',
      message:     `${user?.full_name ?? user?.phone} (Phòng ${room?.name}) có khách đến chơi: ${data.guest_name} (${data.number_of_nights} đêm)`,
    })
  }

  return result as Guest
}

export async function getGuestsByTenant(tenantId: string): Promise<Guest[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('guests')
    .select('*, room:rooms!room_id(id, name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Không thể lấy danh sách khách')
  return (data ?? []) as unknown as Guest[]
}

export async function getGuestsByRoom(roomId: string, fromDate: string, toDate: string): Promise<Guest[]> {
  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('guests')
    .select('*, tenant:users!tenant_id(id, full_name, phone)')
    .eq('room_id', roomId)
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as Guest[]
}

// Lấy danh sách khách đang trong thời gian ở (cho camera AI dùng sau)
export async function getActiveGuests(date: string): Promise<Guest[]> {
  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('guests')
    .select('*, room:rooms!room_id(id, name), tenant:users!tenant_id(id, full_name)')
    .order('created_at', { ascending: false })

  // Lọc khách còn hiệu lực: created_at <= date < created_at + number_of_nights ngày
  const targetDate = new Date(date).getTime()
  return (data ?? []).filter(g => {
    const start = new Date(g.created_at).getTime()
    const end   = start + g.number_of_nights * 86400000
    return targetDate >= start && targetDate < end
  }) as unknown as Guest[]
}

export async function getAllGuests(): Promise<Guest[]> {
  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('guests')
    .select('*, tenant:users!tenant_id(id, full_name, phone), room:rooms!room_id(id, name)')
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as Guest[]
}

export async function deleteGuest(id: string, tenantId: string): Promise<void> {
  const sb = createServerSupabaseClient()
  const { data: guest } = await sb.from('guests').select('tenant_id').eq('id', id).single()
  if (!guest || guest.tenant_id !== tenantId) throw new Error('Không tìm thấy hoặc không có quyền xóa')
  await sb.from('guests').delete().eq('id', id)
}
