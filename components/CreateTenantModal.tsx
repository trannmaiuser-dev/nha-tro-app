'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Select from '@/components/ui/Select'
import { createTenantAction } from '@/app/admin/tenants/actions'

// T-019: shape mở rộng — `tenantCount` cho phòng occupied (hiện "đang N người").
interface Room { id: string; name: string; floor: number; tenantCount: number }

interface Props {
  availableRooms: Room[]
  /** T-019: roomId pre-select khi mở từ button của 1 phòng cụ thể. */
  initialRoomId?: string
  onClose:        () => void
}

interface Result {
  phone: string; roomName: string; tempPassword: string; loginLink: string; expiresAt: string
}

export default function CreateTenantModal({ availableRooms, initialRoomId, onClose }: Props) {
  const router   = useRouter()
  const [phone,   setPhone]   = useState('')
  const [roomId,  setRoomId]  = useState(initialRoomId ?? availableRooms[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [result,  setResult]  = useState<Result | null>(null)
  const [copied,  setCopied]  = useState(false)
  const [hasCreated, setHasCreated] = useState(false)

  // T-016d Bug C: chỉ refresh /dashboard sau khi user đã đóng modal
  // (xem login link + copy xong). Refresh ngay sau setResult sẽ làm parent
  // re-render với vacantRooms mới → success screen mất nội dung.
  function handleClose() {
    if (hasCreated) router.refresh()
    onClose()
  }

  // T-019: label thay đổi theo trạng thái phòng — vacant=trống, occupied=đang N người.
  const roomOptions = availableRooms.map(r => ({
    value: r.id,
    label: r.tenantCount === 0
      ? `Phòng ${r.name} — Tầng ${r.floor} (trống)`
      : `Phòng ${r.name} — Tầng ${r.floor} (đang ${r.tenantCount} người)`,
  }))
  const selectedRoom = availableRooms.find(r => r.id === roomId)

  async function handleCreate() {
    if (!phone.trim() || !roomId) { setError('Vui lòng điền đầy đủ thông tin'); return }
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10 || !digits.startsWith('0')) {
      setError('Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số')
      return
    }
    setLoading(true); setError('')
    try {
      // T-016c D21+D23: thay /api/owner/create-tenant (đã xóa) bằng server action.
      // CCCD không thu thập ở đây (sẽ điền lúc onboarding) — D22 cho phép optional.
      const res = await createTenantAction({
        phone:    digits,
        room_id:  roomId,
      })
      if (!res.success) { setError(res.error || 'Lỗi không xác định'); return }
      setResult({
        phone:        res.data.phone,
        roomName:     res.data.roomName,
        tempPassword: res.data.tempPassword,
        loginLink:    res.data.loginLink,
        expiresAt:    res.data.expiresAt,
      })
      setHasCreated(true)
      // KHÔNG gọi router.refresh() ở đây — dồn về handleClose (Bug C fix)
    } finally {
      setLoading(false)
    }
  }

  function copyAll() {
    if (!result) return
    const text = `🏠 Thông tin đăng ký Aloha Tran Home\nPhòng: ${result.roomName}\nSĐT: ${result.phone}\nLink đăng nhập lần đầu:\n${result.loginLink}\nMật khẩu tạm: ${result.tempPassword}\n⚠️ Link hết hạn sau 7 ngày`
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    // Backdrop — always center, keyboard-aware via dvh
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      {/* Sheet — scrollable, max 85dvh so keyboard doesn't cover it */}
      <div
        className="bg-white w-full max-w-sm rounded-3xl animate-slide-up"
        style={{
          boxShadow: 'var(--shadow-float)',
          maxHeight: '85dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as never,
        }}
        onClick={e => e.stopPropagation()}
      >
        {!result ? (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                    style={{ background: 'var(--primary-light)' }}>
                    🏠
                  </div>
                  <div>
                    <h2 className="text-base font-black text-gray-800">Tạo tài khoản khách</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Khách sẽ nhận link đăng nhập</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              {/* Phone */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-2)' }}>
                  Số điện thoại khách <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 pointer-events-none">
                    +84
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="0912 345 678"
                    autoFocus
                    className="input-field pl-14"
                  />
                </div>
              </div>

              {/* Room */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-2)' }}>
                  Phòng <span className="text-red-400">*</span>
                </label>
                {availableRooms.length === 0 ? (
                  <div className="input-field flex items-center gap-2 opacity-60 cursor-default">
                    <span className="text-yellow-500">⚠️</span>
                    <span className="text-sm">Không có phòng khả dụng</span>
                  </div>
                ) : (
                  <Select
                    value={roomId}
                    onChange={setRoomId}
                    options={roomOptions}
                    placeholder="Chọn phòng..."
                  />
                )}
                {/* T-019: cảnh báo capacity khi phòng đã có >= 6 người */}
                {selectedRoom && selectedRoom.tenantCount >= 6 && (
                  <p className="mt-1.5 text-xs text-orange-600 flex items-center gap-1">
                    <span>⚠️</span>
                    Phòng đã có {selectedRoom.tenantCount} người — cân nhắc trước khi thêm
                  </p>
                )}
                {/* T-019: note cho occupied — khách mới = thành viên thêm, không phải primary */}
                {selectedRoom && selectedRoom.tenantCount > 0 && selectedRoom.tenantCount < 6 && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Phòng đang có {selectedRoom.tenantCount} người. Khách mới sẽ là thành viên thêm (không phải đại diện).
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm font-medium rounded-2xl px-4 py-3"
                  style={{ background: '#FEECEC', color: 'var(--error)' }}>
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={handleClose} className="btn-ghost flex-1 py-3 text-sm">Hủy</button>
                <button
                  onClick={handleCreate}
                  disabled={loading || availableRooms.length === 0}
                  className="btn-primary flex-1 py-3 text-sm"
                >
                  {loading ? <Spinner /> : 'Tạo tài khoản'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Success header */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-gray-50">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3"
                style={{ background: 'var(--primary-light)' }}>
                ✅
              </div>
              <h2 className="text-lg font-black text-gray-800">Tạo thành công!</h2>
              <p className="text-sm text-gray-400 mt-0.5">Gửi thông tin này cho khách thuê</p>
            </div>

            <div className="px-6 py-5 space-y-3">
              <InfoRow label="Phòng" value={result.roomName} />
              <InfoRow label="SĐT"   value={result.phone} />

              {/* Login link box */}
              <div className="rounded-2xl p-3.5 space-y-1.5"
                style={{ background: 'var(--primary-light)', border: '1px solid #C8E6D5' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
                  Link đăng nhập lần đầu
                </p>
                <p className="text-xs font-semibold break-all leading-relaxed" style={{ color: 'var(--primary-dark)' }}>
                  {result.loginLink}
                </p>
              </div>

              {/* Temp password */}
              <div className="rounded-2xl p-3.5 space-y-1"
                style={{ background: '#FFF3EE', border: '1px solid #FFD4C2' }}>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                  Mật khẩu tạm (dự phòng)
                </p>
                <p className="font-black text-xl tracking-[0.2em] text-orange-500">{result.tempPassword}</p>
              </div>

              <p className="text-xs text-center font-medium" style={{ color: 'var(--text-3)' }}>
                ⏰ Hết hạn {new Date(result.expiresAt).toLocaleDateString('vi-VN')}
              </p>

              <button onClick={copyAll} className="btn-primary w-full text-sm">
                {copied ? '✅ Đã copy!' : '📋 Copy toàn bộ thông tin'}
              </button>
              <button onClick={handleClose} className="btn-ghost w-full text-sm py-2.5">Đóng</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50">
      <span className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-sm font-bold text-gray-700">{value}</span>
    </div>
  )
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
}
