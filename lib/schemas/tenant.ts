import { z } from 'zod'

export const createTenantSchema = z.object({
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số'),
  // T-016c D22: CCCD optional — không còn dùng làm password (D19 đã chuyển sang random 8 ký tự).
  // Vẫn nhận để admin có thể nhập sớm; nếu trống, khách điền khi onboarding.
  id_card_number: z
    .string()
    .regex(/^\d{9}(\d{3})?$/, 'CCCD/CMND phải có 9 hoặc 12 chữ số')
    .optional()
    .or(z.literal('')),
  room_id: z.string().uuid('Phòng không hợp lệ'),
  full_name: z
    .string()
    .min(2, 'Họ tên ít nhất 2 ký tự')
    .max(100, 'Họ tên tối đa 100 ký tự')
    .optional(),
})

export const updateTenantProfileSchema = z.object({
  full_name:   z.string().min(2, 'Họ tên ít nhất 2 ký tự').max(100).optional(),
  dob:         z.string().optional().nullable(),
  gender:      z.enum(['male', 'female', 'other']).optional().nullable(),
  cccd_number: z.string().regex(/^\d{9}(\d{3})?$/, 'CCCD/CMND phải có 9 hoặc 12 chữ số').optional().nullable(),
  address:     z.string().max(300, 'Địa chỉ tối đa 300 ký tự').optional().nullable(),
  occupation:  z.string().max(100).optional().nullable(),
  avatar_url:  z.string().url('URL ảnh không hợp lệ').optional().nullable(),
})

export const emergencyContactSchema = z.object({
  full_name:    z.string().min(2, 'Họ tên ít nhất 2 ký tự').max(100),
  relationship: z.string().min(1, 'Vui lòng nhập mối quan hệ').max(50),
  phone:        z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ'),
  address:      z.string().max(300).optional().nullable(),
  gender:       z.enum(['male', 'female', 'other']).optional().nullable(),
  dob:          z.string().optional().nullable(),
  avatar_url:   z.string().url().optional().nullable(),
})

export const bankAccountSchema = z.object({
  bank_name:      z.string().min(1, 'Vui lòng nhập tên ngân hàng').max(100),
  account_number: z.string().min(6, 'Số tài khoản ít nhất 6 ký tự').max(30),
  account_holder: z.string().min(2, 'Tên chủ tài khoản ít nhất 2 ký tự').max(100),
})

export type CreateTenantInput     = z.infer<typeof createTenantSchema>
export type UpdateTenantProfile   = z.infer<typeof updateTenantProfileSchema>
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>
export type BankAccountInput      = z.infer<typeof bankAccountSchema>
