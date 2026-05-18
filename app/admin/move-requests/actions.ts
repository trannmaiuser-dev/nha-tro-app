'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { approveMoveRequest, approveTransferRequest, rejectMoveRequest } from '@/lib/db/move-requests'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

async function verifyOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') throw new Error('Không có quyền')
  return user
}

/**
 * Approve move/transfer request. Branch theo `transfer_to_room_id`:
 *   - NULL → move-out (approve_move_request RPC)
 *   - NOT NULL → transfer (transfer_tenant RPC) — T-020
 */
export async function approveMoveRequestAction(requestId: string): Promise<Result> {
  try {
    const owner = await verifyOwner()

    // T-020: detect transfer vs move-out để branch RPC đúng
    const sb = createServerSupabaseClient()
    const { data: req } = await sb
      .from('move_requests')
      .select('transfer_to_room_id')
      .eq('id', requestId)
      .maybeSingle()
    const isTransfer = req?.transfer_to_room_id != null

    if (isTransfer) {
      await approveTransferRequest(requestId, owner.userId)
    } else {
      await approveMoveRequest(requestId, owner.userId)
    }
    // T-021: approve thay đổi rooms.status + room_tenants → invalidate trang
    // hiển thị data phòng (admin + tenant + home stats), không chỉ trang request.
    revalidatePath('/admin/move-requests')
    revalidatePath('/dashboard')
    revalidatePath('/home')
    revalidatePath('/rooms')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể duyệt yêu cầu' }
  }
}

export async function rejectMoveRequestAction(requestId: string, note: string): Promise<Result> {
  try {
    if (!note.trim()) return { success: false, error: 'Vui lòng nhập lý do từ chối' }
    const owner = await verifyOwner()
    await rejectMoveRequest(requestId, owner.userId, note)
    revalidatePath('/admin/move-requests')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể từ chối yêu cầu' }
  }
}
