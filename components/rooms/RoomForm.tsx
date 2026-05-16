'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { roomSchema, type RoomSchemaInput } from '@/lib/schemas/room'
import type { Room } from '@/types'

interface Props {
  defaultValues?: Partial<Room>
  mode: 'create' | 'edit'
  onSubmit: (data: RoomSchemaInput) => Promise<void>
  onCancel: () => void
  loading?: boolean
  /** Đơn giá điện mặc định từ app_settings, hiển thị làm placeholder */
  defaultElectricityRate?: number
}

const STATUS_OPTIONS = [
  { value: 'vacant',      label: 'Phòng trống' },
  { value: 'occupied',    label: 'Có người' },
  { value: 'maintenance', label: 'Bảo trì' },
] as const

export default function RoomForm({ defaultValues, mode, onSubmit, onCancel, loading = false, defaultElectricityRate }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoomSchemaInput>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name:             defaultValues?.name             ?? '',
      price:            defaultValues?.price            ?? 0,
      deposit:          defaultValues?.deposit          ?? 0,
      floor:            defaultValues?.floor            ?? 1,
      status:           defaultValues?.status           ?? 'vacant',
      note:             defaultValues?.note             ?? '',
      electricity_rate: defaultValues?.electricity_rate ?? null,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Tên phòng */}
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">
          Tên phòng <span className="text-red-400">*</span>
        </label>
        <input
          {...register('name')}
          placeholder="Vd: P101, P201..."
          className={`input-field w-full ${errors.name ? 'error' : ''}`}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      {/* Giá thuê + Tiền cọc */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Giá thuê (đ) <span className="text-red-400">*</span>
          </label>
          <input
            {...register('price', { valueAsNumber: true })}
            type="number"
            min={0}
            step={100000}
            placeholder="3500000"
            className={`input-field w-full ${errors.price ? 'error' : ''}`}
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Tiền cọc (đ) <span className="text-red-400">*</span>
          </label>
          <input
            {...register('deposit', { valueAsNumber: true })}
            type="number"
            min={0}
            step={100000}
            placeholder="3500000"
            className={`input-field w-full ${errors.deposit ? 'error' : ''}`}
          />
          {errors.deposit && <p className="text-xs text-red-500 mt-1">{errors.deposit.message}</p>}
        </div>
      </div>

      {/* Tầng + Trạng thái */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Tầng <span className="text-red-400">*</span>
          </label>
          <input
            {...register('floor', { valueAsNumber: true })}
            type="number"
            min={1}
            max={20}
            placeholder="1"
            className={`input-field w-full ${errors.floor ? 'error' : ''}`}
          />
          {errors.floor && <p className="text-xs text-red-500 mt-1">{errors.floor.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">
            Trạng thái <span className="text-red-400">*</span>
          </label>
          <select
            {...register('status')}
            className={`input-field w-full ${errors.status ? 'error' : ''}`}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status.message}</p>}
        </div>
      </div>

      {/* Ghi chú */}
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">Ghi chú</label>
        <textarea
          {...register('note')}
          placeholder="Ghi chú thêm về phòng (không bắt buộc)..."
          rows={2}
          className={`input-field w-full resize-none ${errors.note ? 'error' : ''}`}
        />
        {errors.note && <p className="text-xs text-red-500 mt-1">{errors.note.message}</p>}
      </div>

      {/* Đơn giá điện riêng cho phòng */}
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1.5">
          Đơn giá điện riêng (VNĐ / kWh)
        </label>
        <input
          {...register('electricity_rate', {
            setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
          })}
          type="number"
          min={1}
          step={100}
          placeholder={
            defaultElectricityRate
              ? `Để trống = dùng mặc định ${defaultElectricityRate.toLocaleString('vi-VN')}đ`
              : 'Để trống = dùng mặc định'
          }
          className={`input-field w-full ${errors.electricity_rate ? 'error' : ''}`}
        />
        {errors.electricity_rate && (
          <p className="text-xs text-red-500 mt-1">{errors.electricity_rate.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Áp dụng riêng cho phòng này. Để trống nếu dùng đơn giá chung.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>
          Hủy
        </button>
        <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {mode === 'create' ? 'Thêm phòng' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  )
}
