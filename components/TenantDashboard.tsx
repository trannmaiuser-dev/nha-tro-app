'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthPayload } from '@/types'
import type { OverdueInvoice } from '@/lib/db/invoices'
import DebtBanner from '@/components/DebtBanner'

interface Room {
  id: string
  name: string
  floor: number
  price: number
  status: string
}

interface Payment {
  id: string
  room_id: string
  amount: number
  due_date: string
  paid_date: string | null
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

interface CoTenant {
  user_id:    string
  full_name:  string
  is_primary: boolean
}

interface Props {
  user: AuthPayload
  room: Room | null
  payments: Payment[]
  notifications: Notification[]
  /** Người ở cùng phòng (T-016 Phase C — UC-02). Chỉ tên, không SĐT. */
  otherTenants?: CoTenant[]
  /** Hóa đơn quá hạn (T-017 — UC-05). Empty array = không có nợ. */
  overdueInvoices?: OverdueInvoice[]
}

export default function TenantDashboard({ user, room, payments, notifications, otherTenants = [], overdueInvoices = [] }: Props) {
  const router = useRouter()
  const [sending, setSending]   = useState<string | null>(null)
  const [toast, setToast]       = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'notifs'>('home')
  const [unreadChat, setUnreadChat] = useState(0)

  useEffect(() => {
    fetch('/api/messages/unread').then(r => r.json()).then(d => setUnreadChat(d.count ?? 0)).catch(() => {})
  }, [])

  const latestPayment = room
    ? payments.filter(p => p.room_id === room.id).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0]
    : null

  const isPaid    = latestPayment?.status === 'paid'
  const isOverdue = latestPayment && new Date(latestPayment.due_date) < new Date() && !isPaid
  const unread    = notifications.filter(n => n.status === 'pending').length

