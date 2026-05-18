'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { sendGroupMessage, getGroupForUser } from '@/lib/db/chat-groups'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

export async function sendGroupMessageAction(groupId: string, content: string): Promise<Result> {
  try {
    const u = await getCurrentUser()
    if (!u) throw new Error('Chưa đăng nhập')

    const ctx = await getGroupForUser(groupId, u.userId)
    if (!ctx) return { success: false, error: 'Không tìm thấy nhóm hoặc bạn không có quyền' }
    if (u.role !== 'owner' && !ctx.isMember) return { success: false, error: 'Bạn không phải thành viên nhóm' }

    await sendGroupMessage(u.userId, groupId, content)
    revalidatePath(`/chat-groups/${groupId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể gửi tin nhắn' }
  }
}
