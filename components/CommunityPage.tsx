'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { AuthPayload } from '@/types'
import {
  Clock, Loader2, CheckCircle2, Pin, PinOff, Archive, Trash2,
  X, ImagePlus, SmilePlus, CornerDownRight,
  ClipboardList, PenLine, ChevronDown, Check, Tag, Users,
  Globe, Lock, Wrench, ShoppingBag,
  Home, UserCircle2, CalendarDays, SendHorizonal,
  Cloud, Sun, CloudRain, CloudLightning, CloudSun, Snowflake,
  Palette, Sparkles, Flame, Shield, Settings2, Crown, UserPlus,
} from 'lucide-react'
import StatusBadge  from '@/components/ui/StatusBadge'
import DatePicker   from '@/components/ui/DatePicker'
import CommentInput, { Lightbox } from '@/components/ui/CommentInput'
import TagInput from '@/components/ui/TagInput'
import type { TagUser } from '@/components/ui/TagInput'
import {
  DecorationCat, DecorationCorgi, DecorationRabbit, DecorationPanda,
  DecorationSmileyStar, DecorationWingedHeart, DecorationSmileFlower,
  DecorationSleepyMoon, DecorationBirthdayCake, DecorationCoffee, DecorationRainbow,
} from '@/components/icons/CustomIcons'

// ─── Types ───────────────────────────────────────────────────
interface Author { id: string; full_name: string; role: string }
interface Reaction { reaction_type: string; user_id: string }
interface Post {
  id: string; author_id: string; content: string; image_url: string | null
  visibility: string; is_pinned: boolean; created_at: string
  status: 'pending' | 'in_progress' | 'done'; done_at: string | null; hidden_at: string | null
  theme_id: number; font_style: string; decoration_id: number
  author: Author; reactions: Reaction[]
  tags?: { tagged_user_id: string; user: { full_name: string } }[]
  replies?: { id: string }[]
}
interface Reply {
  id: string; post_id: string; author_id: string; content: string
  image_url: string | null; created_at: string; author: Author
}
interface Maintenance {
  id: string; reporter_id: string; description: string; image_url: string | null
  status: 'new' | 'in_progress' | 'done'; created_at: string; resolved_at: string | null; reporter: Author
}
interface MaintReply {
  id: string; request_id: string; author_id: string; content: string; created_at: string; author: Author
}
interface MarketPost {
  id: string; author_id: string; type: string; title: string; description: string | null
  image_url: string | null; author: { full_name: string }; created_at: string
}
interface MarketReply {
  id: string; post_id: string; author_id: string; content: string; created_at: string; author: Author
}
interface Event {
  id: string; title: string; description: string | null; event_date: string
  creator_id: string; creator: { full_name: string }
  response_option_yes: string; response_option_no: string
  deleted_at: string | null
  responses: { user_id: string; response: string; user: { full_name: string } }[]
  tags: { user_id: string; user: { id: string; full_name: string } }[]
}
interface EventComment {
  id: string; event_id: string; author_id: string; content: string
  image_url: string | null; created_at: string; author: Author
}
interface SimpleUser { id: string; full_name: string; role: string }
interface HeroTeamMember {
  id: string; team_id: string; user_id: string; role: 'leader' | 'member'
  user: { id: string; full_name: string }
}
interface HeroTeam {
  id: string; team_type: 'fire' | 'repair' | 'cleaning'; members: HeroTeamMember[]
}

interface Props {
  currentUser:        AuthPayload
  initialPosts:       Post[]
  initialPinned:      Post[]
  initialMaintenance: Maintenance[]
  initialEvents:      Event[]
  initialMarketplace: MarketPost[]
  allUsers:           SimpleUser[]
}

// ─── Theme & Font constants ───────────────────────────────────
interface Theme {
  id: number; name: string; gradient: string; bg: string
  textColor: string; textShadow?: string
  borderLeft?: string; border?: string
}
const THEMES: Theme[] = [
  { id: 1,  name: 'Sunset',  gradient: 'linear-gradient(135deg,#FF6B6B,#FFE66D)', bg: '',       textColor: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  { id: 2,  name: 'Ocean',   gradient: 'linear-gradient(135deg,#667EEA,#764BA2)', bg: '',       textColor: '#fff' },
  { id: 3,  name: 'Forest',  gradient: 'linear-gradient(135deg,#56AB2F,#A8E063)', bg: '',       textColor: '#fff' },
  { id: 4,  name: 'Candy',   gradient: 'linear-gradient(135deg,#FF9A9E,#FECFEF)', bg: '',       textColor: '#5a2d6b' },
  { id: 5,  name: 'Sky',     gradient: 'linear-gradient(135deg,#74B9FF,#0984E3)', bg: '',       textColor: '#fff' },
  { id: 6,  name: 'Peach',   gradient: 'linear-gradient(135deg,#FDDB92,#D1913C)', bg: '',       textColor: '#fff' },
  { id: 7,  name: 'Mint',    gradient: 'linear-gradient(135deg,#84FAB0,#8FD3F4)', bg: '',       textColor: '#1a5276' },
  { id: 8,  name: 'Rose',    gradient: 'linear-gradient(135deg,#FBC2EB,#A18CD1)', bg: '',       textColor: '#fff' },
  { id: 9,  name: 'Kem',       gradient: '',                                         bg: '#FFFBF0', textColor: '#2D2D2D', borderLeft: '3px solid #F59E0B' },
  { id: 10, name: 'Trắng',    gradient: '',                                         bg: '#fff',    textColor: '#2D2D2D', border: '1px solid #E8E0D8' },
  { id: 11, name: 'Midnight', gradient: 'linear-gradient(135deg,#2D3436,#636E72)', bg: '',        textColor: '#FFFFFF' },
]
interface FontDef {
  fontFamily: string; fontWeight?: number; letterSpacing?: string
  fontSize?: string; fontStyle?: string
}
const FONT_STYLES: Record<string, FontDef> = {
  normal:        { fontFamily: "var(--font-nunito), sans-serif",    fontWeight: 600,  fontSize: '17px' },
  handwriting:   { fontFamily: "var(--font-caveat), cursive",       fontWeight: 700,  fontSize: '20px' },
  righteous:     { fontFamily: "var(--font-righteous), cursive",    fontWeight: 400,  fontSize: '17px', letterSpacing: '0.5px' },
  'space-mono':  { fontFamily: "var(--font-space-mono), monospace", fontWeight: 400,  fontSize: '14px', letterSpacing: '-0.5px' },
  playfair:      { fontFamily: "var(--font-playfair), serif",       fontWeight: 700,  fontSize: '17px', fontStyle: 'italic' },
}
const FONT_LABELS: Record<string, string> = {
  normal:       'Aa bình thường',
  handwriting:  'Aa viết tay',
  righteous:    'Aa vui nhộn',
  'space-mono': 'Aa máy tính',
  playfair:     'Aa sang trọng',
}

function getTheme(id: number): Theme { return THEMES.find(t => t.id === id) || THEMES[8] }
function isGradient(themeId: number): boolean { return !!getTheme(themeId).gradient }
function getCardBgStyle(themeId: number): React.CSSProperties {
  const t = getTheme(themeId)
  if (t.gradient) return { background: t.gradient }
  return {
    background: t.bg,
    ...(t.borderLeft ? { borderLeft: t.borderLeft } : {}),
    ...(t.border ? { border: t.border } : {}),
  }
}
function getFontCss(fontStyle: string): React.CSSProperties {
  const f = FONT_STYLES[fontStyle] || FONT_STYLES.normal
  return {
    fontFamily: f.fontFamily,
    ...(f.fontWeight   ? { fontWeight: f.fontWeight }     : {}),
    ...(f.letterSpacing? { letterSpacing: f.letterSpacing }: {}),
    ...(f.fontSize     ? { fontSize: f.fontSize }         : {}),
    ...(f.fontStyle    ? { fontStyle: f.fontStyle }       : {}),
  }
}

// ─── Other constants ──────────────────────────────────────────
const REACTIONS = ['👍', '❤️', '😂', '😮']
const MARKET_TYPES = {
  give:     { label: 'Cho/Tặng 🎁', color: '#1D9E75' },
  roommate: { label: 'Ở ghép 🤝',   color: '#5B6AD0' },
  borrow:   { label: 'Hỏi mượn 🔧', color: '#D4900A' },
}
// decoration_id 1–11 = sticker, 12 = none
const DECORATION_COMPONENTS = [
  DecorationCat, DecorationCorgi, DecorationRabbit, DecorationPanda,
  DecorationSmileyStar, DecorationWingedHeart, DecorationSmileFlower,
  DecorationSleepyMoon, DecorationBirthdayCake, DecorationCoffee, DecorationRainbow,
] as const

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

const TEAM_CONFIG = {
  fire:     { name: 'Đội Cứu Hỏa',  desc: 'Xử lý khẩn cấp',     Icon: Flame,    color: '#EF4444' },
  repair:   { name: 'Đội Sửa Chữa', desc: 'Bảo trì & sửa chữa', Icon: Wrench,   color: '#F59E0B' },
  cleaning: { name: 'Đội Vệ Sinh',  desc: 'Giữ nhà sạch đẹp',   Icon: Sparkles, color: '#10B981' },
} as const

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'Vừa xong'
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}
function countByType(reactions: Reaction[] | undefined | null) {
  const map: Record<string, number> = {}
  ;(reactions ?? []).forEach(r => { map[r.reaction_type] = (map[r.reaction_type] || 0) + 1 })
  return map
}

