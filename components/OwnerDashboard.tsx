'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthPayload, RoomWithTenants } from '@/types'
import CreateTenantModal from '@/components/CreateTenantModal'
import { setPrimaryAction } from '@/app/admin/tenants/actions'
import { MessageCircle, Bell, LogOut, Building2, User, KeyRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Payment {
  id: string
  room_id: string
  amount: number
  due_date: string
  status: string
}

interface Notification {
  id: string
  type: string
  message: string
  status: string
  created_at: string
  sender?: { full_name: string }
}

interface Props {
  user: AuthPayload
  rooms: RoomWithTenants[]
  payments: Payment[]
  notifications: Notification[]
}

const notifLabels: Record<string, string> = {
  payment_confirmed:  '✅ Đã thanh toán',
  extension_request:  '📅 Xin gia hạn',
  payment_reminder:   '🔔 Nhắc tiền',
}

export default function OwnerDashboard({ user, rooms, payments, notifications }: Props) {
  const router = useRouter()
  const [sending, setSending] = useState<string | null>(null)
  const [toast, setToast]     = useState('')
  const [activeTab, setActiveTab] = useState<'rooms' | 'notifs'>('rooms')
  const [unreadChat,     setUnreadChat]     = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  // T-019: track room đang được pre-select khi mở modal từ button của 1 room cụ thể.
  // null = mở mặc định (vd FAB nếu có); string = roomId pre-select.
  const [createTargetRoom, setCreateTargetRoom] = useState<string | null>(null)
  // T-032: track tenant đang được set-primary (loading state cho button)
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/messages/unread').then(r => r.json()).then(d => setUnreadChat(d.count ?? 0)).catch(() => {})
  }, [])

  // T-019: pass tất cả rooms (vacant + occupied) cho modal. Modal hiện count hiện tại cho mỗi phòng.
  // Filter ra maintenance status (không cho thêm khách vào phòng đang sửa).
  const availableRooms = rooms
    .filter(r => r.status !== 'maintenance')
    .map(r => ({
      id:          r.id,
      name:        r.name,
      floor:       r.floor,
      tenantCount: (r.tenants ?? []).length,
    }))

  const occupied = rooms.filter(r => r.status === 'occupied').length
  const vacant   = rooms.filter(r => r.status === 'vacant').length
  const unread   = notifications.filter(n => n.status === 'pending').length

  function latestPayment(roomId: string) {
    return payments
      .filter(p => p.room_id === roomId)
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0]
  }

  // T-032: handler set-primary với confirm dialog
  async function handleSetPrimary(roomId: string, roomName: string, userId: string, userName: string, currentPrimaryName?: string) {
    const msg = currentPrimaryName
      ? `Đặt ${userName} làm đại diện phòng ${roomName} thay cho ${currentPrimaryName}?`
      : `Đặt ${userName} làm đại diện phòng ${roomName}?`
    if (!confirm(msg)) return
    setSettingPrimary(userId)
    try {
      const res = await setPrimaryAction(roomId, userId)
      if (!res.success) {
        showToast(`❌ ${res.error}`)
        return
      }
      showToast(`👑 Đã đặt ${userName} làm đại diện`)
      router.refresh()
    } finally {
      setSettingPrimary(null)
    }
  }

  async function sendReminder(room: RoomWithTenants) {
    // T-016d Bug B: gửi nhắc tới primary tenant (D24)
    const primary = room.tenants.find(t => t.is_primary)
    if (!primary) return
    setSending(room.id)
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: primary.user_id,
          type: 'payment_reminder',
          message: `Nhắc thanh toán tiền phòng ${room.name} tháng này nhé! 💰`,
        }),
      })
      showToast(`Đã gửi nhắc tiền đến phòng ${room.name}!`)
    } finally {
      setSending(null)
    }
  }

  async function handleNotifAction(notifId: string, action: 'accepted' | 'rejected') {
    await fetch('/api/notifications/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: notifId, action }),
    })
    showToast(action === 'accepted' ? 'Đã xác nhận!' : 'Đã từ chối')
    router.refresh()
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-8">
      {/* Header */}
      <header className="bg-white shadow-soft sticky top-0 z-30 safe-top">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Chủ nhà</p>
            <h1 className="text-lg font-black text-gray-800">👋 Xin chào, {user.fullName}!</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/chat')} className="relative p-2 bg-gray-50 rounded-xl text-gray-500">
              <MessageCircle size={20} strokeWidth={1.5} />
              {unreadChat > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'notifs' ? 'rooms' : 'notifs')}
              className="relative p-2 bg-gray-50 rounded-xl text-gray-500"
            >
              <Bell size={20} strokeWidth={1.5} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <button onClick={handleLogout} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
              <LogOut size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard Icon={Building2} label="Tổng phòng" value={rooms.length} color="primary" />
          <StatCard Icon={User}      label="Có người"   value={occupied}      color="green" />
          <StatCard Icon={KeyRound}  label="Trống"       value={vacant}        color="orange" />
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {(['rooms', 'notifs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-white shadow-soft text-primary-600'
                  : 'text-gray-400'
              }`}
            >
              {tab === 'rooms' ? '🏠 Phòng trọ' : `🔔 Thông báo${unread > 0 ? ` (${unread})` : ''}`}
            </button>
          ))}
        </div>

        {/* Rooms tab */}
        {activeTab === 'rooms' && (
          <div className="space-y-3 animate-fade-in">
            {rooms.map(room => {
              const payment = latestPayment(room.id)
              const isPaid  = payment?.status === 'paid'
              return (
                <div key={room.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${
                        room.status === 'occupied' ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {room.name.replace('P', '')}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-800">Phòng {room.name}</h3>
                        <p className="text-xs text-gray-400">Tầng {room.floor} · {formatPrice(room.price)}/tháng</p>
                      </div>
                    </div>
                    <RoomBadge status={room.status} />
                  </div>

                  {/* T-016d Bug B: loop tenants[] thay vì single tenant */}
                  {room.status === 'occupied' && room.tenants.length > 0 && (() => {
                    const primary = room.tenants.find(t => t.is_primary)
                    const visible = room.tenants.slice(0, 4)
                    const overflow = room.tenants.length - visible.length
                    return (
                      <>
                        <div className="space-y-2 mb-3">
                          {visible.map(t => (
                            <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-600 shrink-0">
                                {t.user.full_name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-gray-700 truncate">{t.user.full_name}</p>
                                <p className="text-xs text-gray-400">{t.user.phone}</p>
                              </div>
                              {/* T-032: button "Đặt làm đại diện" cho non-primary trong phòng có >1 tenant */}
                              {!t.is_primary && room.tenants.length > 1 && (
                                <button
                                  onClick={() => handleSetPrimary(room.id, room.name, t.user_id, t.user.full_name, primary?.user.full_name)}
                                  disabled={settingPrimary === t.user_id}
                                  className="text-[10px] font-bold px-2 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full shrink-0 transition-colors disabled:opacity-50"
                                  title="Đặt làm đại diện phòng"
                                >
                                  {settingPrimary === t.user_id ? '⏳' : '👑'}
                                </button>
                              )}
                              {t.is_primary && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-500 text-white rounded-full shrink-0">
                                  Đại diện
                                </span>
                              )}
                            </div>
                          ))}
                          {overflow > 0 && (
                            <p className="text-xs text-gray-500 italic pl-10">
                              và {overflow} người khác
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-end mb-3">
                          <PaymentBadge status={isPaid ? 'paid' : 'pending'} dueDate={payment?.due_date} />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => sendReminder(room)}
                            disabled={sending === room.id || !primary}
                            className="flex-1 bg-accent-50 border border-accent-100 text-accent-600 font-bold rounded-xl py-2.5 text-sm active:scale-95 transition-all disabled:opacity-50"
                          >
                            {sending === room.id ? '⏳ Đang gửi...' : '🔔 Nhắc tiền'}
                          </button>
                          <button
                            onClick={() => { if (primary) router.push(`/profile/${primary.user_id}`) }}
                            disabled={!primary}
                            className="flex-1 bg-primary-50 border border-primary-100 text-primary-600 font-bold rounded-xl py-2.5 text-sm active:scale-95 transition-all disabled:opacity-50"
                          >
                            📋 Hồ sơ
                          </button>
                        </div>
                      </>
                    )
                  })()}

                  {room.status === 'vacant' && (
                    <button
                      onClick={() => { setCreateTargetRoom(room.id); setShowCreateModal(true) }}
                      className="w-full border border-primary-200 text-primary-600 font-bold rounded-xl py-2.5 text-sm active:scale-95 transition-all bg-primary-50"
                    >
                      ＋ Tạo tài khoản khách
                    </button>
                  )}
                  {/* T-019: phòng occupied cũng cho thêm khách thứ 2+ (multi-tenant UC-02b) */}
                  {room.status === 'occupied' && (
                    <button
                      onClick={() => { setCreateTargetRoom(room.id); setShowCreateModal(true) }}
                      className="w-full mt-2 border border-gray-200 text-gray-500 font-bold rounded-xl py-2 text-xs active:scale-95 transition-all"
                    >
                      ＋ Thêm khách
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Notifications tab */}
        {activeTab === 'notifs' && (
          <div className="space-y-3 animate-fade-in">
            {notifications.length === 0 && (
              <div className="card text-center py-8">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-400 font-medium">Chưa có thông báo nào</p>
              </div>
            )}
            {notifications.map(notif => (
              <div key={notif.id} className={`card ${notif.status === 'pending' ? 'border-l-4 border-primary-400' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0 text-lg">
                    {notif.type === 'payment_confirmed' ? '✅' : notif.type === 'extension_request' ? '📅' : '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-gray-700">
                        {notif.sender?.full_name ?? 'Khách thuê'}
                      </p>
                      <span className="text-xs text-gray-300 shrink-0">{formatTime(notif.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                    <p className="text-xs font-bold text-primary-500 mt-1">{notifLabels[notif.type] ?? notif.type}</p>
                  </div>
                </div>
                {notif.status === 'pending' && notif.type === 'extension_request' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => handleNotifAction(notif.id, 'accepted')}
                      className="flex-1 bg-primary-600 text-white font-bold rounded-xl py-2 text-sm active:scale-95 transition-all"
                    >
                      ✓ OK
                    </button>
                    <button
                      onClick={() => handleNotifAction(notif.id, 'rejected')}
                      className="flex-1 bg-red-50 text-red-400 font-bold rounded-xl py-2 text-sm active:scale-95 transition-all"
                    >
                      ✗ Từ chối
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white font-semibold text-sm px-5 py-3 rounded-2xl shadow-float z-50 animate-slide-up">
          {toast}
        </div>
      )}

      {showCreateModal && (
        <CreateTenantModal
          availableRooms={availableRooms}
          initialRoomId={createTargetRoom ?? undefined}
          onClose={() => { setShowCreateModal(false); setCreateTargetRoom(null) }}
        />
      )}
    </div>
  )
}

function StatCard({ Icon, label, value, color }: { Icon: LucideIcon; label: string; value: number; color: string }) {
  const colorMap: Record<string, { bg: string; iconColor: string }> = {
    primary: { bg: 'bg-primary-50', iconColor: '#1D9E75' },
    green:   { bg: 'bg-green-50',   iconColor: '#16a34a' },
    orange:  { bg: 'bg-orange-50',  iconColor: '#f97316' },
  }
  const c = colorMap[color] || colorMap.primary
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 text-center">
      <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
        <Icon size={20} strokeWidth={1.5} color={c.iconColor} />
      </div>
      <p className="text-2xl font-black text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
    </div>
  )
}

function RoomBadge({ status }: { status: string }) {
  if (status === 'occupied')    return <span className="badge-green">Có người</span>
  if (status === 'vacant')      return <span className="badge-gray">Trống</span>
  if (status === 'maintenance') return <span className="badge-orange">Sửa chữa</span>
  return null
}

function PaymentBadge({ status, dueDate }: { status: string; dueDate?: string }) {
  const due = dueDate ? new Date(dueDate) : null
  const overdue = due ? due < new Date() : false
  if (status === 'paid')           return <span className="badge-green">Đã trả</span>
  if (overdue)                     return <span className="badge-red">Quá hạn</span>
  return <span className="badge-orange">Chờ trả</span>
}

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} · ${d.getDate()}/${d.getMonth() + 1}`
}

