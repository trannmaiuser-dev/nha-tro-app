'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import {
  approvePartialSchema,
  rejectProofSchema,
} from '@/lib/schemas/payment-proof'
import {
  approvePaymentProof,
  rejectPaymentProof,
} from '@/lib/db/payment-proofs'

type Result = { success: true } | { success: false; error: string }

async function verifyOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') throw new Error('Không có quyền')
  return user
}

function refreshFinance() {
  revalidatePath('/admin/finance/payments')
  revalidatePath('/admin/finance/invoices')
  revalidatePath('/tenant/payments')
}

// T-021: approve thanh toán đổi has_debt → invalidate dashboard/home (show debt status).
function refreshFinanceWithDashboard() {
  refreshFinance()
  revalidatePath('/dashboard')
  revalidatePath('/home')
}

export async function approveFullAction(proofId: string): Promise<Result> {
  try {
    const user = await verifyOwner()
    await approvePaymentProof(proofId, undefined, user.userId)
    refreshFinanceWithDashboard()
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi duyệt' }
  }
}

export async function approvePartialAction(input: unknown): Promise<Result> {
  try {
    const user = await verifyOwner()
    const parsed = approvePartialSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
    await approvePaymentProof(parsed.data.proof_id, parsed.data.amount_approved, user.userId)
    refreshFinanceWithDashboard()
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi duyệt' }
  }
}

export async function rejectAction(input: unknown): Promise<Result> {
  try {
    const user = await verifyOwner()
    const parsed = rejectProofSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
    await rejectPaymentProof(parsed.data.proof_id, parsed.data.rejection_note, user.userId)
    refreshFinance()
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi từ chối' }
  }
}
