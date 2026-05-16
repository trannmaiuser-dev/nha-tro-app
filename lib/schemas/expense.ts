import { z } from 'zod'

export const expenseSchema = z.object({
  room_id:      z.string().uuid().nullable().optional(),
  expense_type: z.enum(['repair', 'maintenance', 'purchase', 'general', 'other']),
  amount:       z.number().int().min(1, 'Số tiền phải lớn hơn 0'),
  description:  z.string().min(1, 'Vui lòng nhập mô tả').max(500, 'Mô tả tối đa 500 ký tự'),
  expense_date: z.string().min(10, 'Ngày không hợp lệ'),
  receipt_images: z.array(z.string().url()).max(3, 'Tối đa 3 ảnh'),
})
export type ExpenseInput = z.infer<typeof expenseSchema>
