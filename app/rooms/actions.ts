'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { roomSchema } from '@/lib/schemas/room'
import { createRoom, updateRoom, deleteRoom } from '@/lib/db/rooms'

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

async function verifyOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') {
    throw new Error('Không có quyền thực hiện thao tác này')
  }
  return user
}

export async function createRoomAction(
  input: unknown
): Promise<ActionResult<Awaited<ReturnType<typeof createRoom>>>> {
  try {
    await verifyOwner()

    const parsed = roomSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const room = await createRoom(parsed.data)
    // T-021: rooms CRUD đổi danh sách phòng → invalidate dashboard/home (stats + UI).
    revalidatePath('/rooms')
    revalidatePath('/dashboard')
    revalidatePath('/home')
    return { success: true, data: room }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể tạo phòng' }
  }
}

export async function updateRoomAction(
  id: string,
  input: unknown
): Promise<ActionResult<Awaited<ReturnType<typeof updateRoom>>>> {
  try {
    await verifyOwner()

    const parsed = roomSchema.partial().safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const room = await updateRoom(id, parsed.data)
    // T-021: rooms CRUD đổi danh sách phòng → invalidate dashboard/home (stats + UI).
    revalidatePath('/rooms')
    revalidatePath('/dashboard')
    revalidatePath('/home')
    return { success: true, data: room }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể cập nhật phòng' }
  }
}

export async function deleteRoomAction(id: string): Promise<ActionResult> {
  try {
    await verifyOwner()
    await deleteRoom(id)
    // T-021: rooms CRUD đổi danh sách phòng → invalidate dashboard/home (stats + UI).
    revalidatePath('/rooms')
    revalidatePath('/dashboard')
    revalidatePath('/home')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể xóa phòng' }
  }
}
