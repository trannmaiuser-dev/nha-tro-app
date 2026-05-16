'use client'

import type { Room } from '@/types'
import { PencilIcon, TrashIcon } from 'lucide-react'

interface Props {
  room: Room
  onEdit: (room: Room) => void
  onDelete: (room: Room) => void
  /** Đơn giá điện default từ app_settings (dùng khi room.electricity_rate = null) */
  defaultElectricityRate?: number
}

const STATUS_CONFIG = {
  vacant:      { label: 'Phòng trống', cls: 'badge-gray' },
  occupied:    { label: 'Có người',    cls: 'badge-green' },
  maintenance: { label: 'Bảo trì',    cls: 'badge-orange' },
} as const

export default function RoomCard({ room, onEdit, onDelete, defaultElectricityRate }: Props) {
  const status = STATUS_CONFIG[room.status as keyof typeof STATUS_CONFIG]
  const elecRate = room.electricity_rate ?? defaultElectricityRate ?? null
  const elecIsOverride = room.electricity_rate != null

  return (
    <div className="card flex flex-col gap-3">
      {/* Header: tên + trạng thái */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${
            room.status === 'occupied' ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'
          }`}>
            <span className="text-[10px] font-semibold opacity-60 leading-none">T{room.floor}</span>
            <span className="text-sm leading-tight">{room.name}</span>
          </div>
          <div>
            <h3 className="font-black text-gray-800">Phòng {room.name}</h3>
            <p className="text-xs text-gray-400">Tầng {room.floor}</p>
          </div>
        </div>
        <span className={status?.cls ?? 'badge-gray'}>{status?.label ?? room.status}</span>
      </div>

      {/* Giá thuê + tiền cọc */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-gray-400 text-xs mb-0.5">Giá thuê</p>
          <p className="font-bold text-gray-800">{room.price.toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-gray-400 text-xs mb-0.5">Tiền cọc</p>
          <p className="font-bold text-gray-800">{(room.deposit ?? 0).toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      {/* Đơn giá điện */}
      {elecRate != null && (
        <div className="bg-amber-50 rounded-xl p-2.5 text-sm flex items-center justify-between">
          <span className="text-amber-700">⚡ Đơn giá điện</span>
          <span className="font-bold text-amber-800">
            {elecRate.toLocaleString('vi-VN')}đ/kWh
            {elecIsOverride && <span className="ml-1 text-xs font-normal">(riêng)</span>}
          </span>
        </div>
      )}

      {/* Khách thuê */}
      {room.tenant ? (
        <div className="bg-primary-50 rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600 text-sm shrink-0">
            {room.tenant.full_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-700 truncate">{room.tenant.full_name}</p>
            <p className="text-xs text-gray-400">{room.tenant.phone}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-300 italic text-center py-1">Chưa có khách thuê</p>
      )}

      {/* Ghi chú */}
      {room.note && (
        <p className="text-xs text-gray-400 border-t pt-2 line-clamp-2">{room.note}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t">
        <button
          onClick={() => onEdit(room)}
          className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm py-2"
        >
          <PencilIcon size={14} />
          Sửa
        </button>
        <button
          onClick={() => onDelete(room)}
          className="btn-danger flex items-center justify-center gap-1.5 text-sm py-2 px-4"
        >
          <TrashIcon size={14} />
          Xóa
        </button>
      </div>
    </div>
  )
}
