import { z } from 'zod'

export const roomSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên phòng không được để trống')
    .max(50, 'Tên phòng tối đa 50 ký tự'),

  price: z
    .number()
    .int('Giá thuê phải là số nguyên')
    .min(0, 'Giá thuê phải lớn hơn hoặc bằng 0'),

  deposit: z
    .number()
    .int('Tiền cọc phải là số nguyên')
    .min(0, 'Tiền cọc phải lớn hơn hoặc bằng 0'),

  floor: z
    .number()
    .int('Tầng phải là số nguyên')
    .min(1, 'Tầng phải từ 1 đến 20')
    .max(20, 'Tầng phải từ 1 đến 20'),

  status: z.enum(['vacant', 'occupied', 'maintenance'], {
    error: 'Trạng thái không hợp lệ',
  }),

  note: z
    .string()
    .max(500, 'Ghi chú tối đa 500 ký tự')
    .nullable()
    .optional(),

  electricity_rate: z
    .number()
    .int('Đơn giá phải là số nguyên')
    .min(1, 'Đơn giá phải lớn hơn 0')
    .nullable()
    .optional(),
})

export type RoomSchemaInput = z.infer<typeof roomSchema>
