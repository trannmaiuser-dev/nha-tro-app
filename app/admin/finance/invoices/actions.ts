'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createInvoicesSchema, updateInvoiceSchema } from '@/lib/schemas/invoice'
import {
  calculateInvoicesPreview,
  createInvoices,
  updateInvoice,
  deleteInvoice,
  type InvoiceCalcResult,
} from '@/lib/db/invoices'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

async function verifyOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') throw new Error('Không có quyền')
  return user
}

export async function previewInvoicesAction(
  roomIds: string[], month: number, year: number,
): Promise<Result<InvoiceCalcResult[]>> {
  try {
    await verifyOwner()
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return { success: false, error: 'Vui lòng chọn ít nhất 1 phòng' }
    }
    const preview = await calculateInvoicesPreview(roomIds, month, year)
    return { success: true, data: preview }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi xem trước' }
  }
}

export async function createInvoicesAction(input: unknown): Promise<Result<{ created: number; skipped: string[] }>> {
  try {
    const user = await verifyOwner()
    const parsed = createInvoicesSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { month, year, rows } = parsed.data
    const result = await createInvoices(month, year, rows.map(r => ({
      ...r,
      electricity_log_id: r.electricity_log_id ?? null,
      note: r.note ?? null,
    })), user.userId)

    revalidatePath('/admin/finance/invoices')
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi tạo hóa đơn' }
  }
}

export async function updateInvoiceAction(input: unknown): Promise<Result> {
  try {
    await verifyOwner()
    const parsed = updateInvoiceSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { id, ...patch } = parsed.data
    await updateInvoice(id, {
      ...patch,
      electricity_log_id: patch.electricity_log_id ?? null,
      note: patch.note ?? null,
    })

    revalidatePath('/admin/finance/invoices')
    revalidatePath(`/admin/finance/invoices/${id}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi sửa' }
  }
}

export async function deleteInvoiceAction(id: string): Promise<Result> {
  try {
    await verifyOwner()
    await deleteInvoice(id)
    revalidatePath('/admin/finance/invoices')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi xóa' }
  }
}
