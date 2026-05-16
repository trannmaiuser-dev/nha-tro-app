import { z } from 'zod'

export const extraItemSchema = z.object({
  label:  z.string().min(1, 'Tên phụ phí').max(100),
  amount: z.number().int().min(1, 'Số tiền phải lớn hơn 0'),
})
export type ExtraItemInput = z.infer<typeof extraItemSchema>

export const invoicePreviewRowSchema = z.object({
  room_id:             z.string().uuid(),
  rent_amount:         z.number().int().min(0),
  electricity_amount:  z.number().int().min(0),
  electricity_log_id:  z.string().uuid().nullable().optional(),
  water_billing_mode:  z.enum(['per_m3', 'per_person', 'fixed']),
  water_amount:        z.number().int().min(0),
  trash_fee:           z.number().int().min(0),
  parking_fee:         z.number().int().min(0),
  internet_fee:        z.number().int().min(0),
  over_capacity_fee:   z.number().int().min(0),
  extra_items:         z.array(extraItemSchema),
  total:               z.number().int().min(0),
  due_date:            z.string().min(10, 'Hạn đóng không hợp lệ'),
  note:                z.string().max(500).nullable().optional(),
})
export type InvoicePreviewRowInput = z.infer<typeof invoicePreviewRowSchema>

export const createInvoicesSchema = z.object({
  month:   z.number().int().min(1).max(12),
  year:    z.number().int().min(2020).max(2100),
  rows:    z.array(invoicePreviewRowSchema).min(1, 'Phải có ít nhất 1 hóa đơn'),
})
export type CreateInvoicesInput = z.infer<typeof createInvoicesSchema>

export const updateInvoiceSchema = invoicePreviewRowSchema.partial().extend({
  id: z.string().uuid(),
})
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>
