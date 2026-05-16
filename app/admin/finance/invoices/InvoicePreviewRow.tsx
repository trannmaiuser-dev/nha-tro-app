'use client'

import { useState } from 'react'
import { Trash2Icon, PlusIcon } from 'lucide-react'
import type { InvoiceCalcResult } from '@/lib/db/invoices'
import type { InvoiceExtraItem } from '@/types'

export interface PreviewRowState extends InvoiceCalcResult {
  /** Tick để bao gồm phòng này khi lưu */
  selected: boolean
  note: string
}

interface Props {
  row:    PreviewRowState
  onChange: (patch: Partial<PreviewRowState>) => void
}

function recalcTotal(r: PreviewRowState): number {
  const extra = r.extra_items.reduce((s, x) => s + x.amount, 0)
  return r.rent_amount + r.electricity_amount + r.water_amount +
         r.trash_fee + r.parking_fee + r.internet_fee + r.over_capacity_fee + extra
}

export default function InvoicePreviewRow({ row, onChange }: Props) {
  const [extraOpen, setExtraOpen] = useState(false)
  const [extraLabel, setExtraLabel] = useState('')
  const [extraAmount, setExtraAmount] = useState<number | ''>('')

  function updateField<K extends keyof PreviewRowState>(k: K, v: PreviewRowState[K]) {
    const updated = { ...row, [k]: v }
    onChange({ [k]: v, total: recalcTotal(updated) } as Partial<PreviewRowState>)
  }

  function addExtra() {
    if (!extraLabel.trim() || extraAmount === '' || Number(extraAmount) <= 0) return
    const newItem: InvoiceExtraItem = { label: extraLabel.trim(), amount: Number(extraAmount) }
    const items = [...row.extra_items, newItem]
    const updated = { ...row, extra_items: items }
    onChange({ extra_items: items, total: recalcTotal(updated) })
    setExtraLabel(''); setExtraAmount(''); setExtraOpen(false)
  }
  function removeExtra(i: number) {
    const items = row.extra_items.filter((_, idx) => idx !== i)
    const updated = { ...row, extra_items: items }
    onChange({ extra_items: items, total: recalcTotal(updated) })
  }

  return (
    <div className={`bg-white rounded-2xl shadow-soft p-4 border-2 ${row.selected ? 'border-primary-300' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={row.selected}
            onChange={e => onChange({ selected: e.target.checked })}
            className="w-5 h-5"
          />
          <h3 className="font-black text-gray-800">Phòng {row.room_name}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Tổng</p>
          <p className="font-black text-lg text-primary-600">
            {row.total.toLocaleString('vi-VN')}đ
          </p>
        </div>
      </div>

      {row.warnings.length > 0 && (
        <div className="mb-3 space-y-1">
          {row.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">{w}</p>
          ))}
        </div>
      )}

      {row.selected && (
        <div className="space-y-2 text-sm">
          {/* Tiền phòng */}
          <Line label="Tiền phòng" value={row.rent_amount} onChange={v => updateField('rent_amount', v)} />

          {/* Tiền điện */}
          <Line
            label="Tiền điện"
            hint={`${row.kwh_usage} kWh × ${row.electricity_rate.toLocaleString('vi-VN')}đ`}
            value={row.electricity_amount}
            onChange={v => updateField('electricity_amount', v)}
          />

          {/* Tiền nước */}
          <Line
            label="Tiền nước"
            hint={row.water_detail}
            value={row.water_amount}
            onChange={v => updateField('water_amount', v)}
          />

          {/* 4 phí khác — chỉ show nếu > 0 hoặc admin có thể bật từ here */}
          {(row.trash_fee > 0 || row.parking_fee > 0 || row.internet_fee > 0 || row.over_capacity_fee > 0) && (
            <>
              {row.trash_fee > 0         && <Line label="Phí rác"          value={row.trash_fee}         onChange={v => updateField('trash_fee', v)} />}
              {row.parking_fee > 0       && <Line label="Phí gửi xe"      value={row.parking_fee}       onChange={v => updateField('parking_fee', v)} />}
              {row.internet_fee > 0      && <Line label="Phí internet"    value={row.internet_fee}      onChange={v => updateField('internet_fee', v)} />}
              {row.over_capacity_fee > 0 && <Line label="Phụ phí quá người" value={row.over_capacity_fee} onChange={v => updateField('over_capacity_fee', v)} />}
            </>
          )}

          {/* Extra items */}
          {row.extra_items.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
              <span className="text-gray-700 text-sm">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-700">{item.amount.toLocaleString('vi-VN')}đ</span>
                <button type="button" onClick={() => removeExtra(i)} className="text-red-400 hover:text-red-600">
                  <Trash2Icon size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Add extra */}
          {extraOpen ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Mô tả phụ phí..."
                value={extraLabel}
                onChange={e => setExtraLabel(e.target.value)}
                className="input-field flex-1 text-sm py-1.5"
              />
              <input
                type="number" min={1}
                placeholder="Số tiền"
                value={extraAmount}
                onChange={e => setExtraAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="input-field w-28 text-right text-sm py-1.5"
              />
              <button type="button" onClick={addExtra} className="btn-primary text-sm py-1.5 px-3">Thêm</button>
              <button type="button" onClick={() => setExtraOpen(false)} className="btn-secondary text-sm py-1.5 px-3">Hủy</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setExtraOpen(true)}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 py-1"
            >
              <PlusIcon size={14} /> Thêm phụ phí
            </button>
          )}

          {/* Note */}
          <div className="pt-2 border-t">
            <input
              type="text"
              placeholder="Ghi chú cho hóa đơn này..."
              value={row.note}
              onChange={e => onChange({ note: e.target.value })}
              className="input-field w-full text-sm py-1.5"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Line({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="font-bold text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <input
        type="number" min={0} step={1000}
        value={value}
        onChange={e => onChange(Number(e.target.value || 0))}
        className="input-field w-32 text-right py-1.5"
      />
    </div>
  )
}
