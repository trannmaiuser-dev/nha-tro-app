'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { PlusIcon, SearchIcon } from 'lucide-react'
import type { Room, RoomWithTenants } from '@/types'
import type { RoomSchemaInput } from '@/lib/schemas/room'
import { createRoomAction, updateRoomAction, deleteRoomAction } from '@/app/rooms/actions'
import RoomCard from '@/components/rooms/RoomCard'
import RoomForm from '@/components/rooms/RoomForm'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Props {
  initialRooms: RoomWithTenants[]
  defaultElectricityRate?: number
}

type FilterStatus = 'all' | 'occupied' | 'vacant' | 'maintenance'

const FILTER_TABS: { value: FilterStatus; label: string }[] = [
  { value: 'all',         label: 'Tất cả' },
  { value: 'occupied',    label: 'Đang ở' },
  { value: 'vacant',      label: 'Phòng trống' },
  { value: 'maintenance', label: 'Bảo trì' },
]

export default function RoomList({ initialRooms, defaultElectricityRate }: Props) {
  const [rooms, setRooms]               = useState<RoomWithTenants[]>(initialRooms)
  const [search, setSearch]             = useState('')
  const [filter, setFilter]             = useState<FilterStatus>('all')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingRoom, setEditingRoom]   = useState<Room | null>(null)
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null)
  const [submitting, setSubmitting]     = useState(false)

  /* ── Lọc danh sách (search match: tên phòng hoặc bất kỳ tenant nào — T-016 Phase C) ── */
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return rooms.filter(r => {
      const matchStatus = filter === 'all' || r.status === filter
      // T-016b: bỏ legacy fallback `r.tenant` (Room.tenant đã drop khi cleanup tenant_id).
      const matchSearch = !kw
        || r.name.toLowerCase().includes(kw)
        || (r.tenants ?? []).some(t => t.user.full_name?.toLowerCase().includes(kw))
      return matchStatus && matchSearch
    })
  }, [rooms, search, filter])

  /* ── Thêm phòng ── */
  async function handleCreate(data: RoomSchemaInput) {
    setSubmitting(true)
    const result = await createRoomAction(data)
    setSubmitting(false)
    if (!result.success) { toast.error(result.error); return }
    // Phòng mới luôn trống → tenants = []
    setRooms(prev => [...prev, { ...result.data, tenants: [] }])
    setModalOpen(false)
    toast.success('Đã thêm phòng mới')
  }

  /* ── Sửa phòng ── */
  async function handleUpdate(data: RoomSchemaInput) {
    if (!editingRoom) return
    setSubmitting(true)
    const result = await updateRoomAction(editingRoom.id, data)
    setSubmitting(false)
    if (!result.success) { toast.error(result.error); return }
    setRooms(prev => prev.map(r => r.id === editingRoom.id ? { ...r, ...result.data, tenants: r.tenants } : r))
    setEditingRoom(null)
    toast.success('Đã cập nhật phòng')
  }

  /* ── Xóa phòng ── */
  async function handleDelete() {
    if (!deletingRoom) return
    setSubmitting(true)
    const result = await deleteRoomAction(deletingRoom.id)
    setSubmitting(false)
    if (!result.success) { toast.error(result.error); return }
    setRooms(prev => prev.filter(r => r.id !== deletingRoom.id))
    setDeletingRoom(null)
    toast.success('Đã xóa phòng')
  }

  return (
    <div className="space-y-4">
      {/* Thanh tìm kiếm + nút thêm */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm tên phòng hoặc tên khách..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field w-full pl-9 text-sm"
          />
        </div>
        <button
          onClick={() => { setEditingRoom(null); setModalOpen(true) }}
          className="btn-primary flex items-center gap-1.5 text-sm px-4 shrink-0"
        >
          <PlusIcon size={16} />
          Thêm phòng
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
              filter === tab.value
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.value === 'all' && (
              <span className="ml-1.5 text-xs opacity-70">{rooms.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Danh sách phòng */}
      {filtered.length === 0 ? (
        <EmptyState search={search} onAdd={() => { setEditingRoom(null); setModalOpen(true) }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={r => { setEditingRoom(r); setModalOpen(true) }}
              onDelete={r => setDeletingRoom(r)}
              defaultElectricityRate={defaultElectricityRate}
            />
          ))}
        </div>
      )}

      {/* Modal thêm / sửa phòng */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { if (!submitting) { setModalOpen(false); setEditingRoom(null) } }}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 animate-slide-up"
            style={{ boxShadow: 'var(--shadow-float)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-black text-gray-800 text-lg mb-5">
              {editingRoom ? 'Sửa thông tin phòng' : 'Thêm phòng mới'}
            </h2>
            <RoomForm
              mode={editingRoom ? 'edit' : 'create'}
              defaultValues={editingRoom ?? undefined}
              onSubmit={editingRoom ? handleUpdate : handleCreate}
              onCancel={() => { setModalOpen(false); setEditingRoom(null) }}
              loading={submitting}
              defaultElectricityRate={defaultElectricityRate}
            />
          </div>
        </div>
      )}

      {/* Dialog xác nhận xóa */}
      <ConfirmDialog
        open={!!deletingRoom}
        title={`Xóa phòng ${deletingRoom?.name}?`}
        description="Hành động này không thể hoàn tác. Chỉ có thể xóa phòng khi không có khách thuê."
        confirmLabel="Xóa phòng"
        onConfirm={handleDelete}
        onCancel={() => { if (!submitting) setDeletingRoom(null) }}
        loading={submitting}
      />
    </div>
  )
}

function EmptyState({ search, onAdd }: { search: string; onAdd: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{search ? '🔍' : '🏠'}</div>
      <p className="font-bold text-gray-600 mb-1">
        {search ? `Không tìm thấy phòng nào cho "${search}"` : 'Chưa có phòng nào'}
      </p>
      <p className="text-sm text-gray-400 mb-5">
        {search ? 'Thử tìm với từ khóa khác' : 'Thêm phòng đầu tiên để bắt đầu quản lý'}
      </p>
      {!search && (
        <button onClick={onAdd} className="btn-primary inline-flex items-center gap-2">
          <PlusIcon size={16} />
          Thêm phòng đầu tiên
        </button>
      )}
    </div>
  )
}
