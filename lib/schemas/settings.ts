import { z } from 'zod'

// ─── Tab 1: Điện nước ──────────────────────────────────────
export const utilitiesSettingsSchema = z.object({
  electricity_rate_default: z
    .number()
    .int('Đơn giá phải là số nguyên')
    .min(1, 'Đơn giá phải lớn hơn 0'),

  water_billing_mode: z.enum(['per_m3', 'per_person', 'fixed'], {
    error: 'Mode tính nước không hợp lệ',
  }),

  water_rate_per_m3: z
    .number()
    .int('Đơn giá phải là số nguyên')
    .min(0, 'Đơn giá phải lớn hơn hoặc bằng 0'),

  water_rate_per_person: z
    .number()
    .int('Đơn giá phải là số nguyên')
    .min(0, 'Đơn giá phải lớn hơn hoặc bằng 0'),

  water_rate_fixed: z
    .number()
    .int('Đơn giá phải là số nguyên')
    .min(0, 'Đơn giá phải lớn hơn hoặc bằng 0'),
})
export type UtilitiesSettingsInput = z.infer<typeof utilitiesSettingsSchema>

// ─── Tab 2: Phí khác ──────────────────────────────────────
export const feesSettingsSchema = z.object({
  trash_fee_enabled:         z.boolean(),
  trash_fee_amount:          z.number().int().min(0, 'Phải lớn hơn hoặc bằng 0'),

  parking_fee_enabled:       z.boolean(),
  parking_fee_per_vehicle:   z.number().int().min(0, 'Phải lớn hơn hoặc bằng 0'),

  internet_fee_enabled:      z.boolean(),
  internet_fee_amount:       z.number().int().min(0, 'Phải lớn hơn hoặc bằng 0'),

  over_capacity_fee_enabled: z.boolean(),
  over_capacity_threshold:   z.number().int().min(1, 'Ngưỡng phải lớn hơn 0').max(20, 'Tối đa 20'),
  over_capacity_fee_amount:  z.number().int().min(0, 'Phải lớn hơn hoặc bằng 0'),
})
export type FeesSettingsInput = z.infer<typeof feesSettingsSchema>

// ─── Tab 3: Thời gian ─────────────────────────────────────
export const timingSettingsSchema = z.object({
  meter_reading_day:        z.number().int().min(1, 'Từ 1 đến 28').max(28, 'Từ 1 đến 28'),
  payment_due_day:          z.number().int().min(1, 'Từ 1 đến 28').max(28, 'Từ 1 đến 28'),
  overdue_warning_days:     z.number().int().min(1, 'Tối thiểu 1 ngày').max(60, 'Tối đa 60'),
  overdue_remind_interval:  z.number().int().min(1, 'Tối thiểu 1 ngày').max(30, 'Tối đa 30'),
})
export type TimingSettingsInput = z.infer<typeof timingSettingsSchema>

// ─── Tab 4: Khác ──────────────────────────────────────────
export const miscSettingsSchema = z.object({
  default_password_pattern: z.enum(['last_6_id_card', 'last_6_phone', 'random_6_digits']),
  data_retention_years:     z.number().int().min(1).max(10),
})
export type MiscSettingsInput = z.infer<typeof miscSettingsSchema>

export type SettingsSection = 'utilities' | 'fees' | 'timing' | 'misc'
