'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthPayload } from '@/types'
import CreateTenantModal from './CreateTenantModal'
import {
  Building2, UserCheck, MessageCircle, BellRing, Wallet,
  FolderOpen, Settings2, UserPlus, LogOut,
  CalendarDays, AlertCircle, Loader2, Bell,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
interface HomeStats {
  totalRooms:          number
  occupiedRooms:       number
  vacantRooms:         number
  vacantRoomList:      { id: string; name: string; floor: number }[]
  unreadMessages:      number
  pendingNotifs:       number
  unconfirmedProfiles: number
  overduePayments:     number
  dueSoonCount:        number
}

// ─── Card colors ─────────────────────────────────────────────
interface CardColors {
  bg:       string
  text:     string
  circleBg: string
  border?:  string
}

const CARD_COLORS: Record<string, CardColors> = {
  rooms:     { bg: '#FFF0E6', text: '#E86B3A', circleBg: '#FFD4B0' },
  tenants:   { bg: '#E8F5EE', text: '#1D9E75', circleBg: '#B8E4CC' },
  chat:      { bg: '#EEF0FF', text: '#5B6AD0', circleBg: '#CDD1FF' },
  notifs:    { bg: '#FFF8E6', text: '#D4900A', circleBg: '#FFE49A' },
  payments:  { bg: '#FFE8F0', text: '#D4456B', circleBg: '#FFBCD4' },
  docs:      { bg: '#E8F8FF', text: '#2B8FB3', circleBg: '#B0E0F8' },
  settings:  { bg: '#F0EEF8', text: '#7B68C8', circleBg: '#D4CEEE' },
  addTenant: { bg: '#E8F5EE', text: '#1D9E75', circleBg: '#B8E4CC', border: '1.5px dashed #1D9E75' },
}

// ─── Card component ─────────────────────────────────────────
interface CardData {
  id:         string
  title:      string
  desc:       string
  Icon:       LucideIcon
  badge?:     { count: number; color: string } | null
  onClick:    () => void
  colors:     CardColors
  animDelay?: string
}

function HomeCard({ title, desc, Icon, badge, onClick, colors, animDelay }: CardData) {
  const [visible, setVisible] = useState(false)
  const delayMs = Math.round(parseFloat(animDelay || '0') * 1000)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <button
      onClick={onClick}
      className={[
        'relative flex flex-col items-center text-center rounded-3xl shadow-card p-4',
        'w-full h-full',
        'active:scale-95 transition-all duration-500 hover:-translate-y-1 hover:shadow-float',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
      ].join(' ')}
      style={{ background: colors.bg, border: colors.border || 'none' }}
    >
      {badge && badge.count > 0 && (
        <span className={`absolute top-2.5 right-2.5 min-w-[18px] h-[18px] px-1 ${badge.color} text-white text-[11px] font-black rounded-full flex items-center justify-center`}>
          {badge.count > 9 ? '9+' : badge.count}
        </span>
      )}

      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 animate-float"
        style={{ background: colors.circleBg }}
      >
        <Icon size={28} strokeWidth={1.5} color={colors.text} />
      </div>

      <p className="text-[13px] font-bold leading-snug" style={{ color: colors.text }}>
        {title}
      </p>
      <p className="text-[11px] mt-1 leading-snug font-medium" style={{ color: colors.text, opacity: 0.7 }}>
        {desc}
      </p>
    </button>
  )
}

