'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { TenantProfile, EmergencyContact, RelatedPerson, TenantDocument } from '@/types'

interface TenantUserExt {
  phone: string
  full_name: string
  is_profile_complete: boolean
  tenant_status?: string
  locked_at?: string | null
  locked_reason?: string | null
}

interface Props {
  userId:     string
  profile:    TenantProfile
  emergency:  EmergencyContact | null
  related:    RelatedPerson[]
  documents:  TenantDocument[]
  tenantUser: TenantUserExt | null
  room:       { id: string; name: string; floor: number; price: number } | null
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft:     { text: 'Chưa hoàn thiện', cls: 'badge-gray' },
  pending:   { text: 'Chờ xác nhận',    cls: 'badge-orange' },
  confirmed: { text: 'Đã xác nhận',     cls: 'badge-green' },
}

const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' }

export default function TenantSummaryPage({ userId, profile, emergency, related, documents, tenantUser, room }: Props) {
  const router  = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState('')
  const [status, setStatus] = useState(profile.profile_status)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lockedAt, setLockedAt] = useState<string | null>(tenantUser?.locked_at ?? null)
  const [tenantStatus, setTenantStatus] = useState(tenantUser?.tenant_status ?? 'active')
  const [confirmDialog, setConfirmDialog] = useState<null | {
    title: string; description: string; confirmLabel: string; action: () => Promise<void>
  }>(null)
  const [actionLoading, setActionLoading] = useState(false)

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000) }

  async function lockTenant(locked: boolean) {
    setActionLoading(true)
    try {
      const reason = locked ? (prompt('Lý do tạm khóa (không bắt buộc):') ?? undefined) : undefined
      const res = await fetch(`/api/admin/tenants/${userId}/lock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Thất bại')
      setLockedAt(locked ? new Date().toISOString() : null)
      showToast(locked ? '🔒 Đã tạm khóa account' : '🔓 Đã mở khóa account')
    } catch (err) {
      showToast(`Lỗi: ${(err as Error).message}`)
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  async function archiveTenant() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/tenants/${userId}/archive`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Thất bại')
      setTenantStatus('archived')
      showToast('📦 Đã lưu trữ account')
      setTimeout(() => router.push('/admin/tenants'), 1200)
    } catch (err) {
      showToast(`Lỗi: ${(err as Error).message}`)
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  async function confirmProfile() {
    setConfirming(true)
    try {
      const res = await fetch(`/api/profile/${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'confirm' }),
      })
      if (res.ok) { setStatus('confirmed'); showToast('✅ Đã xác nhận hồ sơ') }
      else showToast('Lỗi xác nhận')
    } finally { setConfirming(false) }
  }

  async function sendReminder() {
    await fetch('/api/notifications/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        receiverId: userId,
        type:    'payment_reminder',
        message: '📋 Vui lòng hoàn thiện hồ sơ khách thuê của bạn trong thời gian sớm nhất nhé!',
      }),
    })
    showToast('📨 Đã gửi nhắc nhở')
  }

  const hasDocs = documents.length > 0
  const docTypes = new Set(documents.map(d => d.type))
  const missingDocs = !docTypes.has('cccd_front') || !docTypes.has('cccd_back') || !docTypes.has('contract')

  const statusBadge = STATUS_LABEL[status] || STATUS_LABEL.draft

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <header className="bg-white shadow-soft safe-top">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-4">
          <button onClick={() => router.back()} className="p-2 text-gray-400 active:scale-95 transition-all">
            <BackIcon />
          </button>
          <h1 className="text-lg font-black text-gray-800 flex-1">Hồ sơ khách thuê</h1>
          <button onClick={() => router.push(`/profile/${userId}/edit`)}
            className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl active:scale-95">
            ✏️ Sửa
          </button>
          {status !== 'confirmed' && (
            <button onClick={confirmProfile} disabled={confirming}
              className="bg-primary-600 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 disabled:opacity-50">
              {confirming ? '...' : 'Xác nhận'}
            </button>
          )}
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)}
              className="bg-gray-100 text-gray-700 text-lg font-bold px-2.5 py-2 rounded-xl active:scale-95">
              ⋮
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-float z-40 min-w-[200px] overflow-hidden">
                  {lockedAt ? (
                    <button onClick={() => { setMenuOpen(false); lockTenant(false) }}
                      className="w-full text-left text-sm font-semibold px-4 py-3 hover:bg-green-50 active:scale-98 text-green-700">
                      🔓 Mở khóa account
                    </button>
                  ) : (
                    <button onClick={() => {
                      setMenuOpen(false)
                      setConfirmDialog({
                        title: 'Tạm khóa account?',
                        description: 'Khách sẽ không thể đăng nhập đến khi được mở lại. Có thể mở khóa bất cứ lúc nào.',
                        confirmLabel: '🔒 Tạm khóa',
                        action: () => lockTenant(true),
                      })
                    }}
                      className="w-full text-left text-sm font-semibold px-4 py-3 hover:bg-orange-50 active:scale-98 text-orange-700">
                      🔒 Tạm khóa account
                    </button>
                  )}
                  <button onClick={() => {
                    setMenuOpen(false)
                    setConfirmDialog({
                      title: 'Lưu trữ account?',
                      description: 'Account sẽ chuyển sang trạng thái "archived" và rời khỏi danh sách khách thuê hoạt động. Dữ liệu vẫn giữ lại 2 năm theo UC-07.',
                      confirmLabel: '📦 Lưu trữ',
                      action: archiveTenant,
                    })
                  }}
                    disabled={tenantStatus === 'archived'}
                    className="w-full text-left text-sm font-semibold px-4 py-3 hover:bg-gray-50 active:scale-98 text-red-700 disabled:opacity-40 disabled:cursor-not-allowed border-t border-gray-100">
                    📦 Lưu trữ (xóa mềm)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* Hero card */}
        <div className="card">
          <div className="flex items-center gap-4">
            {profile.avatar_url
              ? <Image src={profile.avatar_url} alt="avatar" width={80} height={80} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
              : <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center text-3xl font-black text-primary-600 shrink-0">
                  {(profile.full_name || tenantUser?.full_name || '?').charAt(0).toUpperCase()}
                </div>}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-gray-800 truncate">
                {profile.full_name || tenantUser?.full_name || 'Chưa cập nhật'}
              </h2>
              {room && <p className="text-sm text-gray-500">Phòng {room.name} · Tầng {room.floor}</p>}
              <p className="text-sm text-gray-500">{tenantUser?.phone}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={statusBadge.cls}>{statusBadge.text}</span>
                {missingDocs && <span className="badge bg-orange-50 text-orange-500 text-xs">📎 Thiếu giấy tờ</span>}
                {lockedAt && <span className="badge bg-red-50 text-red-600 text-xs">🔒 Tạm khóa</span>}
                {tenantStatus === 'archived' && <span className="badge bg-gray-100 text-gray-600 text-xs">📦 Lưu trữ</span>}
              </div>
              {lockedAt && tenantUser?.locked_reason && (
                <p className="text-xs text-red-500 mt-1.5">Lý do: {tenantUser.locked_reason}</p>
              )}
            </div>
          </div>
        </div>

        {/* Basic info grid */}
        <div className="card">
          <SectionTitle>📋 Thông tin cơ bản</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <InfoCell label="Tuổi"       value={profile.dob ? calcAge(profile.dob) + ' tuổi' : '—'} />
            <InfoCell label="Giới tính"  value={GENDER_LABEL[profile.gender || ''] || '—'} />
            <InfoCell label="CCCD"       value={profile.cccd_number || '—'} />
            <InfoCell label="Nghề nghiệp" value={profile.occupation || '—'} />
          </div>
          {profile.address && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 font-medium mb-1">Địa chỉ thường trú</p>
              <p className="text-sm font-semibold text-gray-700">{profile.address}</p>
            </div>
          )}
        </div>

        {/* Emergency contact */}
        <div className="card">
          <SectionTitle>🆘 Liên hệ khẩn cấp</SectionTitle>
          {emergency ? (
            <div className="flex items-center gap-3 mt-3">
              {emergency.avatar_url
                ? <Image src={emergency.avatar_url} alt="" width={56} height={56} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-500 shrink-0">
                    {emergency.full_name.charAt(0)}
                  </div>}
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-800">{emergency.full_name}</p>
                <p className="text-sm text-gray-500">{emergency.relationship}</p>
                <a href={`tel:${emergency.phone}`} className="text-sm font-bold text-primary-600">{emergency.phone}</a>
                <p className="text-xs text-gray-400 truncate">{emergency.address}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-2">Chưa có thông tin</p>
          )}
        </div>

        {/* Related persons */}
        {related.length > 0 && (
          <div className="card">
            <SectionTitle>👥 Người thường lui tới ({related.length})</SectionTitle>
            <div className="space-y-3 mt-3">
              {related.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  {p.avatar_url
                    ? <Image src={p.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">
                        {p.full_name.charAt(0)}
                      </div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-700">{p.full_name}</p>
                    <p className="text-xs text-gray-400">{p.relationship} · {p.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="card">
          <SectionTitle>
            📄 Giấy tờ
            {missingDocs && <span className="ml-2 badge bg-orange-50 text-orange-500">Chưa hoàn thiện</span>}
          </SectionTitle>
          {!hasDocs ? (
            <p className="text-sm text-gray-400 mt-2">Chưa upload giấy tờ nào</p>
          ) : (
            <div className="space-y-3 mt-3">
              {(['cccd_front', 'cccd_back'] as const).map(type => {
                const doc = documents.find(d => d.type === type)
                const label = type === 'cccd_front' ? 'CCCD mặt trước' : 'CCCD mặt sau'
                return (
                  <div key={type} className="flex items-center gap-3">
                    {doc
                      ? <>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Image src={doc.file_url} alt={label} width={64} height={40} className="w-16 h-10 object-cover rounded-lg border border-gray-100" />
                          </a>
                          <p className="text-sm font-semibold text-gray-700">{label}</p>
                        </>
                      : <p className="text-sm text-orange-500">⚠️ {label} — Chưa có</p>}
                  </div>
                )
              })}

              {documents.filter(d => d.type === 'contract').map((doc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xl">📃</span>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary-600 font-semibold">
                    Hợp đồng {documents.filter(d => d.type === 'contract').length > 1 ? `(${i + 1})` : ''}
                  </a>
                </div>
              ))}
              {!docTypes.has('contract') && (
                <p className="text-sm text-orange-500">⚠️ Hợp đồng — Chưa có</p>
              )}

              {documents.filter(d => d.type === 'custom').map((doc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xl">📎</span>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary-600 font-semibold">
                    {doc.custom_name || `Giấy tờ ${i + 1}`}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {missingDocs && (
            <button onClick={sendReminder} className="w-full btn-secondary">
              📨 Gửi nhắc hoàn thiện hồ sơ
            </button>
          )}
          {status !== 'confirmed' && (
            <button onClick={confirmProfile} disabled={confirming} className="w-full btn-primary">
              {confirming ? '⏳ Đang xử lý...' : '✅ Xác nhận hồ sơ'}
            </button>
          )}
          {status === 'confirmed' && (
            <div className="card bg-primary-50 border border-primary-100 text-center py-4">
              <p className="text-primary-600 font-black">✅ Hồ sơ đã được xác nhận</p>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white font-semibold text-sm px-5 py-3 rounded-2xl shadow-float z-50 animate-slide-up">
          {toast}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Xác nhận'}
        loading={actionLoading}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => confirmDialog?.action()}
      />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="font-black text-gray-800 text-sm">{children}</p>
}
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3">
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-700">{value}</p>
    </div>
  )
}
function BackIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function calcAge(dob: string) {
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}
