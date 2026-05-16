'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Room, ElectricityLog } from '@/types'
import {
  previewInvoicesAction,
  createInvoicesAction,
} from './actions'
import InvoicePreviewRow, { type PreviewRowState } from './InvoicePreviewRow'

interface Props {
  open:                   boolean
  onClose:                () => void
  onCreated:              () => void
  defaultMonth:           number
  defaultYear:            number
  rooms:                  Pick<Room, 'id' | 'name' | 'floor'>[]
  /** Map room_id → electricity_log_id (cho biết phòng nào đã có chỉ số) */
  meterByRoom:            Record<string, ElectricityLog>
  /** Phòng đã có hóa đơn cho tháng đó */
  existingInvoiceRoomIds: Set<string>
}

export default function CreateInvoicesWizard({
  open, onClose, onCreated, defaultMonth, defaultYear, rooms, meterByRoom, existingInvoiceRoomIds,
}: Props) {
  const [step, setStep]         = useState<1 | 2>(1)
  const [month, setMonth]       = useState(defaultMonth)
  const [year, setYear]         = useState(defaultYear)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Mặc định: tick những phòng có chỉ số + chưa có hóa đơn
    const initial = new Set<string>()
    for (const r of rooms) {
      if (meterByRoom[r.id] && !existingInvoiceRoomIds.has(r.id)) initial.add(r.id)
    }
    return initial
  })
  const [previews, setPreviews] = useState<PreviewRowState[]>([])
  const [loading, setLoading]   = useState(false)

  function toggleRoom(roomId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(roomId)) next.delete(roomId)
      else next.add(roomId)
      return next
    })
  }

  async function handleNext() {
    if (selectedIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất 1 phòng')
      return
    }
    setLoading(true)
    const res = await previewInvoicesAction(Array.from(selectedIds), month, year)
    setLoading(false)
    if (!res.success) { toast.error(res.error); return }
    setPreviews(res.data.map(r => ({ ...r, selected: true, note: '' })))
    setStep(2)
  }

  function updatePreview(idx: number, patch: Partial<PreviewRowState>) {
    setPreviews(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  async function handleSave() {
    const toSave = previews.filter(p => p.selected)
    if (toSave.length === 0) {
      toast.error('Không có hóa đơn nào được chọn')
      return
    }
    setLoading(true)
    const res = await createInvoicesAction({
      month, year,
      rows: toSave.map(p => ({
        room_id:            p.room_id,
        rent_amount:        p.rent_amount,
        electricity_amount: p.electricity_amount,
        electricity_log_id: p.electricity_log_id,
        water_billing_mode: p.water_billing_mode,
        water_amount:       p.water_amount,
        trash_fee:          p.trash_fee,
        parking_fee:        p.parking_fee,
        internet_fee:       p.internet_fee,
        over_capacity_fee:  p.over_capacity_fee,
        extra_items:        p.extra_items,
        total:              p.total,
        due_date:           p.due_date,
        note:               p.note || null,
      })),
    })
    setLoading(false)
    if (!res.success) { toast.error(res.error); return }

    toast.success(`Đã tạo ${res.data.created} hóa đơn` + (res.data.skipped.length > 0 ? `, bỏ qua ${res.data.skipped.length} phòng đã có HĐ` : ''))
    onCreated()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-3xl sm:rounded-3xl rounded-t-3xl my-0 sm:my-8 p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-gray-800 text-lg">
            {step === 1 ? 'Tạo hóa đơn — bước 1: chọn phòng' : 'Bước 2: xem trước và sửa'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-2" disabled={loading}>
            ✕
          </button>
        </div>

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Tháng</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input-field w-full">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Năm</label>
                <input
                  type="number" min={2020} max={2100}
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {rooms.map(r => {
                const hasMeter = !!meterByRoom[r.id]
                const hasInvoice = existingInvoiceRoomIds.has(r.id)
                const disabled = hasInvoice
                const checked  = selectedIds.has(r.id)

                return (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      disabled
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : checked
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleRoom(r.id)}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-gray-700">Phòng {r.name} <span className="text-xs text-gray-400 font-normal">(tầng {r.floor})</span></p>
                      <p className="text-xs text-gray-500">
                        {hasInvoice && <span className="text-red-500">⛔ Đã có hóa đơn tháng này</span>}
                        {!hasInvoice && hasMeter   && <span className="text-green-600">✓ Đã có chỉ số</span>}
                        {!hasInvoice && !hasMeter  && <span className="text-amber-600">⚠️ Chưa có chỉ số (vẫn tạo được)</span>}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>Hủy</button>
              <button onClick={handleNext} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Xem trước →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Tháng {month}/{year} — {previews.filter(p => p.selected).length}/{previews.length} hóa đơn được chọn.
              Có thể sửa từng dòng hoặc thêm phụ phí trước khi lưu.
            </p>

            <div className="space-y-3 mb-5">
              {previews.map((row, i) => (
                <InvoicePreviewRow
                  key={row.room_id}
                  row={row}
                  onChange={p => updatePreview(i, p)}
                />
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-right">
              <p className="text-xs text-gray-500">Tổng tất cả</p>
              <p className="font-black text-xl text-primary-600">
                {previews.filter(p => p.selected).reduce((s, p) => s + p.total, 0).toLocaleString('vi-VN')}đ
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1" disabled={loading}>← Quay lại</button>
              <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Lưu tất cả hóa đơn
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