// ─── Main Component ─────────────────────────────────────────
export default function HomePageOwner({ user, stats }: { user: AuthPayload; stats: HomeStats }) {
  const router = useRouter()
  const [greeting,        setGreeting]       = useState('Xin chào')
  const [greetEmoji,      setGreetEmoji]     = useState('👋')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sendingAll,      setSendingAll]     = useState(false)
  const [toast,           setToast]          = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if      (h >= 5  && h < 12) { setGreeting('Chào buổi sáng'); setGreetEmoji('☀️') }
    else if (h >= 12 && h < 18) { setGreeting('Chào buổi chiều'); setGreetEmoji('🌤️') }
    else if (h >= 18 && h < 23) { setGreeting('Chào buổi tối'); setGreetEmoji('🌙') }
    else                        { setGreeting('Chào đêm khuya'); setGreetEmoji('✨') }
  }, [])

  const showToastMsg = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }, [])

  async function sendAllReminders() {
    setSendingAll(true)
    try {
      const res = await fetch('/api/owner/bulk-remind', { method: 'POST' })
      const data = await res.json()
      showToastMsg(`✅ Đã gửi nhắc cho ${data.sent ?? 0} khách thuê!`)
    } catch {
      showToastMsg('Lỗi gửi thông báo')
    } finally {
      setSendingAll(false)
    }
  }

  const cards: CardData[] = [
    {
      id: 'rooms',
      title: 'Quản lý phòng',
      desc: 'Xem tình trạng các phòng',
      Icon: Building2,
      colors: CARD_COLORS.rooms,
      onClick: () => router.push('/dashboard'),
    },
    {
      id: 'tenants',
      title: 'Khách thuê',
      desc: 'Danh sách và hồ sơ khách',
      Icon: UserCheck,
      badge: stats.unconfirmedProfiles > 0 ? { count: stats.unconfirmedProfiles, color: 'bg-red-500' } : null,
      colors: CARD_COLORS.tenants,
      onClick: () => router.push('/dashboard'),
    },
    {
      id: 'chat',
      title: 'Tin nhắn',
      desc: 'Chat với khách thuê',
      Icon: MessageCircle,
      badge: stats.unreadMessages > 0 ? { count: stats.unreadMessages, color: 'bg-red-500' } : null,
      colors: CARD_COLORS.chat,
      onClick: () => router.push('/chat'),
    },
    {
      id: 'notifs',
      title: 'Thông báo',
      desc: 'Nhắc tiền & thông báo',
      Icon: BellRing,
      badge: stats.pendingNotifs > 0 ? { count: stats.pendingNotifs, color: 'bg-yellow-400' } : null,
      colors: CARD_COLORS.notifs,
      onClick: () => router.push('/dashboard'),
    },
    {
      id: 'payments',
      title: 'Thanh toán',
      desc: 'Theo dõi thu tiền thuê',
      Icon: Wallet,
      badge: stats.overduePayments > 0 ? { count: stats.overduePayments, color: 'bg-red-500' } : null,
      colors: CARD_COLORS.payments,
      onClick: () => router.push('/dashboard'),
    },
    {
      id: 'docs',
      title: 'Hồ sơ & Giấy tờ',
      desc: 'Lưu trữ tài liệu',
      Icon: FolderOpen,
      colors: CARD_COLORS.docs,
      onClick: () => router.push('/dashboard'),
    },
    {
      id: 'settings',
      title: 'Cài đặt',
      desc: 'Tùy chỉnh hệ thống',
      Icon: Settings2,
      colors: CARD_COLORS.settings,
      onClick: () => showToastMsg('Sắp ra mắt! 🔧'),
    },
    {
      id: 'add-tenant',
      title: 'Thêm khách thuê',
      desc: 'Tạo tài khoản khách mới',
      Icon: UserPlus,
      colors: CARD_COLORS.addTenant,
      onClick: () => setShowCreateModal(true),
    },
  ]

  const firstName = user.fullName.split(' ').pop() || user.fullName

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(160deg, #FFF8F0 0%, #EEF7FF 100%)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <header className="px-5 pb-5" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-lg font-black shadow-soft">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-gray-800 text-base">{user.fullName}</p>
                  <span className="text-xs font-bold bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">Chủ nhà</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">
                  {stats.totalRooms} phòng · {stats.occupiedRooms} đang thuê · {stats.vacantRooms} trống
                </p>
              </div>
            </div>
            <button
              onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }}
              className="p-2 bg-white rounded-xl shadow-card text-gray-400 active:scale-95 transition-all"
            >
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="animate-slide-up">
            <h1 className="text-2xl font-black text-gray-800 leading-tight">
              {greeting}, {firstName}! {greetEmoji}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {stats.dueSoonCount > 0
                ? `Có ${stats.dueSoonCount} phòng đến hạn thanh toán 📅`
                : 'Mọi thứ đang ổn định 🌿'}
            </p>
          </div>
        </div>
      </header>

      {/* ── Cards Grid ──────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-stretch">
          {cards.map((card, i) => (
            <HomeCard key={card.id} {...card} animDelay={`${i * 0.06}s`} />
          ))}
        </div>

        {/* ── Payment due banner ───────────────────────── */}
        {stats.dueSoonCount > 0 && (
          <div
            className="mt-5 bg-white rounded-3xl shadow-card p-4 flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
              <CalendarDays size={24} strokeWidth={1.5} color="#F57C00" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-800 text-sm">
                {stats.overduePayments > 0
                  ? `${stats.overduePayments} phòng đã quá hạn nộp tiền!`
                  : `${stats.dueSoonCount} phòng đến hạn trong 7 ngày`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Nhắc nhở để tránh chậm thanh toán</p>
            </div>
            <button
              onClick={sendAllReminders}
              disabled={sendingAll}
              className="shrink-0 bg-accent-500 text-white font-bold text-xs rounded-xl px-3 py-2.5 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {sendingAll
                ? <Loader2 size={14} className="animate-spin" />
                : <Bell size={14} strokeWidth={2} />}
              {sendingAll ? 'Đang gửi...' : 'Nhắc tất cả'}
            </button>
          </div>
        )}

        {/* ── Quick stats row ──────────────────────────── */}
        {(stats.unreadMessages > 0 || stats.unconfirmedProfiles > 0) && (
          <div className="mt-3 flex gap-3 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            {stats.unreadMessages > 0 && (
              <button
                onClick={() => router.push('/chat')}
                className="flex-1 bg-blue-50 border border-blue-100 rounded-2xl p-3 text-left active:scale-95 transition-all"
              >
                <p className="text-xs text-blue-400 font-semibold">Tin nhắn mới</p>
                <p className="text-lg font-black text-blue-600">{stats.unreadMessages}</p>
              </button>
            )}
            {stats.unconfirmedProfiles > 0 && (
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 flex items-center gap-3 px-4 py-3 active:scale-95 transition-all rounded-xl"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
              >
                <AlertCircle size={20} strokeWidth={1.5} color="#D97706" className="shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[11px] font-semibold" style={{ color: '#D97706' }}>Hồ sơ chờ duyệt</p>
                  <p className="text-2xl font-black leading-none mt-0.5" style={{ color: '#92400E' }}>
                    {stats.unconfirmedProfiles}
                  </p>
                </div>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white font-semibold text-sm px-5 py-3 rounded-2xl shadow-float z-50 animate-slide-up">
          {toast}
        </div>
      )}

      {showCreateModal && (
        <CreateTenantModal
          // T-019: HomePageOwner pass vacant-only list (legacy quick-create flow).
          // OwnerDashboard pass all rooms với count cho multi-tenant add.
          availableRooms={stats.vacantRoomList.map(r => ({ ...r, tenantCount: 0 }))}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
