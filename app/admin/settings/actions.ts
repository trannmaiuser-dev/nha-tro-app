'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { updateMultipleSettings, type SettingValue } from '@/lib/db/settings'
import {
  utilitiesSettingsSchema,
  feesSettingsSchema,
  timingSettingsSchema,
  miscSettingsSchema,
  type SettingsSection,
} from '@/lib/schemas/settings'

type Result = { success: true } | { success: false; error: string }

async function verifyOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') throw new Error('Không có quyền')
}

const SCHEMAS = {
  utilities: utilitiesSettingsSchema,
  fees:      feesSettingsSchema,
  timing:    timingSettingsSchema,
  misc:      miscSettingsSchema,
} as const

export async function updateSettingsAction(
  section: SettingsSection,
  input: unknown,
): Promise<Result> {
  try {
    await verifyOwner()
    const schema = SCHEMAS[section]
    if (!schema) return { success: false, error: 'Section không hợp lệ' }

    const parsed = schema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    // Convert all values to SettingValue dict
    const updates: Record<string, SettingValue> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      updates[key] = value as SettingValue
    }
    await updateMultipleSettings(updates)

    revalidatePath('/admin/settings')
    revalidatePath('/admin/finance')
    revalidatePath('/admin/finance/report')
    revalidatePath('/admin/utilities')
    revalidatePath('/rooms')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi lưu' }
  }
}
