'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createGroup, addMemberToGroup, removeMemberFromGroup, softDeleteGroup } from '@/lib/db/chat-groups'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

async function verifyOwner() {
  const u = await getCurrentUser()
  if (!u || u.role !== 'owner') throw new Error('Không có quyền')
  return u
}

export async function createGroupAction(name: string, description: string): Promise<Result<{ id: string }>> {
  try {
    const u = await verifyOwner()
    if (!name.trim()) return { success: false, error: 'Tên nhóm không được trống' }
    const g = await createGroup({ name: name.trim(), description: description.trim() || null, createdBy: u.userId })
    revalidatePath('/admin/chat-groups')
    revalidatePath('/chat-groups')
    return { success: true, data: { id: g.id } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể tạo nhóm' }
  }
}

export async function addMemberAction(groupId: string, userId: string): Promise<Result> {
  try {
    await verifyOwner()
    await addMemberToGroup(groupId, userId)
    revalidatePath('/admin/chat-groups')
    revalidatePath(`/chat-groups/${groupId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể thêm thành viên' }
  }
}

export async function removeMemberAction(groupId: string, userId: string): Promise<Result> {
  try {
    await verifyOwner()
    await removeMemberFromGroup(groupId, userId)
    revalidatePath('/admin/chat-groups')
    revalidatePath(`/chat-groups/${groupId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể xóa thành viên' }
  }
}

export async function deleteGroupAction(groupId: string): Promise<Result> {
  try {
    await verifyOwner()
    await softDeleteGroup(groupId)
    revalidatePath('/admin/chat-groups')
    revalidatePath('/chat-groups')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể xóa nhóm' }
  }
}
