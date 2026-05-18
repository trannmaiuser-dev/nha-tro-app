import { z } from 'zod'

export const moveRequestSchema = z.object({
  requested_date: z.string().min(1, 'Vui lòng chọn ngày dự kiến chuyển đi'),
  reason: z.string().max(500, 'Lý do tối đa 500 ký tự').optional(),
})

export type MoveRequestInput = z.infer<typeof moveRequestSchema>

// T-020: transfer schema mở rộng — thêm transfer_to_room_id (NOT NULL).
export const transferRequestSchema = z.object({
  requested_date:      z.string().min(1, 'Vui lòng chọn ngày dự kiến chuyển'),
  reason:              z.string().max(500, 'Lý do tối đa 500 ký tự').optional(),
  transfer_to_room_id: z.string().uuid('ID phòng đích không hợp lệ'),
})

export type TransferRequestInput = z.infer<typeof transferRequestSchema>