function renderMentions(text: string) {
  return text.split(/(@\S+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-semibold" style={{ color: '#1D9E75' }}>{part}</span>
      : <span key={i}>{part}</span>
  )
}

function Avatar({ name, role, size = 'md' }: { name: string; role?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s  = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm'
  const bg = role === 'owner' ? '#1D9E75' : '#5B6AD0'
  return (
    <div className={`${s} rounded-full flex items-center justify-center font-black text-white shrink-0`} style={{ background: bg }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}


// ─── Weather + Countdown ──────────────────────────────────────
function WeatherIcon({ desc }: { desc: string }) {
  const d = desc.toLowerCase()
  const p = { size: 26, strokeWidth: 1.5 } as const
  if (d.includes('sunny'))                return <Sun {...p} color="#FCD34D" />
  if (d.includes('clear'))                return <Sun {...p} color="#94A3B8" />
  if (d.includes('thunder'))              return <CloudLightning {...p} color="#818CF8" />
  if (d.includes('rain') || d.includes('drizzle')) return <CloudRain {...p} color="#64B5F6" />
  if (d.includes('snow'))                 return <Snowflake {...p} color="#93C5FD" />
  if (d.includes('partly') || d.includes('cloud')) return <CloudSun {...p} color="#64B5F6" />
  return <Cloud {...p} color="#64B5F6" />
}

function WeatherCountdown() {
  const [weather, setWeather] = useState<{ temp: string; desc: string } | null>(null)
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 7000)
    fetch('/api/weather', { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setWeather({ temp: d.temp ?? '--', desc: d.desc ?? '' }))
      .catch(() => setWeather({ temp: '--', desc: 'Không tải được' }))
      .finally(() => { clearTimeout(timer); setLoading(false) })
  }, [])

  const now = new Date()
  const payDay = 5
  const nextPay = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= payDay ? 1 : 0), payDay)
  const daysLeft = Math.ceil((nextPay.getTime() - now.getTime()) / 86400_000)

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-white rounded-2xl p-3.5 shadow-card">
        <p className="text-[11px] font-semibold text-gray-400 mb-1">Hà Nội hôm nay</p>
        {loading ? <div className="skeleton h-8 w-24 rounded-xl" /> : (
          <>
            <div className="flex items-center gap-1.5">
              <WeatherIcon desc={weather?.desc ?? ''} />
              <span className="text-2xl font-black text-gray-800">{weather?.temp}°C</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{weather?.desc}</p>
          </>
        )}
      </div>
      <div className="bg-white rounded-2xl p-3.5 shadow-card">
        <p className="text-[11px] font-semibold text-gray-400 mb-1">Đóng tiền phòng</p>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={26} strokeWidth={1.5} color={daysLeft <= 3 ? '#E53935' : '#1D9E75'} />
          <span className="text-2xl font-black" style={{ color: daysLeft <= 3 ? '#E53935' : '#1D9E75' }}>{daysLeft}</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">ngày nữa (ngày {payDay})</p>
      </div>
    </div>
  )
}

