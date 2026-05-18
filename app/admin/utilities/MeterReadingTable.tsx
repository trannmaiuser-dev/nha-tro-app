'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import type { Room, ElectricityLog, WaterBillingMode } from '@/types'
import { saveMeterReadingsAction } from './actions'

interface RowData {
  room_id:       string
  room_name:     string
  prev_kwh:      number
  curr_kwh:      number | ''
  prev_water_m3: number | null
  curr_water_m3: number | '' | null
  /** ID của electricity_log nếu đã có cho tháng này (để update) */
  existing_id:   string | null
}

interface Props {
  month:            number
  year:             number
  rooms:            Pick<Room, 'id' | 'name' | 'floor'>[]
  /** Chỉ số tháng (đã có) — để biết phòng nào đã nhập */
  currentMonthLogs: ElectricityLog[]
  /** Chỉ số tháng trước (để auto-fill prev_kwh) */
  prevMonthLogs:    Record<string, { curr_kwh: number; curr_water_m3: number | null }>
  waterMode:        WaterBillingMode
}

export default function MeterReadingTable({
  month, year, rooms, currentMonthLogs, prevMonthLogs, waterMode,
}: Props) {
  const initialRows = useMemo<RowData[]>(() => {
    const byRoom = new Map(currentMonthLogs.map(l => [l.room_id, l]))
    return rooms.map(r => {
      const log = byRoom.get(r.id)
      const prev = prevMonthLogs[r.id]
      return {
        room_id:       r.id,
        room_name:     r.name,
        prev_kwh:      log?.prev_kwh ?? prev?.curr_kwh ?? 0,
        curr_kwh:      log?.curr_kwh ?? '',
        prev_water_m3: log?.prev_water_m3 ?? prev?.curr_water_m3 ?? null,
        curr_water_m3: log?.curr_water_m3 ?? (waterMode === 'per_m3' ? '' : null),
        existing_id:   log?.id ?? null,
      }
    })
  }, [rooms, currentMonthLogs, prevMonthLogs, waterMode])

  const [rows, setRows] = useState<RowData[]>(initialRows)
  const [saving, setSaving] = useState(false)

  function updateRow(idx: number, patch: Partial<RowData>) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  async function handleSave() {
    // Validate
    const toSave = rows.filter(r => r.curr_kwh !== '' && r.curr_kwh != null)
    if (toSave.length === 0) {
      toast.error('Vui lòng nhập chỉ số ít nhất 1 phòng')
      return
    }
    setSaving(true)
    const res = await saveMeterReadingsAction({
      month, year,
      readings: toSave.map(r => ({
        room_id:       r.room_id,
        prev_kwh:      r.prev_kwh,
        curr_kwh:      Number(r.curr_kwh),
        prev_water_m3: r.prev_water_m3,
        curr_water_m3: (r.curr_water_m3 === '' || r.curr_water_m3 == null) ? null : Number(r.curr_water_m3),
      })),
    })
    setSaving(false)
    if (res.success) {
      toast.success(`Đã lưu ${toSave.length} phòng`)
    } else {
      toast.error(res.error)
    }
  }

  const hasWaterM3 = waterMode === 'per_m3'

  return (
    <div className="space-y-4">
      {/* Mobile: card per room (T-044) */}
      <div className="md:hidden space-y-3">
        {rows.map((r, i) => {
          const usage = r.curr_kwh === '' || r.curr_kwh == null
            ? null
            : Number(r.curr_kwh) - r.prev_kwh
          const waterUsage =
            hasWaterM3 && r.curr_water_m3 !== '' && r.curr_water_m3 != null && r.prev_water_m3 != null
              ? Number(r.curr_water_m3) - r.prev_water_m3
              : null
          const hasValue = r.curr_kwh !== '' && r.curr_kwh != null

          return (
            <div key={r.room_id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-gray-800">Phòng {r.room_name}</h3>
                {hasValue ? <span className="badge-green">Đã nhập</span> : <span className="badge-orange">Trống</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Điện (kWh)</label>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 shrink-0">Cũ: {r.prev_kwh.toLocaleString('vi-VN')}</span>
                  <span className="text-gray-300">→</span>
                  <input
                    type="number" min={0}
                    value={r.curr_kwh}
                    onChange={e => updateRow(i, { curr_kwh: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="input-field flex-1 text-right py-1.5"
                    placeholder="Số mới"
                  />
                </div>
                <p className={`text-xs mt-1 font-bold ${usage != null && usage < 0 ? 'text-red-500' : 'text-primary-600'}`}>
                  Tiêu thụ: {usage == null ? '—' : `${usage.toLocaleString('vi-VN')} kWh`}
                </p>
              </div>

              {hasWaterM3 && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nước (m³)</label>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 shrink-0">Cũ: {r.prev_water_m3 ?? '—'}</span>
                    <span className="text-gray-300">→</span>
                    <input
                      type="number" min={0}
                      value={r.curr_water_m3 ?? ''}
                      onChange={e => updateRow(i, { curr_water_m3: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="input-field flex-1 text-right py-1.5"
                      placeholder="Số mới"
                    />
                  </div>
                  {waterUsage != null && waterUsage < 0 && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Nước giảm — kiểm tra lại</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
              <tr>
                <th className="px-3 py-3 text-left">Phòng</th>
                <th className="px-3 py-3 text-right">Số cũ (kWh)</th>
                <th className="px-3 py-3 text-right">Số mới (kWh)</th>
                <th className="px-3 py-3 text-right">Tiêu thụ</th>
                {hasWaterM3 && (
                  <>
                    <th className="px-3 py-3 text-right">Nước cũ (m³)</th>
                    <th className="px-3 py-3 text-right">Nước mới (m³)</th>
                  </>
                )}
                <th className="px-3 py-3 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const usage = r.curr_kwh === '' || r.curr_kwh == null
                  ? null
                  : Number(r.curr_kwh) - r.prev_kwh
                const waterUsage =
                  hasWaterM3 && r.curr_water_m3 !== '' && r.curr_water_m3 != null && r.prev_water_m3 != null
                    ? Number(r.curr_water_m3) - r.prev_water_m3
                    : null
                const hasValue = r.curr_kwh !== '' && r.curr_kwh != null

                return (
                  <tr key={r.room_id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-bold text-gray-700">{r.room_name}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{r.prev_kwh.toLocaleString('vi-VN')}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number" min={0}
                        value={r.curr_kwh}
                        onChange={e => updateRow(i, { curr_kwh: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="input-field w-28 text-right py-1.5"
                        placeholder="..."
                      />
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${usage != null && usage < 0 ? 'text-red-500' : 'text-primary-600'}`}>
                      {usage == null ? '—' : usage.toLocaleString('vi-VN')}
                    </td>
                    {hasWaterM3 && (
                      <>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {r.prev_water_m3 != null ? r.prev_water_m3 : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number" min={0}
                            value={r.curr_water_m3 ?? ''}
                            onChange={e => updateRow(i, { curr_water_m3: e.target.value === '' ? '' : Number(e.target.value) })}
                            className="input-field w-24 text-right py-1.5"
                            placeholder="..."
                          />
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 text-center">
                      {hasValue ? (
                        <span className="badge-green">Đã nhập</span>
                      ) : (
                        <span className="badge-orange">Trống</span>
                      )}
                      {waterUsage != null && waterUsage < 0 && (
                        <span className="ml-2 text-xs text-red-500">Nước giảm?</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
          disabled={saving}
        >
          {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Lưu tất cả chỉ số
        </button>
      </div>
    </div>
  )
}
