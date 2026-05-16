'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { expenseSchema } from '@/lib/schemas/expense'
import { createExpense, updateExpense, deleteExpense } from '@/lib/db/expenses'

type Result<T = void> = { success: true; data: T } | { success: false; error: string }

async function verifyOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') throw new Error('Không có quyền')
  return user
}

export async function createExpenseAction(input: unknown): Promise<Result> {
  try {
    const user = await verifyOwner()
    const parsed = expenseSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    await createExpense({
      room_id:        parsed.data.room_id ?? null,
      expense_type:   parsed.data.expense_type,
      amount:         parsed.data.amount,
      description:    parsed.data.description,
      expense_date:   parsed.data.expense_date,
      receipt_images: parsed.data.receipt_images ?? [],
      created_by:     user.userId,
    })

    revalidatePath('/admin/finance/expenses')
    revalidatePath('/admin/finance/report')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi lưu' }
  }
}

export async function updateExpenseAction(id: string, input: unknown): Promise<Result> {
  try {
    await verifyOwner()
    const parsed = expenseSchema.partial().safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
    await updateExpense(id, {
      ...parsed.data,
      room_id: parsed.data.room_id ?? null,
    } as Parameters<typeof updateExpense>[1])
    revalidatePath('/admin/finance/expenses')
    revalidatePath('/admin/finance/report')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi sửa' }
  }
}

export async function deleteExpenseAction(id: string): Promise<Result> {
  try {
    await verifyOwner()
    await deleteExpense(id)
    revalidatePath('/admin/finance/expenses')
    revalidatePath('/admin/finance/report')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi xóa' }
  }
}