// ─── Post Detail Modal ────────────────────────────────────────
function PostDetailModal({ post, currentUser, isOwner, allUsers, onClose, onReact, onStatusChange }: {
  post: Post; currentUser: AuthPayload; isOwner: boolean; allUsers: SimpleUser[]
  onClose: () => void
  onReact: (id: string, r: string) => void
  onStatusChange: (id: string, status: Post['status']) => void
}) {
  const [replies,        setReplies]        = useState<Reply[]>([])
  const [loadingReplies, setLoadingReplies] = useState(true)
  const [showReactions,  setShowReactions]  = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [confirmDone,    setConfirmDone]    = useState(false)
  const [lightbox,       setLightbox]       = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const themeId     = post.theme_id ?? 9
  const gradient    = isGradient(themeId)
  const theme       = getTheme(themeId)
  const textColor   = theme.textColor
  const fontCss     = getFontCss(post.font_style ?? 'normal')

  const reactions   = post.reactions ?? []
  const reactionMap = countByType(reactions)
  const myReaction  = reactions.find(r => r.user_id === currentUser.userId)?.reaction_type
  const canChangeStatus = post.author_id === currentUser.userId || isOwner

  useEffect(() => {
    fetch(`/api/community/posts/${post.id}/replies`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setReplies(d) })
      .catch(() => {}).finally(() => setLoadingReplies(false))
  }, [post.id])

  function handleStatusSelect(s: Post['status']) {
    if (s === 'done' && post.status !== 'done') { setShowStatusMenu(false); setConfirmDone(true) }
    else { setShowStatusMenu(false); onStatusChange(post.id, s) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl rounded-b-none sm:rounded-3xl animate-slide-up flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 16px)', boxShadow: 'var(--shadow-float)' }} onClick={e => e.stopPropagation()}>

        {/* Post header — with theme gradient */}
        <div className="rounded-t-3xl sm:rounded-t-3xl overflow-hidden shrink-0" style={gradient ? { background: theme.gradient } : { background: theme.bg }}>
          {/* Status + close bar */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={post.status} light={gradient} />
              {canChangeStatus && (
                <div className="relative">
                  <button onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.25)', color: gradient ? '#fff' : '#6B6B6B' }}>
                    <ChevronDown size={10} strokeWidth={2.5} />
                  </button>
                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-float z-20 overflow-hidden min-w-[160px] py-1" onClick={e => e.stopPropagation()}>
                      {(['pending', 'in_progress', 'done'] as Post['status'][]).map(key => (
                        <button key={key} onClick={() => handleStatusSelect(key)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                          <StatusBadge status={key} size="sm" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.25)', color: gradient ? '#fff' : '#6B6B6B' }}>
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Author row */}
          <div className="flex items-center gap-2.5 px-4 pb-3">
            <Avatar name={post.author.full_name} role={post.author.role} size="lg" />
            <div>
              <p className="text-sm font-bold" style={{ color: textColor }}>{post.author.full_name}</p>
              <p className="text-[11px] opacity-75" style={{ color: textColor }}>{timeAgo(post.created_at)} · {post.visibility === 'public' ? 'Công khai' : 'Riêng tư'}</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <p className="leading-relaxed whitespace-pre-wrap"
              style={{
                color: textColor,
                ...fontCss,
                textShadow: gradient ? theme.textShadow : undefined,
                fontSize: post.content.length < 50 ? '22px' : post.content.length < 120 ? '18px' : '15px',
              }}>
              {post.content}
            </p>
            {post.image_url && (
              <a href={post.image_url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                <Image src={post.image_url} alt="" width={600} height={256} className="w-full rounded-2xl object-cover max-h-64" />
              </a>
            )}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map(t => (
                  <span key={t.user.full_name} className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.25)', color: textColor }}>
                    @{t.user.full_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reactions bar */}
          <div className="flex items-center gap-3 px-4 py-2.5"
            style={{ background: gradient ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.04)', backdropFilter: gradient ? 'blur(4px)' : undefined }}>
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {Object.entries(reactionMap).map(([type, count]) => (
                <span key={type} className="text-xs rounded-full px-1.5 py-0.5 font-semibold"
                  style={{ background: 'rgba(255,255,255,0.3)', color: gradient ? '#fff' : '#6B6B6B' }}>
                  {type} {count}
                </span>
              ))}
            </div>
            <div className="relative shrink-0">
              <button onClick={() => setShowReactions(!showReactions)}
                className="flex items-center gap-1.5 py-1.5 px-2.5 text-xs rounded-xl font-semibold transition-colors"
                style={{ background: myReaction ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)', color: gradient ? '#fff' : '#6B6B6B' }}>
                <SmilePlus size={13} strokeWidth={1.8} />
                {myReaction || 'React'}
              </button>
              {showReactions && (
                <div className="absolute bottom-full right-0 mb-1 bg-white rounded-2xl shadow-float flex gap-1 p-2 z-10 animate-slide-down">
                  {REACTIONS.map(r => (
                    <button key={r} onClick={() => { onReact(post.id, r); setShowReactions(false) }}
                      className={`text-xl p-1.5 rounded-xl transition-all hover:scale-125 active:scale-95 ${myReaction === r ? 'bg-green-50 scale-110' : ''}`}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Replies section */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5 mb-3">
            <CornerDownRight size={13} strokeWidth={2} className="text-gray-400" />
            <p className="text-xs font-black text-gray-500">Bình luận {replies.length > 0 ? `(${replies.length})` : ''}</p>
          </div>
          {loadingReplies ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-12 rounded-2xl" />)}</div>
          ) : replies.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Chưa có bình luận. Hãy là người đầu tiên!</p>
          ) : (
            <div className="space-y-3">
              {replies.map(r => (
                <div key={r.id} className="flex items-start gap-2.5">
                  <Avatar name={r.author.full_name} role={r.author.role} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 rounded-2xl px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-gray-700">{r.author.full_name}</span>
                        <span className="text-[10px] text-gray-400">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{renderMentions(r.content)}</p>
                    </div>
                    {r.image_url && <Image src={r.image_url} alt="" width={400} height={160} onClick={() => setLightbox(r.image_url!)} className="mt-1.5 max-h-40 rounded-xl object-cover cursor-pointer" />}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply input */}
        <div className="px-4 pt-3 pb-4 border-t border-gray-50 shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}>
          <CommentInput
            currentUser={{ fullName: currentUser.fullName, role: currentUser.role }}
            users={allUsers.map(u => ({ id: u.id, full_name: u.full_name, role: u.role }))}
            placeholder="Viết bình luận..."
            accentColor="#1D9E75"
            onSubmit={async (content, imageUrl) => {
              const res = await fetch(`/api/community/posts/${post.id}/replies`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, imageUrl }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error || 'Không gửi được')
              setReplies(p => [...p, data])
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }}
          />
        </div>
      </div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox('')} />}

      {confirmDone && (
        <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 60 }} onClick={() => setConfirmDone(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-float animate-slide-up" onClick={e => e.stopPropagation()}>
            <CheckCircle2 size={44} strokeWidth={1.5} color="#2E7D32" className="mx-auto mb-3" />
            <p className="font-black text-gray-800 mb-1">Đánh dấu hoàn thành?</p>
            <p className="text-sm text-gray-500 mb-5">Bài này sẽ được ẩn sau 2 ngày</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDone(false)} className="btn-ghost flex-1 py-3 text-sm">Hủy</button>
              <button onClick={() => { setConfirmDone(false); onStatusChange(post.id, 'done') }} className="btn-primary flex-1 py-3 text-sm">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Collapsed Post Card ──────────────────────────────────────
function CollapsedPostCard({ post, currentUserId, isOwner, onReact, onPin, onOpen, onDelete, index }: {
  post: Post; currentUserId: string; isOwner: boolean; index: number
  onReact:  (id: string, r: string) => void
  onPin:    (id: string, p: boolean) => void
  onOpen:   (p: Post) => void
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const themeId     = post.theme_id ?? 9
  const grad        = isGradient(themeId)
  const theme       = getTheme(themeId)
  const textColor   = theme.textColor
  const fontCss     = getFontCss(post.font_style ?? 'normal')
  const reactions   = post.reactions ?? []
  const reactionMap = countByType(reactions)
  const myReaction  = reactions.find(r => r.user_id === currentUserId)?.reaction_type
  const replyCount  = post.replies?.length ?? 0
  const decorIdx    = (post.decoration_id ?? 12) - 1
  const DecorationComp = decorIdx >= 0 && decorIdx < DECORATION_COMPONENTS.length
    ? DECORATION_COMPONENTS[decorIdx] : null
  const isArchived  = post.status === 'done' && post.done_at && (Date.now() - new Date(post.done_at).getTime()) > TWO_DAYS_MS
  const isShort     = post.content.length < 60
  const isAuthor    = post.author_id === currentUserId

  // Inline confirm overlay — appears at top of card
  const ConfirmDeleteBar = confirmDelete ? (
    <div className="absolute inset-x-2 top-2 z-30 flex items-center justify-between gap-2 animate-slide-down"
      style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 16, padding: '8px 14px' }}
      onClick={e => e.stopPropagation()}>
      <span className="text-white text-xs font-semibold">Xóa bài này?</span>
      <div className="flex gap-2">
        <button onClick={() => { setConfirmDelete(false); onDelete(post.id) }}
          className="text-xs font-bold text-white bg-red-500 px-3 py-1 rounded-full active:scale-95 transition-all">
          Xóa
        </button>
        <button onClick={() => setConfirmDelete(false)}
          className="text-xs font-bold px-3 py-1 rounded-full active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
          Thôi
        </button>
      </div>
    </div>
  ) : null

  if (grad) {
    // ── Gradient card ──────────────────────────────────────
    return (
      <div className={`rounded-2xl overflow-hidden shadow-card cursor-pointer relative transition-all duration-150 active:scale-[0.99] ${isArchived ? 'opacity-60' : ''}`}
        style={{ background: theme.gradient }} onClick={() => onOpen(post)}>

        {ConfirmDeleteBar}

        {/* Content area */}
        <div className="relative p-5 overflow-hidden">
          {/* Decoration sticker */}
          {DecorationComp && (
            <div className="absolute bottom-2 right-2 w-16 h-16 pointer-events-none" style={{ opacity: 0.85 }}>
              <DecorationComp color="white" />
            </div>
          )}

          {/* Author + actions row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar name={post.author.full_name} role={post.author.role} size="sm" />
              <div>
                <p className="text-xs font-bold" style={{ color: textColor }}>{post.author.full_name}</p>
                <p className="text-[10px] opacity-70" style={{ color: textColor }}>{timeAgo(post.created_at)} · {post.visibility === 'public' ? 'Công khai' : 'Riêng tư'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={post.status} light />
              {isOwner && (
                <button onClick={e => { e.stopPropagation(); onPin(post.id, !post.is_pinned) }}
                  className="p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.25)' }}
                  title={post.is_pinned ? 'Bỏ ghim' : 'Ghim bài'}>
                  {post.is_pinned
                    ? <PinOff size={12} color="#FFD700" />
                    : <Pin size={12} color="rgba(255,255,255,0.75)" />}
                </button>
              )}
              {(isAuthor || isOwner) && (
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                  className="flex items-center justify-center transition-all duration-150 active:scale-90"
                  style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                  <Trash2 size={14} strokeWidth={1.8} />
                </button>
              )}
            </div>
          </div>

          {/* Content text */}
          <p className={`leading-snug ${isShort ? 'text-center' : 'line-clamp-3'}`}
            style={{
              color: textColor,
              fontSize: isShort ? '22px' : post.content.length < 120 ? '17px' : '14px',
              textShadow: theme.textShadow,
              ...fontCss,
            }}>
            {post.content}
          </p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.map(t => (
                <span key={t.user.full_name} className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.22)', color: textColor }}>
                  @{t.user.full_name}
                </span>
              ))}
            </div>
          )}
          {/* Thumbnail */}
          {post.image_url && !isShort && (
            <Image src={post.image_url} alt="" width={600} height={128} className="w-full h-32 object-cover rounded-xl mt-3" />
          )}
        </div>

        {/* Reactions bar (glass) */}
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)' }}>
          <div className="flex items-center gap-1 flex-1 flex-wrap">
            {Object.entries(reactionMap).map(([type, count]) => (
              <span key={type} className="text-[11px] rounded-full px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                {type} {count}
              </span>
            ))}
            {Object.keys(reactionMap).length === 0 && (
              <button onClick={e => { e.stopPropagation(); onReact(post.id, '👍') }}
                className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                <SmilePlus size={12} strokeWidth={1.8} /> React
              </button>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold shrink-0" style={{ color: 'rgba(255,255,255,0.8)' }}>
            <CornerDownRight size={11} strokeWidth={2} />
            {replyCount > 0 ? replyCount : 'Bình luận'}
          </span>
        </div>
      </div>
    )
  }

  // ── Plain card (theme 9 or 10) ───────────────────────────
  return (
    <div className={`rounded-2xl shadow-card cursor-pointer relative overflow-hidden transition-all duration-150 active:scale-[0.99] ${isArchived ? 'opacity-60' : ''}`}
      style={getCardBgStyle(themeId)} onClick={() => onOpen(post)}>

      {ConfirmDeleteBar}

      {/* Decoration sticker */}
      {DecorationComp && (
        <div className="absolute bottom-2 right-2 w-16 h-16 pointer-events-none" style={{ opacity: 0.82 }}>
          <DecorationComp color={textColor === '#2D2D2D' ? 'rgba(0,0,0,0.18)' : textColor} />
        </div>
      )}

      <div className="p-3.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={post.author.full_name} role={post.author.role} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-gray-900 truncate">{post.author.full_name}</p>
                <span className="flex items-center px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: post.author.role === 'owner' ? '#E8F5EE' : '#EEF0FF' }}>
                  {post.author.role === 'owner'
                    ? <Home size={10} strokeWidth={1.8} color="#1D9E75" />
                    : <UserCircle2 size={10} strokeWidth={1.8} color="#5B6AD0" />}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">{timeAgo(post.created_at)} · {post.visibility === 'public' ? 'Công khai' : 'Riêng tư'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={post.status} />
            {isOwner && (
              <button onClick={e => { e.stopPropagation(); onPin(post.id, !post.is_pinned) }}
                className="flex items-center justify-center transition-all duration-150 active:scale-90"
                style={{ width: 26, height: 26, borderRadius: '50%', background: post.is_pinned ? '#FFF3CD' : '#F0F0F0' }}
                title={post.is_pinned ? 'Bỏ ghim' : 'Ghim bài'}>
                {post.is_pinned
                  ? <PinOff size={12} color="#D4900A" />
                  : <Pin size={12} color="#A0A0A0" />}
              </button>
            )}
            {(isAuthor || isOwner) && (
              <button onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                className="flex items-center justify-center transition-all duration-150 active:scale-90"
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.35)' }}>
                <Trash2 size={14} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>

        {/* Content preview */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed line-clamp-2 italic" style={{ color: '#4A4A4A', ...fontCss }}>{post.content}</p>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {post.tags.map(t => (
                  <span key={t.user.full_name} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.06)', color: '#6B6B6B' }}>
                    @{t.user.full_name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {post.image_url && <Image src={post.image_url} alt="" width={56} height={56} className="w-14 h-14 object-cover rounded-xl shrink-0" />}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-black/[0.04]">
          <div className="flex items-center gap-1 flex-1 flex-wrap">
            {Object.entries(reactionMap).map(([type, count]) => (
              <span key={type} className="text-[11px] bg-black/5 rounded-full px-1.5 py-0.5 font-semibold text-gray-500">{type} {count}</span>
            ))}
            {Object.keys(reactionMap).length === 0 && (
              <button onClick={e => { e.stopPropagation(); onReact(post.id, '👍') }} className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold">
                <SmilePlus size={12} strokeWidth={1.8} /> React
              </button>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold shrink-0">
            <CornerDownRight size={11} strokeWidth={2} />
            {replyCount > 0 ? replyCount : 'Bình luận'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Create Post Modal (upgraded) ────────────────────────────
function CreatePostModal({ onClose, onCreated, currentUser, allUsers }: {
  onClose: () => void; onCreated: (p: Post) => void; currentUser: AuthPayload; allUsers: SimpleUser[]
}) {
  const [content,       setContent]       = useState('')
  const [visibility,    setVisibility]    = useState<'public' | 'private'>('public')
  const [imageUrl,      setImageUrl]      = useState('')
  const [uploading,     setUploading]     = useState(false)
  const [tagged,        setTagged]        = useState<string[]>([])
  const [showTag,       setShowTag]       = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [selectedTheme,      setSelectedTheme]      = useState(9)
  const [selectedFont,       setSelectedFont]       = useState('normal')
  const [selectedDecoration, setSelectedDecoration] = useState(12) // 12 = none
  const fileRef = useRef<HTMLInputElement>(null)

  const theme   = getTheme(selectedTheme)
  const grad    = isGradient(selectedTheme)
  const fontCss = getFontCss(selectedFont)
  const isShort = content.length < 60

  async function uploadImageFile(file: File) {
    setUploading(true)
    try {
      const form = new FormData(); form.append('file', file)
      const { url } = await (await fetch('/api/upload/community', { method: 'POST', body: form })).json()
      if (url) setImageUrl(url)
    } finally { setUploading(false) }
  }

  async function submit() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, imageUrl: imageUrl || null, visibility, taggedUserIds: tagged, themeId: selectedTheme, fontStyle: selectedFont, decorationId: selectedDecoration }),
      })
      const post = await res.json()
      if (post.id) {
        // Enrich with tag data immediately (API returns tags:[])
        const tagObjects = allUsers
          .filter(u => tagged.includes(u.id))
          .map(u => ({ tagged_user_id: u.id, user: { full_name: u.full_name } }))
        onCreated({ ...post, tags: tagObjects })
        onClose()
      }
    } finally { setSubmitting(false) }
  }

  // Compute preview background (no border properties — they look like lines inside preview)
  const previewBg: React.CSSProperties = grad
    ? { background: theme.gradient }
    : { background: theme.bg || '#FFFBF0' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>

      {/* Modal container — overflow:hidden prevents child overflow bleed */}
      <div className="bg-white w-full animate-slide-up flex flex-col rounded-t-3xl rounded-b-none sm:rounded-3xl"
        style={{
          maxWidth: 480,
          maxHeight: 'calc(100dvh - 16px)', overflow: 'hidden',
          boxShadow: 'var(--shadow-float)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between shrink-0"
          style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center gap-2">
            <PenLine size={16} strokeWidth={2} color="#1D9E75" />
            <h3 className="font-black text-gray-800">Tạo bài viết</h3>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center text-gray-400 transition-colors hover:bg-gray-200 active:scale-95"
            style={{ width: 32, height: 32, borderRadius: '50%', background: '#F5F5F5' }}>
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable body — min-h-0 is critical for flex overflow in Firefox */}
        <div className="flex-1 min-h-0 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#E0E0E0 transparent' }}>

          {/* Author + visibility */}
          <div className="flex items-center justify-between" style={{ padding: '16px 20px 8px' }}>
            <div className="flex items-center gap-2">
              <Avatar name={currentUser.fullName} role={currentUser.role} />
              <p className="font-bold text-gray-800 text-sm">{currentUser.fullName}</p>
            </div>
            <button onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
              className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors"
              style={{ background: visibility === 'public' ? '#E8F5EE' : '#F5F3FF', color: visibility === 'public' ? '#1D9E75' : '#7B68C8' }}>
              {visibility === 'public'
                ? <><Globe size={12} strokeWidth={1.8} color="#1D9E75" /> Công khai</>
                : <><Lock size={12} strokeWidth={1.8} color="#7B68C8" /> Riêng tư</>}
            </button>
          </div>

          {/* Preview area — single seamless block, no inner border */}
          <div style={{ margin: '0 16px 16px', position: 'relative', borderRadius: 12, overflow: 'hidden', minHeight: 140, ...previewBg }}>
            {/* Decoration preview */}
            {selectedDecoration < 12 && (() => {
              const Comp = DECORATION_COMPONENTS[selectedDecoration - 1]
              return Comp ? (
                <div className="absolute bottom-2 right-2 w-14 h-14 pointer-events-none" style={{ opacity: 0.85 }}>
                  <Comp color={grad ? 'white' : 'rgba(0,0,0,0.2)'} />
                </div>
              ) : null
            })()}
            {/* Textarea — no border at all, transparent bg */}
            <textarea
              value={content} onChange={e => setContent(e.target.value)} autoFocus
              placeholder="Chia sẻ điều gì đó vui vẻ..."
              className="w-full resize-none bg-transparent outline-none relative z-10 transition-all"
              style={{
                padding: 20,
                border: 'none',
                display: 'block',
                minHeight: 140,
                color: theme.textColor,
                textShadow: grad ? '0 1px 3px rgba(0,0,0,0.15)' : undefined,
                fontSize: grad && isShort && content.length > 0 ? '20px' : '15px',
                textAlign: grad && isShort && content.length > 0 ? 'center' : 'left',
                lineHeight: 1.5,
                ...fontCss,
              }}
              rows={4}
            />
            {/* Attached image (inside same gradient block) */}
            {imageUrl && (
              <div style={{ padding: '0 16px 16px', position: 'relative' }}>
                <Image src={imageUrl} alt="" width={600} height={140} className="w-full object-cover" style={{ borderRadius: 10 }} />
                <button onClick={() => setImageUrl('')}
                  className="absolute bg-black/50 text-white flex items-center justify-center"
                  style={{ top: 6, right: 22, width: 24, height: 24, borderRadius: '50%' }}>
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>

          {/* Theme picker — 28px circles, gap 6px */}
          <div style={{ padding: '0 20px 12px' }}>
            <p className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1"><Palette size={12} strokeWidth={2} />Màu nền</p>
            <div className="overflow-x-auto scrollbar-hide" style={{ padding: '4px 2px' }}>
              <div className="flex" style={{ gap: 6, width: 'max-content' }}>
                {THEMES.map(t => {
                  const active = selectedTheme === t.id
                  return (
                    <button key={t.id} onClick={() => setSelectedTheme(t.id)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: t.gradient || t.bg,
                        border: t.id === 10 ? '1.5px solid #E8E0D8' : 'none',
                        boxShadow: active ? '0 0 0 2px #fff, 0 0 0 3.5px #1D9E75' : '0 1px 3px rgba(0,0,0,0.18)',
                        transform: active ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        cursor: 'pointer',
                      }}
                      title={t.name}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          {/* Font picker — smaller buttons */}
          <div style={{ padding: '0 20px 12px' }}>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Kiểu chữ</p>
            <div className="flex gap-1">
              {Object.entries(FONT_STYLES).map(([key, f]) => (
                <button key={key} onClick={() => setSelectedFont(key)}
                  className={`flex-1 rounded-lg transition-colors ${selectedFont === key ? 'bg-primary-50 text-primary-600' : 'bg-gray-50 text-gray-500'}`}
                  style={{ fontFamily: f.fontFamily, fontWeight: f.fontWeight, letterSpacing: f.letterSpacing, fontSize: 13, padding: '4px 0' }}
                  title={FONT_LABELS[key]}>
                  Aa
                </button>
              ))}
            </div>
          </div>

          {/* Decoration picker — 6-col grid, 40px cells, 26px icons */}
          <div style={{ padding: '0 20px 12px' }}>
            <p className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1"><Sparkles size={12} strokeWidth={2} />Trang trí</p>
            <div className="grid grid-cols-6 gap-1.5">
              {DECORATION_COMPONENTS.map((Comp, i) => {
                const id = i + 1
                const active = selectedDecoration === id
                return (
                  <button key={id} onClick={() => setSelectedDecoration(id)}
                    className="flex items-center justify-center transition-all duration-150 active:scale-95"
                    style={{
                      height: 40, borderRadius: 10,
                      background: grad ? theme.gradient : (theme.bg || '#FFFBF0'),
                      border: active ? '2.5px solid #1D9E75' : '2px solid rgba(0,0,0,0.07)',
                      boxShadow: active ? '0 0 0 1px rgba(29,158,117,0.25)' : undefined,
                    }}>
                    <div style={{ width: 26, height: 26 }}>
                      <Comp color={grad ? 'white' : 'rgba(0,0,0,0.5)'} />
                    </div>
                  </button>
                )
              })}
              <button onClick={() => setSelectedDecoration(12)}
                className="flex items-center justify-center transition-all duration-150 active:scale-95"
                style={{
                  height: 40, borderRadius: 10, background: '#F5F5F5',
                  border: selectedDecoration === 12 ? '2.5px solid #1D9E75' : '2px solid rgba(0,0,0,0.07)',
                }}>
                <X size={16} strokeWidth={2} color="rgba(0,0,0,0.3)" />
              </button>
            </div>
          </div>

        </div>{/* end scrollable body */}

        {/* ── Sticky bottom — always visible ─────────────────── */}
        <div className="shrink-0"
          style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '10px 16px 16px', background: '#fff' }}>

          {/* Tag picker — expands above action buttons when open */}
          {showTag && (
            <div className="bg-gray-50 rounded-2xl space-y-1 max-h-28 overflow-y-auto mb-2.5 p-3">
              {allUsers.filter(u => u.id !== currentUser.userId).map(u => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={tagged.includes(u.id)}
                    onChange={e => setTagged(p => e.target.checked ? [...p, u.id] : p.filter(id => id !== u.id))}
                    className="rounded" />
                  <span className="text-sm font-medium text-gray-700">{u.full_name}</span>
                  <span className="text-xs text-gray-400">{u.role === 'owner' ? '🏠' : '👤'}</span>
                </label>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex gap-2 mb-2.5">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors active:scale-95">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} strokeWidth={1.8} />}
              {uploading ? 'Đang tải...' : 'Ảnh'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImageFile(f); e.target.value = '' }} />
            <button onClick={() => setShowTag(!showTag)}
              className="flex items-center gap-1.5 py-2 px-4 text-xs font-bold rounded-xl transition-colors active:scale-95"
              style={{
                background: showTag ? '#E8F5EE' : '#F3F3F3',
                color: showTag ? '#1D9E75' : '#6B6B6B',
              }}>
              <Users size={13} strokeWidth={2} /> Tag {tagged.length > 0 ? `(${tagged.length})` : ''}
            </button>
          </div>

          {/* Submit */}
          <button onClick={submit} disabled={!content.trim() || submitting}
            className="btn-primary w-full py-3 text-sm" style={{ borderRadius: 12 }}>
            {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-1.5"><SendHorizonal size={14} strokeWidth={2} />Đăng bài</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Maintenance Card ─────────────────────────────────────────
function MaintenanceCard({ req, isOwner, currentUserId, allUsers, onStatusChange, onDelete }: {
  req: Maintenance; isOwner: boolean; currentUserId: string; allUsers: SimpleUser[]
  onStatusChange: (id: string, s: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [replies,    setReplies]    = useState<MaintReply[]>([])
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const me = allUsers.find(u => u.id === currentUserId)
  const isReporter = req.reporter_id === currentUserId

  useEffect(() => {
    if (expanded && !loadedOnce) {
      fetch(`/api/maintenance/${req.id}/replies`).then(r => r.json()).then(d => { if (Array.isArray(d)) setReplies(d); setLoadedOnce(true) })
    }
  }, [expanded, loadedOnce, req.id])

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      {/* Main card */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={req.status} size="sm" />
              <span className="text-[11px] text-gray-400">{timeAgo(req.created_at)}</span>
            </div>
            <p className="text-sm font-semibold text-gray-700 leading-snug">{req.description}</p>
            <p className="text-xs text-gray-400 mt-1">Báo bởi: {req.reporter.full_name}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {req.image_url && <a href={req.image_url} target="_blank" rel="noopener noreferrer"><Image src={req.image_url} alt="" width={56} height={56} className="w-14 h-14 object-cover rounded-xl" /></a>}
            {(isReporter || isOwner) && (
              confirmDel
                ? <div className="flex gap-1">
                    <button onClick={() => { setConfirmDel(false); onDelete(req.id) }} className="text-[11px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-full active:scale-95">Xóa</button>
                    <button onClick={() => setConfirmDel(false)} className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full active:scale-95">Thôi</button>
                  </div>
                : <button onClick={() => setConfirmDel(true)} className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.3)' }}>
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
            )}
          </div>
        </div>

        {/* Owner status buttons */}
        {isOwner && req.status !== 'done' && (
          <div className="flex gap-2 mt-3 pt-2 border-t border-gray-50">
            {req.status === 'new' && (
              <button onClick={() => onStatusChange(req.id, 'in_progress')} className="flex-1 py-1.5 text-xs font-bold rounded-xl active:scale-95 transition-all" style={{ background: '#DBEAFE', color: '#2563EB' }}>Đang xử lý</button>
            )}
            <button onClick={() => onStatusChange(req.id, 'done')} className="flex-1 py-1.5 text-xs font-bold rounded-xl active:scale-95 transition-all" style={{ background: '#D1FAE5', color: '#059669' }}>Hoàn thành</button>
          </div>
        )}

        {/* Reply toggle */}
        <button onClick={() => setExpanded(e => !e)}
          className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors">
          <CornerDownRight size={11} strokeWidth={2} />
          {expanded ? 'Thu gọn' : `Bình luận${replies.length > 0 ? ` (${replies.length})` : ''}`}
        </button>
      </div>

      {/* Replies */}
      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/50 px-3.5 pt-2.5 pb-3 space-y-2.5">
          {!loadedOnce ? (
            <div className="skeleton h-8 w-full rounded-xl" />
          ) : replies.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">Chưa có bình luận</p>
          ) : (
            replies.map(r => (
              <div key={r.id} className="flex items-start gap-2">
                <Avatar name={r.author.full_name} role={r.author.role} size="sm" />
                <div className="flex-1 bg-white rounded-xl px-2.5 py-2 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-bold text-gray-700">{r.author.full_name}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{renderMentions(r.content)}</p>
                </div>
              </div>
            ))
          )}
          <CommentInput
            currentUser={{ fullName: me?.full_name ?? 'Bạn', role: me?.role ?? 'tenant' }}
            users={allUsers.map(u => ({ id: u.id, full_name: u.full_name, role: u.role }))}
            placeholder="Bình luận sự cố..."
            accentColor="#1D9E75"
            onSubmit={async (content, imageUrl) => {
              const res = await fetch(`/api/maintenance/${req.id}/replies`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, imageUrl }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error || 'Không gửi được')
              setReplies(p => [...p, data])
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Market Card ─────────────────────────────────────────────
function MarketCard({ post, isOwner, currentUserId, allUsers, onDelete }: {
  post: MarketPost; isOwner: boolean; currentUserId: string; allUsers: SimpleUser[]
  onDelete: (id: string) => void
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [replies,    setReplies]    = useState<MarketReply[]>([])
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const me = allUsers.find(u => u.id === currentUserId)
  const t = MARKET_TYPES[post.type as keyof typeof MARKET_TYPES] || MARKET_TYPES.give
  const isAuthor = post.author_id === currentUserId

  useEffect(() => {
    if (expanded && !loadedOnce) {
      fetch(`/api/marketplace/${post.id}/replies`).then(r => r.json()).then(d => { if (Array.isArray(d)) setReplies(d); setLoadedOnce(true) })
    }
  }, [expanded, loadedOnce, post.id])

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {post.image_url
            ? <Image src={post.image_url} alt="" width={64} height={64} className="w-16 h-16 object-cover rounded-xl shrink-0" />
            : <div className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center" style={{ background: '#F5F5F5' }}><ShoppingBag size={22} strokeWidth={1.5} color="#9CA3AF" /></div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mb-1" style={{ background: `${t.color}20`, color: t.color }}>{t.label}</span>
                <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">{post.title}</p>
                {post.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{post.description}</p>}
                <p className="text-[11px] text-gray-400 mt-1">{post.author.full_name} · {timeAgo(post.created_at)}</p>
              </div>
              {(isAuthor || isOwner) && (
                confirmDel
                  ? <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setConfirmDel(false); onDelete(post.id) }} className="text-[11px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-full active:scale-95">Xóa</button>
                      <button onClick={() => setConfirmDel(false)} className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full active:scale-95">Thôi</button>
                    </div>
                  : <button onClick={() => setConfirmDel(true)} className="flex items-center justify-center shrink-0" style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.3)' }}>
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors">
          <CornerDownRight size={11} strokeWidth={2} />
          {expanded ? 'Thu gọn' : `Hỏi / Bình luận${replies.length > 0 ? ` (${replies.length})` : ''}`}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/50 px-3.5 pt-2.5 pb-3 space-y-2.5">
          {!loadedOnce ? (
            <div className="skeleton h-8 w-full rounded-xl" />
          ) : replies.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">Chưa có bình luận</p>
          ) : (
            replies.map(r => (
              <div key={r.id} className="flex items-start gap-2">
                <Avatar name={r.author.full_name} role={r.author.role} size="sm" />
                <div className="flex-1 bg-white rounded-xl px-2.5 py-2 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-bold text-gray-700">{r.author.full_name}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{renderMentions(r.content)}</p>
                </div>
              </div>
            ))
          )}
          <CommentInput
            currentUser={{ fullName: me?.full_name ?? 'Bạn', role: me?.role ?? 'tenant' }}
            users={allUsers.map(u => ({ id: u.id, full_name: u.full_name, role: u.role }))}
            placeholder="Hỏi hoặc bình luận..."
            accentColor="#5B6AD0"
            onSubmit={async (content, imageUrl) => {
              const res = await fetch(`/api/marketplace/${post.id}/replies`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, imageUrl }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error || 'Không gửi được')
              setReplies(p => [...p, data])
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Manage Team Modal ───────────────────────────────────────
function ManageTeamModal({ team, allUsers, onClose, onUpdate }: {
  team: HeroTeam; allUsers: SimpleUser[]
  onClose: () => void
  onUpdate: (teamId: string, members: HeroTeamMember[]) => void
}) {
  const cfg = TEAM_CONFIG[team.team_type]

  // Init draft from current team state
  const initLeader  = team.members.find(m => m.role === 'leader')
  const initMembers = team.members.filter(m => m.role === 'member')
  const toTagUser   = (m: HeroTeamMember): TagUser => ({ id: m.user_id, full_name: m.user.full_name })

  const [draftLeader,  setDraftLeader]  = useState<TagUser[]>(initLeader  ? [toTagUser(initLeader)]  : [])
  const [draftMembers, setDraftMembers] = useState<TagUser[]>(initMembers.map(toTagUser))
  const [saving,       setSaving]       = useState(false)

  // Users available for leader: all except already-selected non-leaders (can overlap)
  const usersForLeader  = allUsers.map(u => ({ id: u.id, full_name: u.full_name, role: u.role }))
  const leaderIds       = new Set(draftLeader.map(u => u.id))
  const usersForMembers = allUsers
    .map(u => ({ id: u.id, full_name: u.full_name, role: u.role }))
    .filter(u => !leaderIds.has(u.id)) // leader auto-included, don't double-pick

  async function handleSave() {
    setSaving(true)
    try {
      const currentIds = new Map(team.members.map(m => [m.user_id, m.role]))
      const newLeaderId = draftLeader[0]?.id ?? null

      // Build final desired set: leader + members (leader auto-included)
      const finalMembers = new Map<string, 'leader' | 'member'>()
      if (newLeaderId) finalMembers.set(newLeaderId, 'leader')
      draftMembers.forEach(u => { if (!finalMembers.has(u.id)) finalMembers.set(u.id, 'member') })

      // Remove users no longer in team
      for (const [userId] of currentIds) {
        if (!finalMembers.has(userId)) {
          await fetch(`/api/hero-teams/${team.id}/members/${userId}`, { method: 'DELETE' })
        }
      }

      // Upsert leader (API handles demoting old leader)
      if (newLeaderId) {
        await fetch(`/api/hero-teams/${team.id}/members`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: newLeaderId, role: 'leader' }),
        })
      } else if (initLeader && finalMembers.has(initLeader.user_id)) {
        // Demote old leader to member if still in team
        await fetch(`/api/hero-teams/${team.id}/members/${initLeader.user_id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'member' }),
        })
      }

      // Add new non-leader members
      for (const [userId, role] of finalMembers) {
        if (role === 'leader') continue
        if (!currentIds.has(userId)) {
          await fetch(`/api/hero-teams/${team.id}/members`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role: 'member' }),
          })
        }
      }

      // Refetch and update
      const res  = await fetch('/api/hero-teams')
      const data = await res.json()
      if (Array.isArray(data)) {
        const updated = data.find((t: HeroTeam) => t.id === team.id)
        if (updated) onUpdate(team.id, updated.members)
      }
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-t-3xl rounded-b-none sm:rounded-3xl animate-slide-up flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 16px)', boxShadow: 'var(--shadow-float)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-50 shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}22` }}>
            <cfg.Icon size={18} strokeWidth={1.8} color={cfg.color} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-gray-800">Quản lý {cfg.name}</h3>
            <p className="text-xs text-gray-400">{cfg.desc}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
          {/* Leader */}
          <div>
            <p className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1.5">
              <Crown size={13} strokeWidth={2} color="#D4900A" />Đội trưởng
            </p>
            <TagInput
              users={usersForLeader}
              selected={draftLeader}
              onChange={setDraftLeader}
              placeholder="Chọn đội trưởng..."
              singleSelect
            />
          </div>

          {/* Members */}
          <div>
            <p className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1.5">
              <Users size={13} strokeWidth={2} />Thành viên
              <span className="text-gray-400 font-normal">(đội trưởng tự động được thêm)</span>
            </p>
            <TagInput
              users={usersForMembers}
              selected={draftMembers}
              onChange={setDraftMembers}
              placeholder="Thêm thành viên..."
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-50 flex gap-3 shrink-0">
          <button onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">Hủy</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3 text-sm">
            {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Inline Biometric Setup Button ───────────────────────────
function BiometricSetupButton({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  async function setup() {
    setLoading(true)
    try {
      const phone = localStorage.getItem('aloha_last_phone')
      if (!phone) { onDone(); return }
      const { startRegistration } = await import('@simplewebauthn/browser')
      const optRes = await fetch('/api/webauthn/register-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
      if (!optRes.ok) { onDone(); return }
      const regRes = await startRegistration(await optRes.json())
      await fetch('/api/webauthn/register-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, registration: regRes }) })
    } catch { /* user cancelled or unsupported */ }
    finally { setLoading(false); onDone() }
  }
  return (
    <button onClick={setup} disabled={loading}
      className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors active:scale-95"
      style={{ background: '#E8F5EE', color: '#1D9E75' }}>
      {loading ? <Loader2 size={12} strokeWidth={2} className="animate-spin" /> : 'Bật ngay'}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function CommunityPage({
  currentUser, initialPosts, initialPinned, initialMaintenance,
  initialEvents, initialMarketplace, allUsers,
}: Props) {
  const isOwner = currentUser.role === 'owner'

  const [posts,        setPosts]        = useState<Post[]>(initialPosts)
  const [pinned,       setPinned]       = useState<Post[]>(initialPinned)
  const [maintenance,  setMaintenance]  = useState<Maintenance[]>(initialMaintenance)
  const [events,       setEvents]       = useState<Event[]>(initialEvents)
  const [marketplace,  setMarketplace]  = useState<MarketPost[]>(initialMarketplace)

  const [selectedPost,     setSelectedPost]     = useState<Post | null>(null)
  const [toast,            setToast]            = useState('')
  const [showCreatePost,   setShowCreatePost]   = useState(false)
  const [showCreateMaint,  setShowCreateMaint]  = useState(false)
  const [showCreateMarket, setShowCreateMarket] = useState(false)
  const [showCreateEvent,  setShowCreateEvent]  = useState(false)
  const [showAllMaint,     setShowAllMaint]     = useState(false)
  const [showArchived,     setShowArchived]     = useState(false)
  const [showDoneMaint,    setShowDoneMaint]    = useState(false)
  const [showBioBanner,    setShowBioBanner]    = useState(false)
  const [heroTeams,        setHeroTeams]        = useState<HeroTeam[]>([])
  const [heroTeamsReady,   setHeroTeamsReady]   = useState(false)
  const [managingTeam,     setManagingTeam]     = useState<HeroTeam | null>(null)

  // Check if biometric setup was deferred from login
  useEffect(() => {
    const status = localStorage.getItem('aloha_biometric_registered')
    if (status === 'pending' && !!(window.PublicKeyCredential)) setShowBioBanner(true)
  }, [])

  useEffect(() => {
    fetch('/api/hero-teams')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setHeroTeams(d) })
      .catch(() => {})
      .finally(() => setHeroTeamsReady(true))
  }, [])

  useEffect(() => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const ch = supabase.channel('community-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, async () => {
        const data = await (await fetch('/api/community/posts')).json()
        if (Array.isArray(data)) { setPosts(data.filter((p: Post) => !p.is_pinned)); setPinned(data.filter((p: Post) => p.is_pinned)) }
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function handleReact(postId: string, reaction: string) {
    const update = (list: Post[]) => list.map(p => {
      if (p.id !== postId) return p
      const prev = p.reactions ?? []
      const existing = prev.find(r => r.user_id === currentUser.userId && r.reaction_type === reaction)
      return { ...p, reactions: existing ? prev.filter(r => !(r.user_id === currentUser.userId && r.reaction_type === reaction)) : [...prev, { reaction_type: reaction, user_id: currentUser.userId }] }
    })
    setPosts(update)
    if (selectedPost?.id === postId) setSelectedPost(prev => prev ? update([prev])[0] : null)
    await fetch(`/api/community/posts/${postId}/react`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reaction }) })
  }

  async function handlePin(postId: string, newPinned: boolean) {
    const res = await fetch(`/api/community/posts/${postId}/pin`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: newPinned }),
    })
    if (!res.ok) {
      const err = await res.json()
      const msg = err.error || 'Lỗi'
      setToast(msg)
      setTimeout(() => setToast(''), 3000)
      return
    }
    // Fetch feed and pinned independently (feed API only returns is_pinned=false)
    const [feedData, pinnedData] = await Promise.all([
      fetch('/api/community/posts').then(r => r.json()),
      fetch('/api/community/posts?pinned=true').then(r => r.json()),
    ])
    if (Array.isArray(feedData))   setPosts(feedData)
    if (Array.isArray(pinnedData)) setPinned(pinnedData)
  }

  async function handleStatusChange(postId: string, status: Post['status']) {
    const res = await fetch(`/api/community/posts/${postId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (res.ok) {
      const updated = await res.json()
      const up = (list: Post[]) => list.map(p => p.id === postId ? { ...p, ...updated } : p)
      setPosts(up)
      if (selectedPost?.id === postId) setSelectedPost(prev => prev ? { ...prev, ...updated } : null)
    }
  }

  async function handleDelete(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    if (selectedPost?.id === postId) setSelectedPost(null)
    await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' })
  }

  async function handleMaintenanceStatus(id: string, status: string) {
    await fetch(`/api/maintenance/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const resolvedAt = status === 'done' ? new Date().toISOString() : null
    setMaintenance(prev => prev.map(m => m.id === id ? { ...m, status: status as Maintenance['status'], resolved_at: resolvedAt } : m))
  }

  async function handleMaintenanceDelete(id: string) {
    setMaintenance(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/maintenance/${id}`, { method: 'DELETE' })
  }

  async function handleMarketDelete(id: string) {
    setMarketplace(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/marketplace/${id}`, { method: 'DELETE' })
  }

  async function handleEventRespond(eventId: string, response: 'yes' | 'no') {
    await fetch(`/api/events/${eventId}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response }) })
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e
      const filtered = e.responses.filter(r => r.user_id !== currentUser.userId)
      return { ...e, responses: [...filtered, { user_id: currentUser.userId, response, user: { full_name: currentUser.fullName } }] }
    }))
  }

  async function handleEventDelete(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
  }

  const visiblePosts = posts.filter(p => {
    if (p.status !== 'done' || !p.done_at) return true
    const age = Date.now() - new Date(p.done_at).getTime()
    if (age <= TWO_DAYS_MS) return true
    return isOwner && showArchived
  })
  const archivedCount = isOwner ? posts.filter(p => p.status === 'done' && p.done_at && (Date.now() - new Date(p.done_at).getTime()) > TWO_DAYS_MS).length : 0
  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  const visibleMaint  = maintenance.filter(m => {
    if (m.status === 'done' && m.resolved_at) {
      const age = Date.now() - new Date(m.resolved_at).getTime()
      if (age > ONE_DAY_MS && !showDoneMaint) return false
    }
    return true
  })
  const doneMaintCount = maintenance.filter(m => m.status === 'done' && m.resolved_at && Date.now() - new Date(m.resolved_at).getTime() > ONE_DAY_MS).length
  const maintToShow   = showAllMaint ? visibleMaint : visibleMaint.slice(0, 3)
  const newMaintCount = maintenance.filter(m => m.status === 'new').length

  return (
    <div className="min-h-screen pb-6" style={{ background: 'linear-gradient(160deg,#FFF8F0 0%,#EEF7FF 100%)' }}>
      <header className="px-4 pb-4" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Home size={20} strokeWidth={1.5} color="#1D9E75" />Cộng đồng
          </h1>
          <p className="text-sm text-gray-400 font-medium">Aloha Tran Home</p>
        </div>
      </header>

      {/* Inline biometric setup banner — non-blocking, dismissable */}
      {showBioBanner && (
        <div className="max-w-lg mx-auto px-4 pt-2">
          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-card px-4 py-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: '#E8F5EE' }}>
              <CheckCircle2 size={16} strokeWidth={2} color="#1D9E75" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">Bật đăng nhập vân tay?</p>
              <p className="text-xs text-gray-400">Đăng nhập nhanh hơn lần sau</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <BiometricSetupButton onDone={() => { setShowBioBanner(false); localStorage.setItem('aloha_biometric_registered', 'true') }} />
              <button onClick={() => { setShowBioBanner(false); localStorage.setItem('aloha_biometric_registered', 'declined') }}
                className="text-xs text-gray-400 font-semibold px-2 py-1 rounded-xl hover:bg-gray-100 transition-colors">
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 space-y-5">
        <WeatherCountdown />

        {/* Pinned */}
        {(pinned.length > 0 || isOwner) && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-black text-gray-700 flex items-center gap-1.5">
                <Pin size={14} strokeWidth={1.5} color="#F59E0B" />Thông báo ghim
              </h2>
              {isOwner && <span className="text-[11px] text-gray-400">Nhấn pin trên bài để ghim</span>}
            </div>
            {pinned.length === 0 ? (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-center">
                <Pin size={28} strokeWidth={1.5} color="#F59E0B" className="mx-auto mb-1" />
                <p className="text-xs text-amber-600 font-semibold">Chưa có thông báo ghim</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pinned.map((p, idx) => (
                  <CollapsedPostCard
                    key={p.id} post={p} index={idx}
                    currentUserId={currentUser.userId}
                    isOwner={isOwner}
                    onReact={handleReact}
                    onPin={handlePin}
                    onOpen={setSelectedPost}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Whiteboard Feed */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <ClipboardList size={16} strokeWidth={2} color="#374151" />
              <h2 className="text-sm font-black text-gray-700">Bảng chung</h2>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && archivedCount > 0 && (
                <button onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-xl transition-colors"
                  style={{ background: showArchived ? '#E8F5EE' : '#F5F5F5', color: showArchived ? '#1D9E75' : '#6B6B6B' }}>
                  <Archive size={11} strokeWidth={2} />{showArchived ? 'Ẩn cũ' : `Xem cũ (${archivedCount})`}
                </button>
              )}
              <span className="text-[11px] text-gray-400">{visiblePosts.length} bài</span>
            </div>
          </div>

          <button onClick={() => setShowCreatePost(true)}
            className="w-full bg-white rounded-2xl shadow-card p-3.5 flex items-center gap-3 mb-3 active:scale-98 transition-all">
            <Avatar name={currentUser.fullName} role={currentUser.role} />
            <div className="flex-1 flex items-center gap-1.5 text-sm text-gray-400 font-medium text-left">
              <PenLine size={14} strokeWidth={1.8} /> Bạn muốn chia sẻ gì?
            </div>
          </button>

          {visiblePosts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card p-8 text-center"><p className="text-4xl mb-3">👋</p><p className="font-bold text-gray-600">Chưa có bài đăng nào</p><p className="text-sm text-gray-400 mt-1">Hãy là người đầu tiên chia sẻ!</p></div>
          ) : (
            <div className="space-y-2.5">
              {visiblePosts.map((p, idx) => (
                <CollapsedPostCard key={p.id} post={p} index={idx} currentUserId={currentUser.userId} isOwner={isOwner} onReact={handleReact} onPin={handlePin} onOpen={setSelectedPost} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>

        {/* Maintenance */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-700 flex items-center gap-1.5">
              <Wrench size={14} strokeWidth={1.8} color="#6B7280" />Cần xử lý
              {newMaintCount > 0 && <span className="ml-0.5 text-[11px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-black">{newMaintCount}</span>}
            </h2>
            <div className="flex items-center gap-2">
              {isOwner && doneMaintCount > 0 && (
                <button onClick={() => setShowDoneMaint(v => !v)} className="text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors"
                  style={{ background: showDoneMaint ? '#E8F5EE' : '#F5F5F5', color: showDoneMaint ? '#1D9E75' : '#6B6B6B' }}>
                  {showDoneMaint ? 'Ẩn đã xử lý' : `Xem đã xử lý (${doneMaintCount})`}
                </button>
              )}
              <button onClick={() => setShowCreateMaint(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: '#E8F5EE', color: '#1D9E75' }}>+ Báo sự cố</button>
            </div>
          </div>
          {visibleMaint.length === 0 ? <div className="bg-white rounded-2xl shadow-card p-6 text-center"><Home size={32} strokeWidth={1.5} color="#1D9E75" className="mx-auto mb-2" /><p className="text-sm text-gray-400">Không có sự cố nào — mọi thứ ổn! ✨</p></div> : (
            <div className="space-y-2">
              {maintToShow.map(m => <MaintenanceCard key={m.id} req={m} isOwner={isOwner} currentUserId={currentUser.userId} allUsers={allUsers} onStatusChange={handleMaintenanceStatus} onDelete={handleMaintenanceDelete} />)}
              {visibleMaint.length > 3 && <button onClick={() => setShowAllMaint(!showAllMaint)} className="w-full py-2.5 text-xs font-bold rounded-xl" style={{ background: '#F5F5F5', color: '#6B6B6B' }}>{showAllMaint ? '▲ Thu gọn' : `▼ Xem tất cả ${visibleMaint.length} sự cố`}</button>}
            </div>
          )}
        </section>

        {/* Marketplace */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-700 flex items-center gap-1.5">
              <ShoppingBag size={14} strokeWidth={1.8} color="#5B6AD0" />Cộng đồng chia sẻ
            </h2>
            <button onClick={() => setShowCreateMarket(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: '#EEF0FF', color: '#5B6AD0' }}>+ Đăng</button>
          </div>
          {marketplace.length === 0 ? <div className="bg-white rounded-2xl shadow-card p-5 text-center"><p className="text-3xl mb-2">🛒</p><p className="text-sm text-gray-400">Chưa có bài đăng nào</p></div> : (
            <div className="space-y-2">
              {marketplace.map(m => (
                <MarketCard key={m.id} post={m} isOwner={isOwner} currentUserId={currentUser.userId} allUsers={allUsers} onDelete={handleMarketDelete} />
              ))}
            </div>
          )}
        </section>

        {/* Events */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-700 flex items-center gap-1.5">
              <CalendarDays size={14} strokeWidth={1.5} color="#D4456B" />Sự kiện
            </h2>
            {isOwner && <button onClick={() => setShowCreateEvent(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: '#FFE8F0', color: '#D4456B' }}>+ Tạo</button>}
          </div>
          {events.length === 0 ? <div className="bg-white rounded-2xl shadow-card p-6 text-center"><CalendarDays size={32} strokeWidth={1.5} color="#D4456B" className="mx-auto mb-2" /><p className="text-sm text-gray-400">Chưa có sự kiện nào</p></div> : (
            <div className="space-y-3">
              {events.map(ev => (
                <EventCard key={ev.id} ev={ev} currentUser={currentUser} isOwner={isOwner} allUsers={allUsers} onRespond={handleEventRespond} onDelete={handleEventDelete} />
              ))}
            </div>
          )}
        </section>

        {/* Hero Team */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
              <Shield size={14} strokeWidth={1.8} color="#1D9E75" />Hero Team
            </h2>
            <p className="text-[11px] text-gray-400">Những người hùng của nhà trọ</p>
          </div>
          <div className="flex gap-2.5">
            {(['fire', 'repair', 'cleaning'] as const).map(type => {
              const cfg     = TEAM_CONFIG[type]
              const team    = heroTeams.find(t => t.team_type === type)
              const leader  = team?.members.find(m => m.role === 'leader')
              const members = team?.members.filter(m => m.role === 'member') ?? []
              const isEmpty = !leader && members.length === 0
              return (
                <div key={type} className="flex-1 min-w-0 rounded-xl bg-white flex flex-col"
                  style={{ border: '1px solid #F0F0F0', borderTop: `3px solid ${cfg.color}` }}>
                  <div className="p-3 flex flex-col gap-2 flex-1">

                    {/* Header: icon + name */}
                    <div className="flex items-center gap-1.5">
                      <cfg.Icon size={13} strokeWidth={1.8} color={cfg.color} />
                      <p className="text-[12px] font-bold leading-tight truncate" style={{ color: cfg.color }}>{cfg.name}</p>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-2 flex-1 justify-center">
                      {isEmpty ? (
                        <p className="text-center font-bold text-base" style={{ color: '#D1D5DB' }}>—</p>
                      ) : (
                        <>
                          {/* Row 1: Leader */}
                          <div className="flex justify-center">
                            {leader ? (
                              <div className="relative" title={leader.user.full_name}>
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
                                  style={{ background: '#1D9E75', boxShadow: `0 0 0 2px white, 0 0 0 3.5px ${cfg.color}` }}>
                                  {leader.user.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{ background: '#F59E0B', boxShadow: '0 0 0 1.5px white' }}>
                                  <Crown size={7} strokeWidth={2.5} color="#fff" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                                <Crown size={12} strokeWidth={1.5} color="#D1D5DB" />
                              </div>
                            )}
                          </div>

                          {/* Row 2: Members overlapping */}
                          {members.length > 0 && (
                            <div className="flex justify-center">
                              <div className="flex">
                                {members.slice(0, 3).map((m, i) => (
                                  <div key={m.id} title={m.user.full_name}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                                    style={{ background: '#5B6AD0', marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i, boxShadow: '0 0 0 1.5px white' }}>
                                    {m.user.full_name.charAt(0).toUpperCase()}
                                  </div>
                                ))}
                                {members.length > 3 && (
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-gray-500 shrink-0 bg-gray-100"
                                    style={{ marginLeft: -6, boxShadow: '0 0 0 1.5px white' }}>
                                    +{members.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Owner: manage button or setup prompt */}
                    {isOwner && (
                      team ? (
                        <button onClick={() => setManagingTeam(team)}
                          className="flex items-center justify-center gap-1 w-full pt-1.5 border-t text-[11px] font-bold transition-colors hover:opacity-70 active:scale-95"
                          style={{ borderColor: '#F0F0F0', color: cfg.color }}>
                          <Settings2 size={9} strokeWidth={2} />Quản lý
                        </button>
                      ) : heroTeamsReady ? (
                        <p className="text-center text-[9px] pt-1.5 border-t font-semibold" style={{ borderColor: '#F0F0F0', color: '#F59E0B' }}>
                          Cần chạy SQL
                        </p>
                      ) : null
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Modals */}
      {showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)}
          onCreated={post => setPosts(prev => [{
            ...post,
            reactions:     post.reactions     ?? [],
            tags:          post.tags          ?? [],
            replies:       post.replies       ?? [],
            status:        post.status        ?? 'pending',
            done_at:       null,
            hidden_at:     null,
            theme_id:      post.theme_id      ?? 9,
            font_style:    post.font_style    ?? 'normal',
            decoration_id: post.decoration_id ?? 12,
          }, ...prev])}
          currentUser={currentUser} allUsers={allUsers} />
      )}
      {showCreateMaint && (
        <SimpleCreateModal title="🔧 Báo sự cố" placeholder="Mô tả sự cố (vòi bị rỉ, đèn hỏng...)"
          onClose={() => setShowCreateMaint(false)}
          onSubmit={async (desc, img) => { const res = await fetch('/api/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: desc, imageUrl: img }) }); const data = await res.json(); if (data.id) setMaintenance(prev => [data, ...prev]) }} />
      )}
      {showCreateMarket && <MarketCreateModal onClose={() => setShowCreateMarket(false)} onCreated={p => setMarketplace(prev => [p, ...prev])} />}
      {showCreateEvent && isOwner && <EventCreateModal onClose={() => setShowCreateEvent(false)} onCreated={ev => setEvents(prev => [ev, ...prev])} allUsers={allUsers} currentUserId={currentUser.userId} />}
      {selectedPost && <PostDetailModal post={selectedPost} currentUser={currentUser} isOwner={isOwner} allUsers={allUsers} onClose={() => setSelectedPost(null)} onReact={handleReact} onStatusChange={handleStatusChange} />}
      {managingTeam && (
        <ManageTeamModal
          team={managingTeam}
          allUsers={allUsers}
          onClose={() => setManagingTeam(null)}
          onUpdate={(teamId, members) => setHeroTeams(prev => prev.map(t => t.id === teamId ? { ...t, members } : t))}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-float">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Simple Create Modal ─────────────────────────────────────
function SimpleCreateModal({ title, placeholder, onClose, onSubmit }: {
  title: string; placeholder: string; onClose: () => void; onSubmit: (desc: string, img?: string) => Promise<void>
}) {
  const [desc, setDesc] = useState(''); const [imageUrl, setImageUrl] = useState(''); const [uploading, setUploading] = useState(false); const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  async function up(file: File) { setUploading(true); try { const form = new FormData(); form.append('file', file); const { url } = await (await fetch('/api/upload/community', { method: 'POST', body: form })).json(); if (url) setImageUrl(url) } finally { setUploading(false) } }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 animate-slide-up space-y-4" style={{ boxShadow: 'var(--shadow-float)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-black text-gray-800">{title}</h3><button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><X size={14} strokeWidth={2.5} /></button></div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder={placeholder} rows={3} className="input-field resize-none text-sm" autoFocus />
        {imageUrl ? <div className="relative"><Image src={imageUrl} alt="" width={600} height={128} className="w-full h-32 object-cover rounded-2xl" /><button onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-black/50 text-white w-6 h-6 rounded-full flex items-center justify-center"><X size={10} strokeWidth={3} /></button></div>
          : <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 cursor-pointer bg-gray-50 rounded-xl px-3 py-2.5"><ImagePlus size={14} strokeWidth={1.8} />{uploading ? 'Đang tải...' : 'Thêm ảnh (tùy chọn)'}<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) up(f); e.target.value = '' }} /></label>}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">Hủy</button>
          <button disabled={!desc.trim() || loading} className="btn-primary flex-1 py-3 text-sm" onClick={async () => { setLoading(true); try { await onSubmit(desc, imageUrl || undefined); onClose() } finally { setLoading(false) } }}>{loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Gửi'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Market Create Modal ─────────────────────────────────────
function MarketCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: MarketPost) => void }) {
  const [type, setType] = useState('give'); const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [imageUrl, setImageUrl] = useState(''); const [uploading, setUploading] = useState(false); const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  async function up(file: File) { setUploading(true); try { const form = new FormData(); form.append('file', file); const { url } = await (await fetch('/api/upload/community', { method: 'POST', body: form })).json(); if (url) setImageUrl(url) } finally { setUploading(false) } }
  async function submit() { if (!title.trim()) return; setLoading(true); try { const res = await fetch('/api/marketplace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, title, description: desc, imageUrl }) }); const data = await res.json(); if (data.id) { onCreated(data); onClose() } } finally { setLoading(false) } }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 animate-slide-up space-y-4" style={{ boxShadow: 'var(--shadow-float)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-black text-gray-800">🛒 Đăng bài</h3><button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><X size={14} strokeWidth={2.5} /></button></div>
        <div className="flex gap-2">{Object.entries(MARKET_TYPES).map(([k, v]) => (<button key={k} onClick={() => setType(k)} className="flex-1 py-2 text-[11px] font-bold rounded-xl transition-colors" style={{ background: type === k ? `${v.color}20` : '#F5F5F5', color: type === k ? v.color : '#6B6B6B' }}>{v.label}</button>))}</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề *" className="input-field text-sm" autoFocus />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả (tùy chọn)" rows={2} className="input-field resize-none text-sm" />
        {imageUrl ? <div className="relative"><Image src={imageUrl} alt="" width={600} height={112} className="w-full h-28 object-cover rounded-2xl" /><button onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-black/50 text-white w-6 h-6 rounded-full flex items-center justify-center"><X size={10} strokeWidth={3} /></button></div>
          : <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 cursor-pointer bg-gray-50 rounded-xl px-3 py-2.5"><ImagePlus size={14} strokeWidth={1.8} />{uploading ? 'Đang tải...' : 'Thêm ảnh (tùy chọn)'}<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) up(f); e.target.value = '' }} /></label>}
        <div className="flex gap-3"><button onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">Hủy</button><button disabled={!title.trim() || loading} onClick={submit} className="btn-primary flex-1 py-3 text-sm">{loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Đăng'}</button></div>
      </div>
    </div>
  )
}

// ─── Event Create Modal ───────────────────────────────────────
const RESPONSE_PRESETS = [
  { yes: 'Tham gia',  no: 'Không tham gia' },
  { yes: 'OK đã rõ', no: 'Chưa rõ' },
  { yes: 'Có mặt',   no: 'Vắng mặt' },
  { yes: 'Đồng ý',   no: 'Không đồng ý' },
]

function EventCreateModal({ onClose, onCreated, allUsers, currentUserId }: {
  onClose: () => void; onCreated: (e: Event) => void
  allUsers: SimpleUser[]; currentUserId: string
}) {
  const [title,       setTitle]       = useState('')
  const [desc,        setDesc]        = useState('')
  const [date,        setDate]        = useState<Date | undefined>()
  const [presetIdx,   setPresetIdx]   = useState(0)
  const [customYes,   setCustomYes]   = useState('')
  const [customNo,    setCustomNo]    = useState('')
  const [tagAll,      setTagAll]      = useState(false)
  const [taggedUsers, setTaggedUsers] = useState<string[]>([])
  const [loading,     setLoading]     = useState(false)
  const [err,         setErr]         = useState('')

  const isCustom = presetIdx === 4
  const yesLabel = isCustom ? customYes : RESPONSE_PRESETS[presetIdx].yes
  const noLabel  = isCustom ? customNo  : RESPONSE_PRESETS[presetIdx].no

  function toggleTag(uid: string) {
    setTaggedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
  }

  async function submit() {
    if (!title.trim() || !date) return
    setLoading(true); setErr('')
    const eventDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    const tagIds = tagAll ? allUsers.map(u => u.id) : taggedUsers
    try {
      const res = await fetch('/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc, eventDate, responseOptionYes: yesLabel, responseOptionNo: noLabel, taggedUserIds: tagIds }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Lỗi tạo sự kiện'); return }
      if (data.id) { onCreated(data); onClose() }
    } catch { setErr('Lỗi kết nối') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 60 }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-t-3xl rounded-b-none sm:rounded-3xl animate-slide-up flex flex-col"
        style={{ boxShadow: 'var(--shadow-float)', maxHeight: 'calc(100dvh - 16px)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h3 className="font-black text-gray-800 flex items-center gap-2">
            <CalendarDays size={18} strokeWidth={1.5} color="#D4456B" />Tạo sự kiện
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><X size={14} strokeWidth={2.5} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-2 space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên sự kiện *" className="input-field text-sm" autoFocus />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả (tùy chọn)" rows={2} className="input-field resize-none text-sm" />

          {/* Date picker */}
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">Ngày diễn ra *</label>
            <DatePicker value={date} onChange={setDate} placeholder="Chọn ngày" minDate={new Date()} />
          </div>

          {/* Response options */}
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">Tùy chọn phản hồi</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {RESPONSE_PRESETS.map((p, i) => (
                <button key={i} onClick={() => setPresetIdx(i)}
                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-full transition-colors"
                  style={{ background: presetIdx === i ? '#FFE8F0' : '#F5F5F5', color: presetIdx === i ? '#D4456B' : '#6B6B6B' }}>
                  {p.yes} / {p.no}
                </button>
              ))}
              <button onClick={() => setPresetIdx(4)}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-full transition-colors"
                style={{ background: presetIdx === 4 ? '#FFE8F0' : '#F5F5F5', color: presetIdx === 4 ? '#D4456B' : '#6B6B6B' }}>
                Tùy chỉnh
              </button>
            </div>
            {isCustom && (
              <div className="flex gap-2">
                <input value={customYes} onChange={e => setCustomYes(e.target.value)} placeholder="Nút xác nhận" className="input-field text-sm flex-1" />
                <input value={customNo}  onChange={e => setCustomNo(e.target.value)}  placeholder="Nút từ chối"   className="input-field text-sm flex-1" />
              </div>
            )}
          </div>

          {/* Tag users */}
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2 flex items-center gap-1.5">
              <Tag size={13} strokeWidth={2} />Tag người tham gia
            </label>
            <button onClick={() => { setTagAll(v => !v); setTaggedUsers([]) }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold mb-2 transition-colors"
              style={{ background: tagAll ? '#E8F5EE' : '#F5F5F5', color: tagAll ? '#1D9E75' : '#6B6B6B' }}>
              <Users size={14} strokeWidth={2} />
              {tagAll ? 'Đã tag tất cả' : 'Tag tất cả'}
            </button>
            {!tagAll && (
              <div className="flex flex-wrap gap-2">
                {allUsers.filter(u => u.id !== currentUserId).map(u => (
                  <button key={u.id} onClick={() => toggleTag(u.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    style={{ background: taggedUsers.includes(u.id) ? '#E8F5EE' : '#F5F5F5', color: taggedUsers.includes(u.id) ? '#1D9E75' : '#6B6B6B', border: taggedUsers.includes(u.id) ? '1px solid #6EE7B7' : '1px solid transparent' }}>
                    <Avatar name={u.full_name} role={u.role} size="sm" />
                    {u.full_name}
                    {taggedUsers.includes(u.id) && <Check size={11} strokeWidth={2.5} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {err && <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-50 flex gap-3 shrink-0">
          <button onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">Hủy</button>
          <button disabled={!title.trim() || !date || loading} onClick={submit} className="btn-primary flex-1 py-3 text-sm">
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Tạo sự kiện'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Event Card ───────────────────────────────────────────────
function EventCard({ ev, currentUser, isOwner, allUsers, onRespond, onDelete }: {
  ev: Event; currentUser: AuthPayload; isOwner: boolean; allUsers: SimpleUser[]
  onRespond: (id: string, r: 'yes' | 'no') => void
  onDelete:  (id: string) => void
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [comments,   setComments]   = useState<EventComment[]>([])
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const evDate   = new Date(ev.event_date)
  const yesCount = ev.responses.filter(r => r.response === 'yes').length
  const myResp   = ev.responses.find(r => r.user_id === currentUser.userId)?.response
  const isCreator = ev.creator_id === currentUser.userId

  useEffect(() => {
    if (expanded && !loadedOnce) {
      fetch(`/api/events/${ev.id}/comments`).then(r => r.json()).then(d => { if (Array.isArray(d)) setComments(d); setLoadedOnce(true) })
    }
  }, [expanded, loadedOnce, ev.id])


  const monthGradients = [
    'linear-gradient(135deg,#FFE5E5,#FFBFBF)', 'linear-gradient(135deg,#FFE5F0,#FFB0CC)',
    'linear-gradient(135deg,#F5E5FF,#D4A0FF)', 'linear-gradient(135deg,#E5E8FF,#A0AAFF)',
    'linear-gradient(135deg,#E5F5FF,#80C8FF)', 'linear-gradient(135deg,#E5FFF8,#7FFFDB)',
    'linear-gradient(135deg,#EDFFD6,#AAFFA0)', 'linear-gradient(135deg,#FFFCE5,#FFE680)',
    'linear-gradient(135deg,#FFF3E5,#FFB860)', 'linear-gradient(135deg,#FFE8E5,#FF9080)',
    'linear-gradient(135deg,#EAE5FF,#9A80FF)', 'linear-gradient(135deg,#E5F0FF,#60A0FF)',
  ]
  const monthTextColors = [
    '#FF4040','#FF3380','#9933FF','#3344FF','#0088FF','#00CC99',
    '#44BB00','#CC9900','#FF7700','#FF3300','#6633FF','#0055CC',
  ]
  const mIdx = evDate.getMonth()

  return (
    <div className="bg-white rounded-xl" style={{ border: '1px solid #F0F0F0' }}>
      <div style={{ padding: '14px 16px' }}>
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Date badge */}
          <div className="shrink-0 rounded-xl flex flex-col items-center justify-center font-black"
            style={{ width: 44, height: 52, background: monthGradients[mIdx] }}>
            <span className="text-[9px] uppercase font-bold" style={{ color: monthTextColors[mIdx], opacity: 0.8 }}>
              {evDate.toLocaleString('vi-VN', { month: 'short' })}
            </span>
            <span className="text-xl leading-tight font-black" style={{ color: monthTextColors[mIdx] }}>
              {evDate.getDate()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="font-bold text-sm text-gray-800 leading-snug">{ev.title}</p>
              {(isCreator || isOwner) && (
                confirmDel
                  ? <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setConfirmDel(false); onDelete(ev.id) }} className="text-[11px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-full active:scale-95">Xóa</button>
                      <button onClick={() => setConfirmDel(false)} className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full active:scale-95">Thôi</button>
                    </div>
                  : <button onClick={() => setConfirmDel(true)} className="shrink-0 flex items-center justify-center"
                      style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.25)' }}>
                      <Trash2 size={12} strokeWidth={1.8} />
                    </button>
              )}
            </div>
            {ev.description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{ev.description}</p>}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[11px] text-gray-400">bởi {ev.creator.full_name}</span>
              {yesCount > 0 && <span className="text-[11px] font-semibold" style={{ color: '#059669' }}>· {yesCount} {ev.response_option_yes || 'Tham gia'}</span>}
              {ev.tags && ev.tags.length > 0 && (
                <>
                  <span className="text-[11px] text-gray-300">·</span>
                  {ev.tags.slice(0, 4).map(t => (
                    <span key={t.user_id} className="text-[11px] font-semibold" style={{ color: '#1D9E75' }}>@{t.user.full_name}</span>
                  ))}
                  {ev.tags.length > 4 && <span className="text-[11px] text-gray-400">+{ev.tags.length - 4}</span>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Response buttons */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => onRespond(ev.id, 'yes')}
            className="flex-1 flex items-center justify-center gap-1.5 font-bold transition-colors active:scale-95 rounded-lg"
            style={{
              height: 32, fontSize: 13,
              background: myResp === 'yes' ? '#D1FAE5' : 'transparent',
              color: myResp === 'yes' ? '#059669' : '#9CA3AF',
              border: myResp === 'yes' ? '1px solid #6EE7B7' : '1px solid #E5E7EB',
            }}>
            {myResp === 'yes' && <Check size={12} strokeWidth={2.5} />}
            {ev.response_option_yes || 'Tham gia'}
          </button>
          <button onClick={() => onRespond(ev.id, 'no')}
            className="flex-1 flex items-center justify-center gap-1.5 font-bold transition-colors active:scale-95 rounded-lg"
            style={{
              height: 32, fontSize: 13,
              background: myResp === 'no' ? '#FEE2E2' : 'transparent',
              color: myResp === 'no' ? '#DC2626' : '#9CA3AF',
              border: myResp === 'no' ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
            }}>
            {myResp === 'no' && <X size={12} strokeWidth={2.5} />}
            {ev.response_option_no || 'Không tham gia'}
          </button>
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 font-bold rounded-lg px-3 transition-colors active:scale-95"
            style={{ height: 32, fontSize: 13, background: 'transparent', color: '#9CA3AF', border: '1px solid #E5E7EB' }}>
            <CornerDownRight size={11} strokeWidth={2} />
            {loadedOnce ? comments.length : ''}
          </button>
        </div>
      </div>

      {/* Comments */}
      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/50 px-4 pt-2.5 pb-3 space-y-2.5">
          {!loadedOnce ? (
            <div className="skeleton h-8 w-full rounded-xl" />
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">Chưa có thảo luận</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar name={c.author.full_name} role={c.author.role} size="sm" />
                <div className="flex-1 bg-white rounded-xl px-2.5 py-2 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-bold text-gray-700">{c.author.full_name}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{renderMentions(c.content)}</p>
                  {c.image_url && <a href={c.image_url} target="_blank" rel="noopener noreferrer"><Image src={c.image_url} alt="" width={400} height={128} className="mt-1 max-h-32 rounded-xl object-cover" /></a>}
                </div>
              </div>
            ))
          )}

          <CommentInput
            currentUser={{ fullName: currentUser.fullName, role: currentUser.role }}
            users={allUsers.map(u => ({ id: u.id, full_name: u.full_name, role: u.role }))}
            placeholder="Thảo luận sự kiện..."
            accentColor="#D4456B"
            onSubmit={async (content, imageUrl) => {
              const res = await fetch(`/api/events/${ev.id}/comments`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, imageUrl }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error || 'Không gửi được')
              setComments(p => [...p, data])
            }}
          />
        </div>
      )}
    </div>
  )
}
