'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { updateTenantProfileSchema, emergencyContactSchema, bankAccountSchema } from '@/lib/schemas/tenant'
import { updateTenantProfile, addEmergencyContact, addBankAccount, checkProfileComplete } from '@/lib/db/tenants'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

async function verifyTenant() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'tenant') throw new Error('Không có quyền')
  return user
}

export async function updateProfileAction(input: unknown): Promise<Result> {
  try {
    const user = await verifyTenant()
    const parsed = updateTenantProfileSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    await updateTenantProfile(user.userId, parsed.data)
    revalidatePath('/profile')
    revalidatePath('/admin/tenants')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể cập nhật' }
  }
}

export async function addEmergencyContactAction(input: unknown): Promise<Result> {
  try {
    const user = await verifyTenant()
    const parsed = emergencyContactSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const sb = createServerSupabaseClient()
    const { data: profile } = await sb.from('tenant_profiles').select('id').eq('user_id', user.userId).single()
    if (!profile) return { success: false, error: 'Chưa có hồ sơ khách thuê' }

    await addEmergencyContact(profile.id, parsed.data)
    revalidatePath('/profile')
    revalidatePath('/admin/tenants')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể thêm liên hệ' }
  }
}

export async function addBankAccountAction(input: unknown): Promise<Result> {
  try {
    const user = await verifyTenant()
    const parsed = bankAccountSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    await addBankAccount(user.userId, parsed.data)
    revalidatePath('/profile')
    revalidatePath('/admin/tenants')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Không thể thêm tài khoản' }
  }
}

export async function completeProfileAction(): Promise<Result<boolean>> {
  try {
    const user    = await verifyTenant()
    const done    = await checkProfileComplete(user.userId)
    revalidatePath('/profile')
    revalidatePath('/admin/tenants')
    return { success: true, data: done }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi kiểm tra hồ sơ' }
  }
}
