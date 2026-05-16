'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  timingSettingsSchema,
  type TimingSettingsInput,
} from '@/lib/schemas/settings'
import { updateSettingsAction } from '../actions'

interface Props {
  defaults: TimingSettingsInput
}

export default function TimingSettingsForm({ defaults }: Props) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<TimingSettingsInput>({
    resolver: zodResolver(timingSettingsSchema),
    defaultValues: defaults,
  })

  async function onSubmit(data: TimingSettingsInput) {
    setLoading(true)
    const res = await updateSettingsAction('timing', data)
    setLoading(false)
    if (res.success) toast.success('Đã lưu cài đặt thời gian')
    else toast.error(res.error)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <section className="bg-white rounded-2xl p-4 shadow-soft space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Ngày chốt chỉ số điện nước <span className="text-red-400">*</span>
          </label>
          <input
            {...register('meter_reading_day', { valueAsNumber: true })}
            type="number" min={1} max={28}
            className={`input-field w-full ${errors.meter_reading_day ? 'error' : ''}`}
          />
          {errors.meter_reading_day && (
            <p className="text-xs text-red-500 mt-1">{errors.meter_reading_day.message}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Ngày trong tháng (1-28). Hệ thống sẽ nhắc chốt số.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Ngày phải đóng tiền <span className="text-red-400">*</span>
          </label>
          <input
            {...register('payment_due_day', { valueAsNumber: true })}
            type="number" min={1} max={28}
            className={`input-field w-full ${errors.payment_due_day ? 'error' : ''}`}
          />
          {errors.payment_due_day && (
            <p className="text-xs text-red-500 mt-1">{errors.payment_due_day.message}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Hạn đóng tiền của hóa đơn tháng trước.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Cảnh báo nợ sau N ngày <span className="text-red-400">*</span>
          </label>
          <input
            {...register('overdue_warning_days', { valueAsNumber: true })}
            type="number" min={1} max={60}
            className={`input-field w-full ${errors.overdue_warning_days ? 'error' : ''}`}
          />
          {errors.overdue_warning_days && (
            <p className="text-xs text-red-500 mt-1">{errors.overdue_warning_days.message}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Số ngày quá hạn trước khi bắt đầu cảnh báo.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Lặp lại nhắc nhở mỗi N ngày <span className="text-red-400">*</span>
          </label>
          <input
            {...register('overdue_remind_interval', { valueAsNumber: true })}
            type="number" min={1} max={30}
            className={`input-field w-full ${errors.overdue_remind_interval ? 'error' : ''}`}
          />
          {errors.overdue_remind_interval && (
            <p className="text-xs text-red-500 mt-1">{errors.overdue_remind_interval.message}</p>
          )}
        </div>
      </section>

      <button
        type="submit"
        className="btn-primary w-full flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Lưu cài đặt thời gian
      </button>
    </form>
  )
}
