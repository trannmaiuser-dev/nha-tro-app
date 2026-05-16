'use client'

import { useState, useMemo } from 'react'
import { SearchIcon, PlusIcon } from 'lucide-react'
import type { TenantRow } from '@/lib/db/tenants'
import TenantCard from './TenantCard'
import AddTenantDialog from './AddTenantDialog'

interface Props {
  initialTenants: TenantRow[]
  rooms: { id: string; name: string; floor: number; status: string }[]
}

type Filter = 'all' | 'active' | 'invited' | 'pending_move'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',          label: 'Tất cả' },
  { value: 'active',       label: 'Đang ở' },
  { value: 'invited',      label: 'Chưa đăng nhập' },
  { value: 'pending_move', label: 'Chờ chuyển đi' },
]

export default function TenantList({ initialTenants, rooms }: Props) {
  const [tenants,    setTenants]    = useState<TenantRow[]>(initialTenants)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState<Filter>('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return tenants.filter(t => {
      const matchFilter = filter === 'all' || t.tenant_status === filter
      const matchSearch = !kw || t.full_name?.toLowerCase().includes(kw) || t.phone.includes(kw)
      return matchFilter && matchSearch
    })
  }, [tenants, search, filter])

  function handleAdded(newTenant: TenantRow) {
    setTenants(prev => [newTenant, ...prev])
    setDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Thanh tìm kiếm + nút thêm */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm tên hoặc số điện thoại..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field w-full pl-9 text-sm"
          />
        </div>
        <button onClick={() => setDialogOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm px-4 shrink-0">
          <PlusIcon size={16} />
          Thêm khách
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
              filter === f.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.value === 'all' && <span className="ml-1.5 text-xs opacity-70">{tenants.length}</span>}
          </button>
        ))}
      </div>

      {/* Danh sách */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">{search ? '🔍' : '👤'}</div>
          <p className="font-bold text-gray-600 mb-1">
            {search ? `Không tìm thấy "${search}"` : 'Chưa có khách thuê nào'}
          </p>
          {!search && (
            <button onClick={() => setDialogOpen(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
              <PlusIcon size={16} />
              Thêm khách đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => <TenantCard key={t.id} tenant={t} />)}
        </div>
      )}

      <AddTenantDialog
        open={dialogOpen}
        rooms={rooms}
        onClose={() => setDialogOpen(false)}
        onAdded={handleAdded}
      />
    </div>
  )
}
