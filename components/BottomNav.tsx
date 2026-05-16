'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, MessageCircle, Bell, UserCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Badge { messages: number; notifications: number }

const TABS: { id: string; label: string; href: string; Icon: LucideIcon; badgeKey?: 'messages' | 'notifications' }[] = [
  { id: 'home',      label: 'Trang chủ', href: '/home',          Icon: Home },
  { id: 'community', label: 'Cộng đồng', href: '/community',     Icon: Users },
  { id: 'chat',      label: 'Tin nhắn',  href: '/chat',          Icon: MessageCircle, badgeKey: 'messages' },
  { id: 'notifs',    label: 'Thông báo', href: '/notifications', Icon: Bell,          badgeKey: 'notifications' },
  { id: 'profile',   label: 'Tôi',       href: '/profile',       Icon: UserCircle },
]

const HIDE_PATHS = ['/login', '/first-login', '/profile/setup']

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [badge, setBadge] = useState<Badge>({ messages: 0, notifications: 0 })

  const shouldHide = HIDE_PATHS.some(p => pathname.startsWith(p))

  // useEffect MUST be before any early return (Rules of Hooks)
  useEffect(() => {
    if (shouldHide) return
    async function loadBadges() {
      try {
        const [msgRes, notifRes] = await Promise.all([
          fetch('/api/messages/unread'),
          fetch('/api/notifications/unread-count'),
        ])
        const [msg, notif] = await Promise.all([msgRes.json(), notifRes.json()])
        setBadge({ messages: msg.count ?? 0, notifications: notif.count ?? 0 })
      } catch { /* silent */ }
    }
    loadBadges()
    const t = setInterval(loadBadges, 30_000)
    return () => clearInterval(t)
  }, [pathname, shouldHide])

  if (shouldHide) return null

  const activeTab = TABS.find(t =>
    pathname === t.href || (t.href !== '/home' && pathname.startsWith(t.href))
  )?.id ?? ''

  return (
    <>
      {/* Spacer */}
      <div className="h-[60px]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} aria-hidden />

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white flex items-end justify-around"
        style={{
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const count    = tab.badgeKey ? badge[tab.badgeKey] : 0
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-[60px] relative transition-all duration-200 active:scale-90"
              aria-label={tab.label}
            >
              {count > 0 && (
                <span className="absolute top-2 right-1/2 translate-x-3 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center leading-none">
                  {count > 9 ? '9+' : count}
                </span>
              )}

              <tab.Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.6}
                color={isActive ? '#1D9E75' : '#A0A0A0'}
              />

              <span
                className="text-[10px] font-semibold transition-colors duration-200"
                style={{ color: isActive ? '#1D9E75' : '#A0A0A0' }}
              >
                {tab.label}
              </span>

              {isActive && (
                <span
                  className="absolute bottom-1.5 w-1 h-1 rounded-full"
                  style={{ background: '#1D9E75' }}
                />
              )}
            </button>
          )
        })}
      </nav>
    </>
  )
}
