import { z } from 'zod'

export const moveRequestSchema = z.object({
  requested_date: z.string().min(1, 'Vui lòng chọn ngày dự kiến chuyển đi'),
  reason: z.string().max(500, 'Lý do tối đa 500 ký tự').optional(),
})

export type MoveRequestInput = z.infer<typeof moveRequestSchema>
