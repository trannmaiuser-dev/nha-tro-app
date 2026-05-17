'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { moveRequestSchema } from '@/lib/schemas/move-request'
import { createMoveRequest, cancelMoveRequest } from '@/lib/db/move-requests'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

async function verifyTenant() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'tenant') throw new Error('Không có quyền')
  return user
}

export async function createMoveRequestAction(input: unknown): Promise<Result> {
  try {
    const user   = await verifyTenant()
    const parsed = moveRequestSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    // Lấy room_id của tenant
    const sb = createServerSupabaseClient()
    const { data: room } = await sb.from('rooms').select('id').eq('tenant_id', user.userId).single()
    if (!room) return { success: false, error: 'Bạn chưa được gán phòng' }

    await createMoveRequest(user.userId, room.id, parsed.data.requested_date, parsed.data.reason)
    revalidatePath('/tenant/move-out')
    revalidatePath('/admin/move-requests')
    revalidatePath('/notifications')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể gửi yêu cầu' }
  }
}

export async function cancelMoveRequestAction(requestId: string): Promise<Result> {
  try {
    const user = await verifyTenant()
    await cancelMoveRequest(requestId, user.userId)
    revalidatePath('/tenant/move-out')
    revalidatePath('/admin/move-requests')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể hủy yêu cầu' }
  }
}
