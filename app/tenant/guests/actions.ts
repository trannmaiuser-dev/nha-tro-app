'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { guestSchema } from '@/lib/schemas/guest'
import { createGuest, deleteGuest } from '@/lib/db/guests'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

export async function createGuestAction(input: unknown): Promise<Result> {
  try {
    const user   = await getCurrentUser()
    if (!user || user.role !== 'tenant') return { success: false, error: 'Không có quyền' }

    const parsed = guestSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const sb = createServerSupabaseClient()
    const { data: room } = await sb.from('rooms').select('id').eq('tenant_id', user.userId).single()
    if (!room) return { success: false, error: 'Bạn chưa được gán phòng' }

    await createGuest(user.userId, room.id, parsed.data)
    revalidatePath('/tenant/guests')
    revalidatePath('/notifications')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể tạo báo cáo' }
  }
}

export async function deleteGuestAction(guestId: string): Promise<Result> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'tenant') return { success: false, error: 'Không có quyền' }
    await deleteGuest(guestId, user.userId)
    revalidatePath('/tenant/guests')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể xóa' }
  }
}
