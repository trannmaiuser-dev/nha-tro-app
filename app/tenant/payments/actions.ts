'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { tenantSubmitProofSchema } from '@/lib/schemas/payment-proof'
import {
  createPaymentProof,
  findInvoiceForTenantMonth,
} from '@/lib/db/payment-proofs'

type Result = { success: true } | { success: false; error: string }

export async function submitPaymentProofAction(input: unknown): Promise<Result> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Vui lòng đăng nhập' }
    if (user.role !== 'tenant') return { success: false, error: 'Chỉ khách thuê mới được báo' }

    const parsed = tenantSubmitProofSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { month, year, amount_reported, proof_images, note } = parsed.data
    const invoice = await findInvoiceForTenantMonth(user.userId, month, year)
    if (!invoice) {
      return { success: false, error: `Chưa có hóa đơn cho tháng ${month}/${year}. Vui lòng liên hệ chủ trọ.` }
    }

    await createPaymentProof({
      invoice_id:      invoice.id,
      tenant_id:       user.userId,
      amount_reported,
      proof_images,
      note,
    })

    revalidatePath('/tenant/payments')
    revalidatePath('/admin/finance/payments')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi khi gửi' }
  }
}
