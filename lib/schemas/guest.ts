import { z } from 'zod'

export const guestSchema = z.object({
  guest_name:       z.string().min(2, 'Tên khách ít nhất 2 ký tự').max(50, 'Tên khách tối đa 50 ký tự'),
  number_of_nights: z.number().int('Số đêm phải là số nguyên').min(1, 'Ít nhất 1 đêm').max(7, 'Tối đa 7 đêm'),
  note:             z.string().max(200, 'Ghi chú tối đa 200 ký tự').optional(),
})

export type GuestInput = z.infer<typeof guestSchema>
