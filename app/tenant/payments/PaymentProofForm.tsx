'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useState } from 'react'
import { tenantSubmitProofSchema, type TenantSubmitProofInput } from '@/lib/schemas/payment-proof'
import MultiImageUpload from '@/components/ui/MultiImageUpload'
import { submitPaymentProofAction } from './actions'

interface Props {
  onClose:    () => void
  onSuccess?: () => void
}

export default function PaymentProofForm({ onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false)

  const now   = new Date()
  const thisM = now.getMonth() + 1
  const thisY = now.getFullYear()
  // Mặc định: tháng trước (vì tháng này có thể chưa có HĐ)
  const defaultMonth = thisM === 1 ? 12 : thisM - 1
  const defaultYear  = thisM === 1 ? thisY - 1 : thisY

  const {
    register, control, handleSubmit, formState: { errors },
  } = useForm<TenantSubmitProofInput>({
    resolver: zodResolver(tenantSubmitProofSchema),
    defaultValues: {
      month:           defaultMonth,
      year:            defaultYear,
      amount_reported: 0,
      proof_images:    [],
      note:            '',
    },
  })

  async function onSubmit(data: TenantSubmitProofInput) {
    setSubmitting(true)
    const res = await submitPaymentProofAction(data)
    setSubmitting(false)
    if (res.success) {
      toast.success('Đã gửi bằng chứng. Chờ chủ trọ duyệt.')
      onSuccess?.()
      onClose()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">Tháng <span className="text-red-400">*</span></label>
          <select
            {...register('month', { valueAsNumber: true })}
            className={`input-field w-full ${errors.month ? 'error' : ''}`}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">Năm <span className="text-red-400">*</span></label>
          <input
            {...register('year', { valueAsNumber: true })}
            type="number" min={2020} max={2100}
            className={`input-field w-full ${errors.year ? 'error' : ''}`}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">
          Số tiền đã chuyển (VNĐ) <span className="text-red-400">*</span>
        </label>
        <input
          {...register('amount_reported', { valueAsNumber: true })}
          type="number" min={1} step={10000}
          className={`input-field w-full ${errors.amount_reported ? 'error' : ''}`}
          placeholder="3500000"
        />
        {errors.amount_reported && <p className="text-xs text-red-500 mt-1">{errors.amount_reported.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">
          Ảnh chứng minh <span className="text-red-400">*</span>
        </label>
        <Controller
          control={control}
          name="proof_images"
          render={({ field }) => (
            <MultiImageUpload
              value={field.value}
              onChange={field.onChange}
              uploadUrl="/api/upload/payment-proof"
              maxImages={5}
            />
          )}
        />
        {errors.proof_images && <p className="text-xs text-red-500 mt-1">{errors.proof_images.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">Ghi chú (tùy chọn)</label>
        <textarea
          {...register('note')}
          rows={2}
          className="input-field w-full resize-none"
          placeholder="Vd: Đã chuyển khoản qua VCB, mã giao dịch..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary flex-1">
          Hủy
        </button>
        <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Gửi báo cáo
        </button>
      </div>
    </form>
  )
}
