'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  feesSettingsSchema,
  type FeesSettingsInput,
} from '@/lib/schemas/settings'
import { updateSettingsAction } from '../actions'

interface Props {
  defaults: FeesSettingsInput
}

interface FeeRowProps {
  title: string
  hint: string
  enabledRegisterName: keyof FeesSettingsInput
  amountRegisterName: keyof FeesSettingsInput
  amountLabel: string
  register: ReturnType<typeof useForm<FeesSettingsInput>>['register']
  watch: ReturnType<typeof useForm<FeesSettingsInput>>['watch']
  errors: ReturnType<typeof useForm<FeesSettingsInput>>['formState']['errors']
  amountStep?: number
}

function FeeRow({ title, hint, enabledRegisterName, amountRegisterName, amountLabel, register, watch, errors, amountStep = 1000 }: FeeRowProps) {
  const enabled = watch(enabledRegisterName) as boolean

  return (
    <section className="bg-white rounded-2xl p-4 shadow-soft">
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <p className="font-bold text-gray-700">{title}</p>
          <p className="text-xs text-gray-400">{hint}</p>
        </div>
        <input
          {...register(enabledRegisterName)}
          type="checkbox"
          className="w-5 h-5 rounded text-primary-500 cursor-pointer"
        />
      </label>
      {enabled && (
        <div className="mt-3">
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            {amountLabel} <span className="text-red-400">*</span>
          </label>
          <input
            {...register(amountRegisterName, { valueAsNumber: true })}
            type="number" min={0} step={amountStep}
            className={`input-field w-full ${errors[amountRegisterName] ? 'error' : ''}`}
          />
          {errors[amountRegisterName] && (
            <p className="text-xs text-red-500 mt-1">{errors[amountRegisterName]?.message as string}</p>
          )}
        </div>
      )}
    </section>
  )
}

export default function FeesSettingsForm({ defaults }: Props) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FeesSettingsInput>({
    resolver: zodResolver(feesSettingsSchema),
    defaultValues: defaults,
  })

  const overCapEnabled = watch('over_capacity_fee_enabled')

  async function onSubmit(data: FeesSettingsInput) {
    setLoading(true)
    const res = await updateSettingsAction('fees', data)
    setLoading(false)
    if (res.success) toast.success('Đã lưu cài đặt phí khác')
    else toast.error(res.error)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FeeRow
        title="🗑️ Phí rác"
        hint="Cố định / phòng / tháng"
        enabledRegisterName="trash_fee_enabled"
        amountRegisterName="trash_fee_amount"
        amountLabel="Số tiền (VNĐ / phòng / tháng)"
        register={register} watch={watch} errors={errors}
      />

      <FeeRow
        title="🛵 Phí gửi xe"
        hint="Tính theo xe"
        enabledRegisterName="parking_fee_enabled"
        amountRegisterName="parking_fee_per_vehicle"
        amountLabel="Số tiền (VNĐ / xe / tháng)"
        register={register} watch={watch} errors={errors}
        amountStep={10000}
      />

      <FeeRow
        title="📶 Phí internet/wifi"
        hint="Cố định / phòng / tháng"
        enabledRegisterName="internet_fee_enabled"
        amountRegisterName="internet_fee_amount"
        amountLabel="Số tiền (VNĐ / phòng / tháng)"
        register={register} watch={watch} errors={errors}
      />

      {/* Phụ phí quá người - đặc biệt vì có 2 input */}
      <section className="bg-white rounded-2xl p-4 shadow-soft">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-bold text-gray-700">👥 Phụ phí quá người</p>
            <p className="text-xs text-gray-400">Tính thêm khi vượt ngưỡng số người</p>
          </div>
          <input
            {...register('over_capacity_fee_enabled')}
            type="checkbox"
            className="w-5 h-5 rounded text-primary-500 cursor-pointer"
          />
        </label>
        {overCapEnabled && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Ngưỡng (lớn hơn N người)
              </label>
              <input
                {...register('over_capacity_threshold', { valueAsNumber: true })}
                type="number" min={1} max={20}
                className={`input-field w-full ${errors.over_capacity_threshold ? 'error' : ''}`}
              />
              {errors.over_capacity_threshold && (
                <p className="text-xs text-red-500 mt-1">{errors.over_capacity_threshold.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">
                Phụ phí (VNĐ)
              </label>
              <input
                {...register('over_capacity_fee_amount', { valueAsNumber: true })}
                type="number" min={0} step={10000}
                className={`input-field w-full ${errors.over_capacity_fee_amount ? 'error' : ''}`}
              />
              {errors.over_capacity_fee_amount && (
                <p className="text-xs text-red-500 mt-1">{errors.over_capacity_fee_amount.message}</p>
              )}
            </div>
          </div>
        )}
      </section>

      <button
        type="submit"
        className="btn-primary w-full flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Lưu cài đặt phí khác
      </button>
    </form>
  )
}
