'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  utilitiesSettingsSchema,
  type UtilitiesSettingsInput,
} from '@/lib/schemas/settings'
import { updateSettingsAction } from '../actions'

interface Props {
  defaults: UtilitiesSettingsInput
}

const MODE_OPTIONS = [
  { value: 'per_m3',     label: 'Theo m³ tiêu thụ',           hint: 'Có chỉ số đầu/cuối, giống điện' },
  { value: 'per_person', label: 'Theo đầu người',             hint: 'Mỗi người X đồng/tháng' },
  { value: 'fixed',      label: 'Cố định / phòng / tháng',    hint: 'X đồng / phòng bất kể số người' },
] as const

export default function UtilitiesSettingsForm({ defaults }: Props) {
  const [loading, setLoading] = useState(false)

  const {
    register, handleSubmit, watch, formState: { errors },
  } = useForm<UtilitiesSettingsInput>({
    resolver: zodResolver(utilitiesSettingsSchema),
    defaultValues: defaults,
  })

  const mode = watch('water_billing_mode')

  async function onSubmit(data: UtilitiesSettingsInput) {
    setLoading(true)
    const res = await updateSettingsAction('utilities', data)
    setLoading(false)
    if (res.success) toast.success('Đã lưu cài đặt điện nước')
    else toast.error(res.error)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Điện */}
      <section className="bg-white rounded-2xl p-4 shadow-soft">
        <h3 className="font-bold text-gray-700 mb-3">⚡ Đơn giá điện mặc định</h3>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">
          VNĐ / kWh <span className="text-red-400">*</span>
        </label>
        <input
          {...register('electricity_rate_default', { valueAsNumber: true })}
          type="number" min={0} step={100}
          className={`input-field w-full ${errors.electricity_rate_default ? 'error' : ''}`}
        />
        {errors.electricity_rate_default && (
          <p className="text-xs text-red-500 mt-1">{errors.electricity_rate_default.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Áp dụng cho phòng chưa cài đặt giá riêng. Có thể đặt giá riêng từng phòng ở trang Quản lý phòng.
        </p>
      </section>

      {/* Nước - mode */}
      <section className="bg-white rounded-2xl p-4 shadow-soft">
        <h3 className="font-bold text-gray-700 mb-3">💧 Cách tính tiền nước</h3>
        <div className="space-y-2">
          {MODE_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                mode === opt.value
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                {...register('water_billing_mode')}
                type="radio"
                value={opt.value}
                className="mt-1"
              />
              <div>
                <p className="font-bold text-sm text-gray-700">{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.hint}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {mode === 'per_m3' && (
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Đơn giá theo m³ (VNĐ) <span className="text-red-400">*</span>
              </label>
              <input
                {...register('water_rate_per_m3', { valueAsNumber: true })}
                type="number" min={0} step={1000}
                className={`input-field w-full ${errors.water_rate_per_m3 ? 'error' : ''}`}
              />
              {errors.water_rate_per_m3 && (
                <p className="text-xs text-red-500 mt-1">{errors.water_rate_per_m3.message}</p>
              )}
            </div>
          )}
          {mode === 'per_person' && (
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Đơn giá / đầu người / tháng (VNĐ) <span className="text-red-400">*</span>
              </label>
              <input
                {...register('water_rate_per_person', { valueAsNumber: true })}
                type="number" min={0} step={1000}
                className={`input-field w-full ${errors.water_rate_per_person ? 'error' : ''}`}
              />
              {errors.water_rate_per_person && (
                <p className="text-xs text-red-500 mt-1">{errors.water_rate_per_person.message}</p>
              )}
            </div>
          )}
          {mode === 'fixed' && (
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Đơn giá cố định / phòng / tháng (VNĐ) <span className="text-red-400">*</span>
              </label>
              <input
                {...register('water_rate_fixed', { valueAsNumber: true })}
                type="number" min={0} step={1000}
                className={`input-field w-full ${errors.water_rate_fixed ? 'error' : ''}`}
              />
              {errors.water_rate_fixed && (
                <p className="text-xs text-red-500 mt-1">{errors.water_rate_fixed.message}</p>
              )}
            </div>
          )}
          {/* Hidden inputs để giữ các giá trị mode khác */}
          {mode !== 'per_m3'     && <input type="hidden" {...register('water_rate_per_m3',     { valueAsNumber: true })} />}
          {mode !== 'per_person' && <input type="hidden" {...register('water_rate_per_person', { valueAsNumber: true })} />}
          {mode !== 'fixed'      && <input type="hidden" {...register('water_rate_fixed',      { valueAsNumber: true })} />}
        </div>
      </section>

      <button
        type="submit"
        className="btn-primary w-full flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Lưu cài đặt điện nước
      </button>
    </form>
  )
}
