'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createTenantSchema } from '@/lib/schemas/tenant'
import { createTenantAccount } from '@/lib/db/tenants'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

async function verifyOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') throw new Error('Không có quyền thực hiện thao tác này')
  return user
}

export async function createTenantAction(input: unknown): Promise<Result<{ tempPassword: string; loginToken: string; phone: string }>> {
  try {
    await verifyOwner()
    const parsed = createTenantSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { phone, id_card_number, room_id, full_name } = parsed.data
    const result = await createTenantAccount(room_id, phone, id_card_number, full_name)

    revalidatePath('/admin/tenants')
    revalidatePath('/rooms')
    return { success: true, data: { tempPassword: result.tempPassword, loginToken: result.loginToken, phone } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể tạo tài khoản' }
  }
}
