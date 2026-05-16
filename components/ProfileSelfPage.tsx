'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { AuthPayload, TenantProfile } from '@/types'

interface Room { name: string; floor: number; price: number }
interface Props { currentUser: AuthPayload; profile: TenantProfile | null; room: Room | null }

const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' }

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function calcAge(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000))
}

export default function ProfileSelfPage({ currentUser, profile, room }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const age = profile?.dob ? calcAge(profile.dob) : null

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #EEF7FF 100%)' }}>
      {/* Header */}
      <header className="px-4 pb-5" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-black text-gray-800">👤 Tôi</h1>
          <button onClick={handleLogout} className="text-sm font-bold px-3 py-2 rounded-xl text-red-400 bg-red-50 active:scale-95 transition-all">
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Avatar + name */}
        <div className="bg-white rounded-3xl shadow-card p-5 flex items-center gap-4">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt="avatar" width={64} height={64} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0"
              style={{ background: currentUser.role === 'owner' ? '#1D9E75' : '#5B6AD0' }}>
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-gray-800 truncate">{currentUser.fullName}</h2>
            <p className="text-sm text-gray-400">{currentUser.phone}</p>
            <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mt-1"
              style={{ background: currentUser.role === 'owner' ? '#E8F5EE' : '#EEF0FF', color: currentUser.role === 'owner' ? '#1D9E75' : '#5B6AD0' }}>
              {currentUser.role === 'owner' ? '🏠 Chủ nhà' : '👤 Khách thuê'}
            </span>
          </div>
        </div>

        {/* Room info (tenant only) */}
        {room && (
          <div className="bg-white rounded-2xl shadow-card p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Phòng của bạn</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black"
                style={{ background: '#E8F5EE', color: '#1D9E75' }}>
                {room.name.replace('P', '')}
              </div>
              <div>
                <p className="font-black text-gray-800">Phòng {room.name}</p>
                <p className="text-sm text-gray-400">Tầng {room.floor} · {room.price.toLocaleString('vi-VN')}đ/tháng</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile info */}
        {profile && (
          <div className="bg-white rounded-2xl shadow-card p-4 space-y-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Thông tin cá nhân</p>
            {[
              { label: 'Ngày sinh',   value: age ? `${formatDate(profile.dob)} (${age} tuổi)` : formatDate(profile.dob) },
              { label: 'Giới tính',   value: GENDER_LABEL[profile.gender || ''] || '—' },
              { label: 'CCCD',        value: profile.cccd_number || '—' },
              { label: 'Nghề nghiệp', value: profile.occupation  || '—' },
              { label: 'Địa chỉ',    value: profile.address      || '—' },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-400 font-medium">{row.label}</span>
                <span className="text-sm font-bold text-gray-700 text-right max-w-[55%]">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Profile status */}
        {currentUser.role === 'tenant' && (
          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700">Hồ sơ của tôi</p>
              {profile ? (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  profile.profile_status === 'confirmed' ? 'bg-green-50 text-green-600' :
                  profile.profile_status === 'pending'   ? 'bg-amber-50 text-amber-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {profile.profile_status === 'confirmed' ? '✅ Đã xác nhận' :
                   profile.profile_status === 'pending'   ? '⏳ Chờ duyệt' : '📝 Chưa hoàn thiện'}
                </span>
              ) : (
                <span className="text-xs bg-orange-50 text-orange-500 font-bold px-2.5 py-1 rounded-full">Chưa tạo</span>
              )}
            </div>
            {(!profile || profile.profile_status === 'draft') && (
              <button onClick={() => router.push('/profile/setup')}
                className="btn-primary w-full mt-3 text-sm py-3">
                {profile ? '✏️ Hoàn thiện hồ sơ' : '+ Tạo hồ sơ'}
              </button>
            )}
          </div>
        )}

        {/* Owner quick actions */}
        {currentUser.role === 'owner' && (
          <div className="bg-white rounded-2xl shadow-card p-4 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Quản lý</p>
            {[
              { label: '🏠 Quản lý phòng', href: '/dashboard' },
              { label: '📋 Hồ sơ khách', href: '/dashboard' },
              { label: '⚙️ Cài đặt', href: '/home' },
            ].map(item => (
              <button key={item.href + item.label} onClick={() => router.push(item.href)}
                className="w-full flex items-center justify-between py-2.5 px-0 border-b border-gray-50 last:border-0 active:scale-98 transition-all">
                <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                <span className="text-gray-300">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
