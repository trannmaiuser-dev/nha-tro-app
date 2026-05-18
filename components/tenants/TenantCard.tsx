'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import type { TenantRow } from '@/lib/db/tenants'
import EditContractDialog from '@/components/tenants/EditContractDialog'

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

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime()
  return Math.ceil((target - Date.now()) / 86400_000)
}

function fmtDate(s: string): string {
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function TenantCard({ tenant }: Props) {
  const router = useRouter()
  const status   = STATUS_CONFIG[tenant.tenant_status] ?? STATUS_CONFIG.active
  const profile  = Array.isArray(tenant.tenant_profiles) ? tenant.tenant_profiles[0] : tenant.tenant_profiles
  const room     = Array.isArray(tenant.room) ? tenant.room[0] : tenant.room
  const initials = (tenant.full_name ?? tenant.phone).charAt(0).toUpperCase()
  const membership   = tenant.active_membership
  const contractEnd  = membership?.contract_end_date ?? null
  const daysLeft     = contractEnd ? daysUntil(contractEnd) : null

  // T-042: contract status badge classification
  const contractTone =
    daysLeft == null        ? null
    : daysLeft < 0          ? { label: `❌ Hợp đồng đã hết hạn ${Math.abs(daysLeft)} ngày`, cls: 'badge-red' }
    : daysLeft <= 7         ? { label: `🔴 Hợp đồng còn ${daysLeft} ngày`, cls: 'badge-red' }
    : daysLeft <= 30        ? { label: `📅 Hợp đồng còn ${daysLeft} ngày`, cls: 'badge-orange' }
    :                         { label: `Hợp đồng đến ${fmtDate(contractEnd!)}`, cls: 'badge-gray' }

  const [editOpen, setEditOpen] = useState(false)
  const canEditContract = membership && tenant.tenant_status !== 'moved_out' && tenant.tenant_status !== 'archived'

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
        {profile?.profile_status === 'pending' && (
          <span className="badge-orange">Chờ duyệt hồ sơ</span>
        )}
        {contractTone && <span className={contractTone.cls}>{contractTone.label}</span>}
      </div>

      {/* T-042: nút chỉnh hợp đồng (chỉ owner — page là /admin/tenants nên user đã là owner) */}
      {canEditContract && (
        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:bg-primary-50 rounded-xl py-2 border border-primary-100"
        >
          <CalendarDays size={16} strokeWidth={1.75} />
          {contractEnd ? 'Sửa ngày hết hạn' : 'Đặt ngày hết hạn hợp đồng'}
        </button>
      )}

      {editOpen && membership && (
        <EditContractDialog
          membershipId={membership.id}
          currentEndDate={contractEnd}
          tenantName={tenant.full_name ?? tenant.phone}
          roomName={room?.name ?? '-'}
          onClose={() => setEditOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  )
}
