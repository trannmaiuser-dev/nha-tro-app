'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  miscSettingsSchema,
  type MiscSettingsInput,
} from '@/lib/schemas/settings'
import { updateSettingsAction } from '../actions'

interface Props {
  defaults: MiscSettingsInput
}

const PASSWORD_OPTIONS = [
  { value: 'last_6_id_card',  label: '6 số cuối CCCD' },
  { value: 'last_6_phone',    label: '6 số cuối số điện thoại' },
  { value: 'random_6_digits', label: '6 số ngẫu nhiên' },
] as const

export default function MiscSettingsForm({ defaults }: Props) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<MiscSettingsInput>({
    resolver: zodResolver(miscSettingsSchema),
    defaultValues: defaults,
  })

  async function onSubmit(data: MiscSettingsInput) {
    setLoading(true)
    const res = await updateSettingsAction('misc', data)
    setLoading(false)
    if (res.success) toast.success('Đã lưu cài đặt khác')
    else toast.error(res.error)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <section className="bg-white rounded-2xl p-4 shadow-soft space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Pattern mật khẩu tạm cho khách mới <span className="text-red-400">*</span>
          </label>
          <select
            {...register('default_password_pattern')}
            className={`input-field w-full ${errors.default_password_pattern ? 'error' : ''}`}
          >
            {PASSWORD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Khách thuê dùng mật khẩu này khi đăng nhập lần đầu, sau đó được yêu cầu đổi.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Số năm giữ dữ liệu khách đã chuyển đi <span className="text-red-400">*</span>
          </label>
          <input
            {...register('data_retention_years', { valueAsNumber: true })}
            type="number" min={1} max={10}
            className={`input-field w-full ${errors.data_retention_years ? 'error' : ''}`}
          />
          {errors.data_retention_years && (
            <p className="text-xs text-red-500 mt-1">{errors.data_retention_years.message}</p>
          )}
        </div>
      </section>

      <button
        type="submit"
        className="btn-primary w-full flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Lưu cài đặt khác
      </button>
    </form>
  )
}
