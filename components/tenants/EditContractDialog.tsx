'use client'

/**
 * T-042 — Dialog cho owner set/clear contract_end_date của 1 membership.
 *
 * Truyền membershipId + currentValue (YYYY-MM-DD hoặc null).
 * onSave callback nhận date string mới (hoặc null nếu xóa).
 */
import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { setContractEndDateAction } from '@/app/admin/tenants/actions'

interface Props {
  membershipId: string
  currentEndDate: string | null
  tenantName: string
  roomName: string
  onClose: () => void
  onSaved?: () => void
}

export default function EditContractDialog({ membershipId, currentEndDate, tenantName, roomName, onClose, onSaved }: Props) {
  const [date, setDate]       = useState(currentEndDate ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSave(clear = false) {
    setSubmitting(true)
    setError(null)
    const value = clear ? null : (date.trim() || null)
    const res = await setContractEndDateAction(membershipId, value)
    setSubmitting(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !submitting && onClose()}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center">
              <CalendarDays size={20} className="text-primary-600" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-black text-gray-800">Hợp đồng thuê</h2>
              <p className="text-xs text-gray-500">{tenantName} · phòng {roomName}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-gray-300 hover:text-gray-500">
            <X size={20} />
          </button>
        </div>

        <label className="block text-sm font-bold text-gray-700 mb-1.5">Ngày hết hạn hợp đồng</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          disabled={submitting}
          className="input-field w-full"
        />
        <p className="text-xs text-gray-400 mt-1.5">Khi ≤ 30 ngày, dashboard sẽ nhắc tự động.</p>

        {error && <p className="mt-3 text-sm text-red-500 font-bold">{error}</p>}

        <div className="flex gap-2 mt-5">
          {currentEndDate && (
            <button
              onClick={() => handleSave(true)}
              disabled={submitting}
              className="btn-secondary flex-1 text-sm"
            >
              Xóa ngày
            </button>
          )}
          <button onClick={onClose} disabled={submitting} className="btn-secondary flex-1 text-sm">Hủy</button>
          <button onClick={() => handleSave()} disabled={submitting || !date} className="btn-primary flex-[2] text-sm">
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}
