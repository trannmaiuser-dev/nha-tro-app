import { z } from 'zod'

export const createPaymentProofSchema = z.object({
  invoice_id:      z.string().uuid('Hóa đơn không hợp lệ'),
  amount_reported: z.number().int('Số tiền phải là số nguyên').min(1, 'Số tiền phải lớn hơn 0'),
  proof_images:    z.array(z.string().url('URL ảnh không hợp lệ')).min(1, 'Cần ít nhất 1 ảnh chứng minh').max(5, 'Tối đa 5 ảnh'),
  note:            z.string().max(500).nullable().optional(),
})
export type CreatePaymentProofInput = z.infer<typeof createPaymentProofSchema>

/** Tenant tạo proof bằng cách chọn tháng/năm (không cần biết invoice_id) */
export const tenantSubmitProofSchema = z.object({
  month:           z.number().int().min(1).max(12),
  year:            z.number().int().min(2020).max(2100),
  amount_reported: z.number().int().min(1, 'Số tiền phải lớn hơn 0'),
  proof_images:    z.array(z.string().url()).min(1, 'Cần ít nhất 1 ảnh').max(5, 'Tối đa 5 ảnh'),
  note:            z.string().max(500).nullable().optional(),
})
export type TenantSubmitProofInput = z.infer<typeof tenantSubmitProofSchema>

export const approvePartialSchema = z.object({
  proof_id:        z.string().uuid(),
  amount_approved: z.number().int().min(1, 'Số tiền phải lớn hơn 0'),
})
export type ApprovePartialInput = z.infer<typeof approvePartialSchema>

export const rejectProofSchema = z.object({
  proof_id:       z.string().uuid(),
  rejection_note: z.string().min(1, 'Vui lòng nhập lý do').max(500),
})
export type RejectProofInput = z.infer<typeof rejectProofSchema>
