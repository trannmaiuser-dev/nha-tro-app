'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthPayload, AppNotification } from '@/types'
import { ChevronLeft, Bell, CheckCircle2, Calendar, XCircle, MessageCircle, Send } from 'lucide-react'

interface Props { currentUser: AuthPayload; notifications: AppNotification[] }

function NotifIcon({ type, pending }: { type: string; pending: boolean }) {
  const color = pending ? '#1D9E75' : '#A0A0A0'
  const p = { size: 18, strokeWidth: 1.5, color } as const
  switch (type) {
    case 'payment_reminder':   return <Bell {...p} />
    case 'payment_confirmed':  return <CheckCircle2 {...p} />
    case 'extension_request':  return <Calendar {...p} />
    case 'extension_approved': return <CheckCircle2 {...p} />
    case 'extension_rejected': return <XCircle {...p} />
    case 'compose_message':    return <Send {...p} />
    default:                   return <MessageCircle {...p} />
  }
}
const TYPE_LABELS: Record<string, string> = {
  payment_reminder:   'Nhắc tiền thuê', payment_confirmed: 'Đã thanh toán',
  extension_request:  'Xin gia hạn',    extension_approved: 'Gia hạn được duyệt', extension_rejected: 'Gia hạn từ chối',
  compose_message:    'Thông báo cá nhân',
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'Vừa xong'
  if (diff < 3600)  return `${Math.floor(diff/60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`
  return `${Math.floor(diff/86400)} ngày trước`
}

export default function NotificationsPage({ currentUser, notifications }: Props) {
  const router = useRouter()
  const [list, setList] = useState(notifications)
  const unread = list.filter(n => n.status === 'pending').length

  async function handleAction(id: string, action: 'accepted' | 'rejected') {
    await fetch('/api/notifications/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id, action }),
    })
    setList(prev => prev.map(n => n.id === id ? { ...n, status: action } : n))
  }

  async function handleAck(id: string) {
    const res = await fetch(`/api/notifications/${id}/ack`, { method: 'POST' })
    if (res.ok) {
      setList(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n))
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #EEF7FF 100%)' }}>
      <header className="bg-white shadow-soft px-4 pb-4 flex items-center gap-3"
        style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <button onClick={() => router.back()} className="p-2 text-gray-400 active:scale-95 transition-all">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-gray-800">Thông báo</h1>
          {unread > 0 && <p className="text-xs text-gray-400">{unread} chưa đọc</p>}
        </div>
        <button onClick={() => router.push('/notifications/compose')}
          className="btn-primary text-xs px-3 py-2">
          ✏️ Soạn
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-2">
        {list.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-bold text-gray-600">Chưa có thông báo nào</p>
          </div>
        ) : (
          list.map(notif => (
            <div key={notif.id}
              className={`bg-white rounded-2xl shadow-card p-4 ${notif.status === 'pending' ? 'border-l-4 border-primary-400' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: notif.status === 'pending' ? '#E8F5EE' : '#F5F5F5' }}>
                  <NotifIcon type={notif.type} pending={notif.status === 'pending'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-700">{notif.sender?.full_name ?? '—'}</p>
                    <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(notif.created_at)}</span>
                  </div>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: '#1D9E75' }}>{TYPE_LABELS[notif.type] || notif.type}</p>
                  <p className="text-sm text-gray-500 mt-1 leading-snug">{notif.message}</p>
                </div>
              </div>
              {notif.status === 'pending' && notif.type === 'extension_request' && currentUser.role === 'owner' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => handleAction(notif.id, 'accepted')}
                    className="flex-1 bg-primary-600 text-white font-bold rounded-xl py-2 text-sm active:scale-95 transition-all">
                    ✓ OK
                  </button>
                  <button onClick={() => handleAction(notif.id, 'rejected')}
                    className="flex-1 bg-red-50 text-red-400 font-bold rounded-xl py-2 text-sm active:scale-95 transition-all">
                    ✗ Từ chối
                  </button>
                </div>
              )}
              {notif.status === 'pending' && notif.type === 'compose_message' && notif.compose_id && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => handleAck(notif.id)}
                    className="w-full bg-primary-600 text-white font-bold rounded-xl py-2 text-sm active:scale-95 transition-all">
                    ✓ Đã đọc / Xác nhận
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
