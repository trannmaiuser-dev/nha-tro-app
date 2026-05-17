'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import {
  bulkMeterReadingSchema,
  updateMeterReadingSchema,
} from '@/lib/schemas/meter-reading'
import {
  upsertMeterReadingsBulk,
  updateMeterReadingWithAudit,
} from '@/lib/db/meter-readings'

type Result = { success: true } | { success: false; error: string }

async function verifyOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') throw new Error('Không có quyền')
  return user
}

export async function saveMeterReadingsAction(input: unknown): Promise<Result> {
  try {
    const user = await verifyOwner()
    const parsed = bulkMeterReadingSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { month, year, readings } = parsed.data
    await upsertMeterReadingsBulk(
      readings.map(r => ({ ...r, month, year, recorded_by: user.userId })),
    )

    revalidatePath('/admin/utilities')
    revalidatePath('/admin/finance/invoices')
    revalidatePath('/admin/finance/report')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi lưu' }
  }
}

export async function updateSingleMeterReadingAction(
  id: string,
  input: unknown,
): Promise<Result> {
  try {
    const user = await verifyOwner()
    const parsed = updateMeterReadingSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { reason, ...changes } = parsed.data
    await updateMeterReadingWithAudit(id, changes, reason, user.userId)

    revalidatePath('/admin/utilities')
    revalidatePath('/admin/finance/invoices')
    revalidatePath('/admin/finance/report')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi sửa' }
  }
}
