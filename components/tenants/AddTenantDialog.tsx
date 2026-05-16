'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createTenantAction } from '@/app/admin/tenants/actions'
import type { TenantRow } from '@/lib/db/tenants'

interface Props {
  open: boolean
  rooms: { id: string; name: string; floor: number; status: string }[]
  onClose: () => void
  onAdded: (tenant: TenantRow) => void
}

export default function AddTenantDialog({ open, rooms, onClose, onAdded }: Props) {
  const [phone,      setPhone]      = useState('')
  const [cccd,       setCccd]       = useState('')
  const [roomId,     setRoomId]     = useState('')
  const [fullName,   setFullName]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<{ tempPassword: string; phone: string } | null>(null)

  const vacantRooms = rooms.filter(r => r.status === 'vacant')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await createTenantAction({ phone, id_card_number: cccd, room_id: roomId, full_name: fullName || undefined })
    setLoading(false)
    if (!res.success) { toast.error(res.error); return }
    setResult({ tempPassword: res.data.tempPassword, phone: res.data.phone })
  }

  function handleClose() {
    setPhone(''); setCccd(''); setRoomId(''); setFullName(''); setResult(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={loading ? undefined : handleClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 animate-slide-up" style={{ boxShadow: 'var(--shadow-float)' }} onClick={e => e.stopPropagation()}>

        {result ? (
          /* Màn hình hiển thị mật khẩu tạm */
          <div className="text-center space-y-4">
            <div className="text-4xl">✅</div>
            <h2 className="font-black text-gray-800 text-lg">Tạo tài khoản thành công!</h2>
            <p className="text-sm text-gray-500">Gửi thông tin này cho khách thuê</p>

            <div className="bg-primary-50 rounded-2xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Số điện thoại:</span>
                <span className="font-bold">{result.phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mật khẩu tạm:</span>
                <span className="font-black text-primary-600 text-lg">{result.tempPassword}</span>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`Số điện thoại: ${result.phone}\nMật khẩu tạm: ${result.tempPassword}`)
                toast.success('Đã sao chép thông tin')
              }}
              className="btn-secondary w-full"
            >
              📋 Sao chép thông tin
            </button>
            <button onClick={handleClose} className="btn-primary w-full">Đóng</button>
          </div>
        ) : (
          /* Form thêm khách */
          <>
            <h2 className="font-black text-gray-800 text-lg mb-5">Thêm khách thuê mới</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Họ tên (tùy chọn)</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="input-field w-full" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Số điện thoại <span className="text-red-400">*</span></label>
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="0901234567" className="input-field w-full" type="tel" required />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">CCCD/CMND <span className="text-red-400">*</span></label>
                <input value={cccd} onChange={e => setCccd(e.target.value.replace(/\D/g,'').slice(0,12))} placeholder="9 hoặc 12 số" className="input-field w-full" required />
                <p className="text-xs text-gray-400 mt-1">Mật khẩu tạm = 6 số cuối CCCD</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Phòng <span className="text-red-400">*</span></label>
                <select value={roomId} onChange={e => setRoomId(e.target.value)} className="input-field w-full" required>
                  <option value="">-- Chọn phòng trống --</option>
                  {vacantRooms.map(r => (
                    <option key={r.id} value={r.id}>Phòng {r.name} (Tầng {r.floor})</option>
                  ))}
                </select>
                {vacantRooms.length === 0 && <p className="text-xs text-orange-500 mt-1">Không có phòng trống</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleClose} className="btn-secondary flex-1" disabled={loading}>Hủy</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading || vacantRooms.length === 0}>
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
