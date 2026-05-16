'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useState } from 'react'
import { expenseSchema, type ExpenseInput } from '@/lib/schemas/expense'
import MultiImageUpload from '@/components/ui/MultiImageUpload'
import type { Room, ExpenseType } from '@/types'
import { createExpenseAction } from './actions'

interface Props {
  rooms:     Pick<Room, 'id' | 'name'>[]
  onClose:   () => void
  onSuccess?: () => void
}

const TYPE_OPTIONS: { value: ExpenseType; label: string }[] = [
  { value: 'repair',      label: 'Sửa chữa' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'purchase',    label: 'Mua sắm' },
  { value: 'general',     label: 'Chi phí chung' },
  { value: 'other',       label: 'Khác' },
]

export default function ExpenseForm({ rooms, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const { register, control, handleSubmit, formState: { errors } } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      room_id:        null,
      expense_type:   'repair',
      amount:         0,
      description:    '',
      expense_date:   today,
      receipt_images: [],
    },
  })

  async function onSubmit(data: ExpenseInput) {
    setSubmitting(true)
    const res = await createExpenseAction({
      ...data,
      room_id: data.room_id === '' ? null : data.room_id,
    })
    setSubmitting(false)
    if (res.success) {
      toast.success('Đã thêm chi phí')
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
          <label className="block text-sm font-bold text-gray-600 mb-1.5">Loại chi <span className="text-red-400">*</span></label>
          <select {...register('expense_type')} className="input-field w-full">
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">Phòng</label>
          <select {...register('room_id')} className="input-field w-full">
            <option value="">Toàn nhà (không thuộc phòng nào)</option>
            {rooms.map(r => <option key={r.id} value={r.id}>Phòng {r.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">Số tiền (VNĐ) <span className="text-red-400">*</span></label>
        <input
          {...register('amount', { valueAsNumber: true })}
          type="number" min={1} step={10000}
          className={`input-field w-full ${errors.amount ? 'error' : ''}`}
        />
        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">Ngày phát sinh <span className="text-red-400">*</span></label>
        <input
          {...register('expense_date')}
          type="date"
          className={`input-field w-full ${errors.expense_date ? 'error' : ''}`}
        />
        {errors.expense_date && <p className="text-xs text-red-500 mt-1">{errors.expense_date.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">Mô tả <span className="text-red-400">*</span></label>
        <textarea
          {...register('description')}
          rows={2}
          placeholder="Vd: Sửa bồn cầu phòng 201..."
          className={`input-field w-full resize-none ${errors.description ? 'error' : ''}`}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">Ảnh biên lai (tùy chọn, tối đa 3)</label>
        <Controller
          control={control}
          name="receipt_images"
          render={({ field }) => (
            <MultiImageUpload
              value={field.value ?? []}
              onChange={field.onChange}
              uploadUrl="/api/upload/expense-receipt"
              maxImages={3}
            />
          )}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary flex-1">Hủy</button>
        <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Lưu chi phí
        </button>
      </div>
    </form>
  )
}
