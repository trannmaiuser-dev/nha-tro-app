'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { createTenantAction } from '@/app/admin/tenants/actions'
import type { TenantRow } from '@/lib/db/tenants'

/** Phòng có thể chọn khi thêm khách. `tenants_count` = số tenant đang active (T-016 Phase C). */
export interface SelectableRoom {
  id:            string
  name:          string
  floor:         number
  status:        string
  tenants_count: number
}

interface Props {
  open: boolean
  rooms: SelectableRoom[]
  onClose: () => void
  onAdded: (tenant: TenantRow) => void
}

const ROOM_CAPACITY_WARN = 6 // T-016 Phase C decision rule: >= 6 người → cảnh báo nhưng vẫn cho thêm

export default function AddTenantDialog({ open, rooms, onClose, onAdded }: Props) {
  const [phone,      setPhone]      = useState('')
  const [cccd,       setCccd]       = useState('')
  const [roomId,     setRoomId]     = useState('')
  const [fullName,   setFullName]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<{
    tempPassword: string
    phone:        string
    loginLink:    string
    roomName:     string
    expiresAt:    string
  } | null>(null)

  // T-016 Phase C: cho phép chọn cả phòng đã có người (không lọc 'vacant').
  // Loại bỏ phòng 'maintenance' (đang bảo trì, không cho thuê).
  const selectableRooms = rooms.filter(r => r.status !== 'maintenance')
  const selectedRoom = useMemo(
    () => selectableRooms.find(r => r.id === roomId),
    [selectableRooms, roomId],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await createTenantAction({
      phone,
      id_card_number: cccd || undefined,   // T-016c D22: CCCD optional
      room_id:        roomId,
      full_name:      fullName || undefined,
    })
    setLoading(false)
    if (!res.success) { toast.error(res.error); return }
    setResult({
      tempPassword: res.data.tempPassword,
      phone:        res.data.phone,
      loginLink:    res.data.loginLink,
      roomName:     res.data.roomName,
      expiresAt:    res.data.expiresAt,
    })
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
          /* Màn hình hiển thị thông tin tài khoản đã tạo */
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl">✅</div>
              <h2 className="font-black text-gray-800 text-lg mt-1">Tạo tài khoản thành công!</h2>
              <p className="text-sm text-gray-500">Gửi thông tin này cho khách thuê</p>
            </div>

            <div className="bg-primary-50 rounded-2xl p-4 text-left space-y-2">
              {result.roomName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phòng:</span>
                  <span className="font-bold">{result.roomName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Số điện thoại:</span>
                <span className="font-bold">{result.phone}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Mật khẩu tạm:</span>
                <span className="font-black text-primary-600 text-lg tracking-[0.15em]">{result.tempPassword}</span>
              </div>
            </div>

            {/* Login link (T-016c D20) */}
            <div className="rounded-2xl p-3.5 space-y-2 text-left bg-blue-50 border border-blue-100">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Link đăng nhập lần đầu
              </p>
              <p className="text-xs font-semibold break-all leading-relaxed text-blue-800">
                {result.loginLink}
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(result.loginLink)
                  toast.success('Đã sao chép link')
                }}
                className="text-xs text-blue-600 underline font-semibold"
              >
                Sao chép link
              </button>
            </div>

            <p className="text-xs text-center text-gray-400">
              ⏰ Link hết hạn ngày {new Date(result.expiresAt).toLocaleDateString('vi-VN')}
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Số điện thoại: ${result.phone}\n` +
                  `Mật khẩu tạm: ${result.tempPassword}\n` +
                  `Link đăng nhập: ${result.loginLink}`,
                )
                toast.success('Đã sao chép tất cả thông tin')
              }}
              className="btn-secondary w-full"
            >
              📋 Sao chép tất cả
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
                <label className="block text-sm font-bold text-gray-600 mb-1.5">CCCD/CMND <span className="text-gray-400 text-xs font-normal">(tùy chọn)</span></label>
                <input value={cccd} onChange={e => setCccd(e.target.value.replace(/\D/g,'').slice(0,12))} placeholder="9 hoặc 12 số (có thể bỏ trống)" className="input-field w-full" />
                <p className="text-xs text-gray-400 mt-1">Khách có thể điền sau khi đăng nhập lần đầu. Mật khẩu tạm sẽ được sinh ngẫu nhiên.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Phòng <span className="text-red-400">*</span></label>
                <select value={roomId} onChange={e => setRoomId(e.target.value)} className="input-field w-full" required>
                  <option value="">-- Chọn phòng --</option>
                  {selectableRooms.map(r => {
                    const suffix = r.tenants_count === 0
                      ? '(trống)'
                      : `(đang ${r.tenants_count} người)`
                    return (
                      <option key={r.id} value={r.id}>
                        Phòng {r.name} · Tầng {r.floor} {suffix}
                      </option>
                    )
                  })}
                </select>
                {selectableRooms.length === 0 && <p className="text-xs text-orange-500 mt-1">Không có phòng khả dụng</p>}
                {selectedRoom && selectedRoom.tenants_count >= ROOM_CAPACITY_WARN && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-start gap-1">
                    <span>⚠️</span>
                    <span>Phòng đã có {selectedRoom.tenants_count} người. Bạn vẫn có thể thêm — khách mới sẽ vào với vai trò thường (không phải đại diện).</span>
                  </p>
                )}
                {selectedRoom && selectedRoom.tenants_count > 0 && selectedRoom.tenants_count < ROOM_CAPACITY_WARN && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Phòng đã có {selectedRoom.tenants_count} người. Khách mới sẽ ở cùng (không phải đại diện).
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleClose} className="btn-secondary flex-1" disabled={loading}>Hủy</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading || selectableRooms.length === 0}>
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
