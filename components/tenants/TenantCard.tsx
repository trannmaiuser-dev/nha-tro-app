'use client'

import type { TenantRow } from '@/lib/db/tenants'

interface Props {
  tenant: TenantRow
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  invited:      { label: 'Chưa đăng nhập', cls: 'badge-blue' },
  active:       { label: 'Đang ở',          cls: 'badge-green' },
  pending_move: { label: 'Chờ chuyển đi',   cls: 'badge-orange' },
  moved_out:    { label: 'Đã chuyển đi',    cls: 'badge-gray' },
  archived:     { label: 'Đã lưu trữ',      cls: 'badge-gray' },
}

export default function TenantCard({ tenant }: Props) {
  const status  = STATUS_CONFIG[tenant.tenant_status] ?? STATUS_CONFIG.active
  const profile = Array.isArray(tenant.tenant_profiles) ? tenant.tenant_profiles[0] : tenant.tenant_profiles
  const room    = Array.isArray(tenant.room) ? tenant.room[0] : tenant.room
  const initials = (tenant.full_name ?? tenant.phone).charAt(0).toUpperCase()

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="avatar" className="w-12 h-12 rounded-2xl object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center font-black text-primary-600 text-lg shrink-0">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-black text-gray-800 truncate">{tenant.full_name ?? 'Chưa điền tên'}</p>
          <p className="text-sm text-gray-400">{tenant.phone}</p>
        </div>

        <span className={status.cls}>{status.label}</span>
      </div>

      {/* Phòng */}
      {room && (
        <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-xl px-3 py-2">
          <span className="text-gray-400">Phòng</span>
          <span className="font-bold text-gray-700">{room.name}</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-400">Tầng {room.floor}</span>
        </div>
      )}

      {/* Badges trạng thái phụ */}
      <div className="flex gap-2 flex-wrap">
        {!tenant.is_profile_complete && (
          <span className="badge-yellow">Chưa hoàn thiện hồ sơ</span>
        )}
        {tenant.has_debt && (
          <span className="badge-red">Đang nợ tiền</span>
        )}
        {profile?.profile_status === 'pending' && (
          <span className="badge-orange">Chờ duyệt hồ sơ</span>
        )}
      </div>
    </div>
  )
}