  async function sendAction(type: 'payment_confirmed' | 'extension_request') {
    setSending(type)
    try {
      const messages: Record<string, string> = {
        payment_confirmed: `Khách phòng ${room?.name} xác nhận đã thanh toán tiền phòng tháng này ✅`,
        extension_request: `Khách phòng ${room?.name} xin gia hạn thêm 10 ngày 📅`,
      }
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: messages[type] }),
      })
      showToast(type === 'payment_confirmed' ? '✅ Đã gửi xác nhận thanh toán!' : '📅 Đã gửi yêu cầu gia hạn!')
      router.refresh()
    } finally {
      setSending(null)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const daysUntilDue = latestPayment
    ? Math.ceil((new Date(latestPayment.due_date).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-8">
      {/* Header */}
      <header className="bg-white shadow-soft sticky top-0 z-30 safe-top">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Khách thuê</p>
            <h1 className="text-lg font-black text-gray-800">👋 Xin chào, {user.fullName}!</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/chat')} className="relative p-2 bg-gray-50 rounded-xl text-gray-500">
              <ChatIcon />
              {unreadChat > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'notifs' ? 'home' : 'notifs')}
              className="relative p-2 bg-gray-50 rounded-xl"
            >
              <BellIcon />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <button onClick={handleLogout} className="p-2 bg-gray-50 rounded-xl text-gray-400">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {(['home', 'notifs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab ? 'bg-white shadow-soft text-primary-600' : 'text-gray-400'
              }`}
            >
              {tab === 'home' ? '🏠 Phòng của tôi' : `🔔 Thông báo${unread > 0 ? ` (${unread})` : ''}`}
            </button>
          ))}
        </div>

        {/* T-017: Debt banner — hiện đầu trang khi có hóa đơn quá hạn */}
        {overdueInvoices.length > 0 && (
          <DebtBanner overdueInvoices={overdueInvoices} roomName={room?.name} />
        )}

        {activeTab === 'home' && (
          <div className="space-y-4 animate-fade-in">
            {!room ? (
              <div className="card text-center py-10">
                <p className="text-4xl mb-3">🏠</p>
                <p className="text-gray-400 font-medium">Chưa có thông tin phòng</p>
              </div>
            ) : (
              <>
                {/* Room card */}
                <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-primary-100 text-sm font-semibold">Phòng của bạn</p>
                      <h2 className="text-3xl font-black">Phòng {room.name}</h2>
                      <p className="text-primary-200 text-sm">Tầng {room.floor}</p>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black">
                      {room.name.replace('P', '')}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white/15 rounded-xl p-3">
                    <div>
                      <p className="text-primary-100 text-xs">Tiền thuê hàng tháng</p>
                      <p className="text-xl font-black">{formatPrice(room.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary-100 text-xs">Trạng thái</p>
                      {isPaid ? (
                        <span className="text-sm font-bold bg-white/20 rounded-lg px-2 py-0.5">✅ Đã thanh toán</span>
                      ) : isOverdue ? (
                        <span className="text-sm font-bold bg-red-500/50 rounded-lg px-2 py-0.5">⚠️ Quá hạn</span>
                      ) : (
                        <span className="text-sm font-bold bg-white/20 rounded-lg px-2 py-0.5">⏳ Chờ thanh toán</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Người ở cùng phòng (T-016 — UC-02). Chỉ tên, không SĐT để giữ privacy */}
                {otherTenants.length > 0 && (
                  <div className="card">
                    <h3 className="font-black text-gray-800 mb-3">👥 Bạn đang ở cùng</h3>
                    <ul className="space-y-2">
                      {otherTenants.map(co => (
                        <li key={co.user_id} className="flex items-center gap-3 py-1.5">
                          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600 text-sm shrink-0">
                            {co.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-sm text-gray-700 flex-1 truncate">{co.full_name}</span>
                          {co.is_primary && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-500 text-white rounded-full shrink-0">
                              Đại diện
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Payment info */}
                {latestPayment && (
                  <div className="card">
                    <h3 className="font-black text-gray-800 mb-3">💳 Kỳ thanh toán</h3>
                    <div className="space-y-2">
                      <InfoRow label="Số tiền" value={formatPrice(latestPayment.amount || room.price)} />
                      <InfoRow label="Hạn thanh toán" value={formatDate(latestPayment.due_date)} />
                      {latestPayment.paid_date && (
                        <InfoRow label="Ngày thanh toán" value={formatDate(latestPayment.paid_date)} />
                      )}
                      {!isPaid && daysUntilDue !== null && (
                        <div className={`rounded-xl px-3 py-2.5 text-sm font-bold ${
                          daysUntilDue < 0 ? 'bg-red-50 text-red-500' :
                          daysUntilDue <= 3 ? 'bg-orange-50 text-orange-500' :
                          'bg-primary-50 text-primary-600'
                        }`}>
                          {daysUntilDue < 0
                            ? `⚠️ Đã quá hạn ${Math.abs(daysUntilDue)} ngày`
                            : daysUntilDue === 0
                            ? '⏰ Hôm nay là hạn chót!'
                            : `📅 Còn ${daysUntilDue} ngày nữa đến hạn`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!isPaid && (
                  <div className="card">
                    <h3 className="font-black text-gray-800 mb-3">⚡ Thao tác nhanh</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => sendAction('payment_confirmed')}
                        disabled={sending === 'payment_confirmed'}
                        className="btn-primary w-full"
                      >
                        {sending === 'payment_confirmed' ? '⏳ Đang gửi...' : '✅ Đã thanh toán — Báo chủ nhà'}
                      </button>
                      <button
                        onClick={() => sendAction('extension_request')}
                        disabled={sending === 'extension_request'}
                        className="btn-secondary w-full"
                      >
                        {sending === 'extension_request' ? '⏳ Đang gửi...' : '📅 Xin gia hạn 10 ngày'}
                      </button>
                    </div>
                  </div>
                )}

                {isPaid && (
                  <div className="card text-center py-6 bg-primary-50 border border-primary-100">
                    <p className="text-4xl mb-2">🎉</p>
                    <p className="font-black text-primary-600 text-lg">Đã thanh toán rồi!</p>
                    <p className="text-sm text-primary-400 mt-1">Tháng này bạn đã hoàn thành thanh toán</p>
                  </div>
                )}

                {/* T-034: tenant quick nav grid (đồng thời cover /tenant/* routes) */}
                <div className="card">
                  <h3 className="font-black text-gray-800 mb-3">🔗 Truy cập nhanh</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <a href="/tenant/documents" className="flex flex-col items-center gap-1 py-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-colors">
                      <span className="text-2xl">📄</span>
                      <span className="text-xs font-bold text-blue-700">Giấy tờ</span>
                    </a>
                    <a href="/tenant/payments" className="flex flex-col items-center gap-1 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-colors">
                      <span className="text-2xl">💳</span>
                      <span className="text-xs font-bold text-emerald-700">Thanh toán</span>
                    </a>
                    <a href="/tenant/move-out" className="flex flex-col items-center gap-1 py-3 bg-orange-50 hover:bg-orange-100 rounded-2xl transition-colors">
                      <span className="text-2xl">🚪</span>
                      <span className="text-xs font-bold text-orange-700">Báo chuyển</span>
                    </a>
                    <a href="/tenant/guests" className="flex flex-col items-center gap-1 py-3 bg-purple-50 hover:bg-purple-100 rounded-2xl transition-colors">
                      <span className="text-2xl">👥</span>
                      <span className="text-xs font-bold text-purple-700">Khách đến</span>
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'notifs' && (
          <div className="space-y-3 animate-fade-in">
            {notifications.length === 0 && (
              <div className="card text-center py-8">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-400 font-medium">Chưa có thông báo nào</p>
              </div>
            )}
            {notifications.map(notif => (
              <div key={notif.id} className={`card ${notif.status === 'pending' ? 'border-l-4 border-accent-500' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-accent-50 rounded-full flex items-center justify-center text-lg shrink-0">
                    {notif.type === 'payment_reminder' ? '🔔' : notif.type === 'extension_approved' ? '✅' : '📢'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-gray-700">
                        {notif.sender?.full_name ?? 'Chủ nhà'}
                      </p>
                      <span className="text-xs text-gray-300 shrink-0">{formatTime(notif.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                    {notif.type === 'extension_approved' && (
                      <p className="text-xs font-bold text-primary-500 mt-1">✅ Chủ nhà đã duyệt</p>
                    )}
                    {notif.type === 'extension_rejected' && (
                      <p className="text-xs font-bold text-red-400 mt-1">❌ Chủ nhà từ chối</p>
                    )}
                  </div>
                </div>
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
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 font-medium">{label}</span>
      <span className="text-sm font-bold text-gray-700">{value}</span>
    </div>
  )
}

function formatPrice(n: number) { return n.toLocaleString('vi-VN') + 'đ' }
function formatDate(s: string)  { const d = new Date(s); return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}` }
function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')} · ${d.getDate()}/${d.getMonth()+1}`
}

function ChatIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-gray-500">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
