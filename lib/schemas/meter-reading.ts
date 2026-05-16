import { z } from 'zod'

export const meterReadingSchema = z.object({
  room_id:        z.string().uuid('Phòng không hợp lệ'),
  month:          z.number().int().min(1).max(12),
  year:           z.number().int().min(2020).max(2100),

  prev_kwh:       z.number().int().min(0, 'Chỉ số phải lớn hơn hoặc bằng 0'),
  curr_kwh:       z.number().int().min(0, 'Chỉ số phải lớn hơn hoặc bằng 0'),

  prev_water_m3:  z.number().int().min(0).nullable().optional(),
  curr_water_m3:  z.number().int().min(0).nullable().optional(),
})
export type MeterReadingInput = z.infer<typeof meterReadingSchema>

export const bulkMeterReadingSchema = z.object({
  month:    z.number().int().min(1).max(12),
  year:     z.number().int().min(2020).max(2100),
  readings: z.array(meterReadingSchema.omit({ month: true, year: true })).min(1, 'Phải có ít nhất 1 chỉ số'),
})
export type BulkMeterReadingInput = z.infer<typeof bulkMeterReadingSchema>

export const updateMeterReadingSchema = z.object({
  prev_kwh:      z.number().int().min(0).optional(),
  curr_kwh:      z.number().int().min(0).optional(),
  prev_water_m3: z.number().int().min(0).nullable().optional(),
  curr_water_m3: z.number().int().min(0).nullable().optional(),
  reason:        z.string().min(1, 'Vui lòng nhập lý do sửa').max(200),
})
export type UpdateMeterReadingInput = z.infer<typeof updateMeterReadingSchema>
