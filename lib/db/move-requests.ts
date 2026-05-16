import { createServerSupabaseClient } from '@/lib/supabase-server'
import { removeTenantFromRoom } from '@/lib/db/room-tenants'
import type { MoveRequest } from '@/types'

export async function createMoveRequest(
  userId: string,
  roomId: string,
  requestedDate: string,
  reason?: string,
): Promise<MoveRequest> {
  const sb = createServerSupabaseClient()

  // Kiểm tra chưa có request pending
  const { data: existing } = await sb
    .from('move_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle()
  if (existing) throw new Error('Bạn đã có yêu cầu chuyển đi đang chờ duyệt')

  const { data, error } = await sb
    .from('move_requests')
    .insert({ user_id: userId, room_id: roomId, requested_date: requestedDate, reason: reason ?? null })
    .select()
    .single()
  if (error) throw new Error('Không thể tạo yêu cầu chuyển đi')

  // Cập nhật trạng thái tenant
  await sb.from('users').update({ tenant_status: 'pending_move' }).eq('id', userId)

  // Gửi thông báo cho admin
  const { data: owner } = await sb.from('users').select('id').eq('role', 'owner').limit(1).single()
  if (owner) {
    const { data: user } = await sb.from('users').select('full_name, phone').eq('id', userId).single()
    await sb.from('notifications').insert({
      sender_id:   userId,
      receiver_id: owner.id,
      type:        'extension_request',
      message:     `${user?.full_name ?? user?.phone} đã gửi yêu cầu chuyển đi vào ngày ${requestedDate}`,
    })
  }

  return data as MoveRequest
}

export async function getMoveRequests(status?: string): Promise<MoveRequest[]> {
  const sb = createServerSupabaseClient()
  let query = sb
    .from('move_requests')
    .select('*, user:users!user_id(id, full_name, phone), room:rooms!room_id(id, name, floor)')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw new Error('Không thể lấy danh sách yêu cầu chuyển đi')
  return (data ?? []) as unknown as MoveRequest[]
}

export async function getMyMoveRequest(userId: string): Promise<MoveRequest | null> {
  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('move_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as MoveRequest | null)
}

export async function approveMoveRequest(requestId: string, reviewerId: string): Promise<void> {
  const sb = createServerSupabaseClient()

  const { data: req } = await sb
    .from('move_requests')
    .select('user_id, room_id')
    .eq('id', requestId)
    .single()
  if (!req) throw new Error('Không tìm thấy yêu cầu')

  // Cập nhật request
  await sb.from('move_requests').update({
    status:      'approved',
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
  }).eq('id', requestId)

  // Cập nhật tenant status → moved_out
  await sb.from('users').update({ tenant_status: 'moved_out' }).eq('id', req.user_id)

  // T-016 Phase B: dùng room_tenants thay vì set rooms.tenant_id=null trực tiếp.
  // removeTenantFromRoom xử lý:
  //   - set left_at trong room_tenants (không xóa row)
  //   - chuyển primary cho người ở lâu nhất (nếu cần)
  //   - sync rooms.tenant_id + status ('vacant' khi phòng trống, 'occupied' khi còn người)
  await removeTenantFromRoom(req.room_id, req.user_id)

  // Gửi thông báo cho khách
  await sb.from('notifications').insert({
    sender_id:   reviewerId,
    receiver_id: req.user_id,
    type:        'extension_approved',
    message:     'Yêu cầu chuyển đi của bạn đã được chấp nhận.',
  })
}

export async function rejectMoveRequest(
  requestId: string,
  reviewerId: string,
  rejectionNote: string,
): Promise<void> {
  const sb = createServerSupabaseClient()

  const { data: req } = await sb
    .from('move_requests')
    .select('user_id')
    .eq('id', requestId)
    .single()
  if (!req) throw new Error('Không tìm thấy yêu cầu')

  await sb.from('move_requests').update({
    status:         'rejected',
    reviewed_by:    reviewerId,
    reviewed_at:    new Date().toISOString(),
    rejection_note: rejectionNote,
  }).eq('id', requestId)

  // Reset tenant status về active
  await sb.from('users').update({ tenant_status: 'active' }).eq('id', req.user_id)

  // Gửi thông báo
  await sb.from('notifications').insert({
    sender_id:   reviewerId,
    receiver_id: req.user_id,
    type:        'extension_rejected',
    message:     `Yêu cầu chuyển đi bị từ chối: ${rejectionNote}`,
  })
}

export async function cancelMoveRequest(requestId: string, userId: string): Promise<void> {
  const sb = createServerSupabaseClient()

  const { data: req } = await sb
    .from('move_requests')
    .select('user_id, status')
    .eq('id', requestId)
    .single()
  if (!req || req.user_id !== userId) throw new Error('Không tìm thấy yêu cầu')
  if (req.status !== 'pending') throw new Error('Chỉ có thể hủy yêu cầu đang chờ duyệt')

  await sb.from('move_requests').delete().eq('id', requestId)
  await sb.from('users').update({ tenant_status: 'active' }).eq('id', userId)
}
