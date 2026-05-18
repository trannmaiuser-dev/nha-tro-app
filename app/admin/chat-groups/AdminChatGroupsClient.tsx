'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Users, Trash2, X } from 'lucide-react'
import { createGroupAction, addMemberAction, removeMemberAction, deleteGroupAction } from './actions'

interface Group {
  id: string
  name: string
  description: string | null
  created_at: string
  member_count: number
  last_message_at: string | null
}

interface MemberLite { user_id: string; full_name: string }
interface UserLite { id: string; full_name: string; phone: string; role: string }

interface Props {
  groups: Group[]
  membersByGroup: Record<string, MemberLite[]>
  eligibleUsers: UserLite[]
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function AdminChatGroupsClient({ groups, membersByGroup, eligibleUsers }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating]     = useState(false)
  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')
  const [error, setError]           = useState<string | null>(null)

  const [manageGroup, setManageGroup] = useState<Group | null>(null)
  const [busy, setBusy]               = useState(false)

  async function handleCreate() {
    setCreating(true); setError(null)
    const res = await createGroupAction(name, description)
    setCreating(false)
    if (!res.success) { setError(res.error); return }
    setShowCreate(false); setName(''); setDescription('')
    router.refresh()
  }

  async function handleAdd(groupId: string, userId: string) {
    setBusy(true)
    const res = await addMemberAction(groupId, userId)
    setBusy(false)
    if (!res.success) alert(res.error)
    else router.refresh()
  }

  async function handleRemove(groupId: string, userId: string, name: string) {
    if (!confirm(`Xóa ${name} khỏi nhóm?`)) return
    setBusy(true)
    const res = await removeMemberAction(groupId, userId)
    setBusy(false)
    if (!res.success) alert(res.error)
    else router.refresh()
  }

  async function handleDelete(g: Group) {
    if (!confirm(`Xóa nhóm "${g.name}"? Tin nhắn cũ vẫn còn nhưng nhóm không hoạt động.`)) return
    setBusy(true)
    const res = await deleteGroupAction(g.id)
    setBusy(false)
    if (!res.success) alert(res.error)
    else { setManageGroup(null); router.refresh() }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreate(true)}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Plus size={18} /> Tạo nhóm chat mới
      </button>

      {groups.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-bold text-gray-700">Chưa có nhóm chat nào</p>
          <p className="text-sm text-gray-400 mt-1">Tạo nhóm để chat cùng nhiều khách thuê.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <div key={g.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/chat-groups/${g.id}`} className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-800">{g.name}</h3>
                  {g.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{g.description}</p>}
                  <p className="text-xs text-gray-400 mt-1.5">
                    {g.member_count} thành viên · Tạo {fmtDate(g.created_at)}
                    {g.last_message_at && ` · Hoạt động ${fmtDate(g.last_message_at)}`}
                  </p>
                </Link>
                <button
                  onClick={() => setManageGroup(g)}
                  className="text-primary-600 hover:bg-primary-50 rounded-lg p-2 shrink-0"
                  title="Quản lý"
                >
                  <Users size={18} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !creating && setShowCreate(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="font-black text-gray-800 text-lg mb-4">Tạo nhóm chat</h2>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên nhóm *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Vd: Tầng 1, Tất cả khách thuê..."
              disabled={creating}
              className="input-field w-full mb-3"
            />
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Mô tả (tùy chọn)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về nhóm..."
              disabled={creating}
              rows={2}
              className="input-field w-full"
            />
            {error && <p className="mt-3 text-sm text-red-500 font-bold">{error}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} disabled={creating} className="btn-secondary flex-1">Hủy</button>
              <button onClick={handleCreate} disabled={creating || !name.trim()} className="btn-primary flex-1">
                {creating ? 'Đang tạo...' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage members modal */}
      {manageGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !busy && setManageGroup(null)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-black text-gray-800 text-lg">Quản lý nhóm</h2>
                <p className="text-xs text-gray-500">{manageGroup.name}</p>
              </div>
              <button onClick={() => setManageGroup(null)} disabled={busy} className="text-gray-300 hover:text-gray-500">
                <X size={20} />
              </button>
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Thành viên hiện tại</h3>
            <ul className="space-y-1.5 mb-4">
              {(membersByGroup[manageGroup.id] ?? []).map(m => (
                <li key={m.user_id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-bold text-gray-700">{m.full_name || '(chưa rõ tên)'}</span>
                  <button
                    onClick={() => handleRemove(manageGroup.id, m.user_id, m.full_name)}
                    disabled={busy}
                    className="text-red-400 hover:text-red-600 p-1"
                    title="Xóa khỏi nhóm"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
              {(membersByGroup[manageGroup.id] ?? []).length === 0 && (
                <li className="text-sm text-gray-400 italic">Chưa có thành viên</li>
              )}
            </ul>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Thêm thành viên</h3>
            <ul className="space-y-1.5">
              {eligibleUsers
                .filter(u => !(membersByGroup[manageGroup.id] ?? []).some(m => m.user_id === u.id))
                .map(u => (
                  <li key={u.id} className="flex items-center justify-between bg-primary-50 rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-700">{u.full_name || u.phone}</p>
                      <p className="text-xs text-gray-400">{u.phone} · {u.role === 'owner' ? 'Chủ' : 'Khách'}</p>
                    </div>
                    <button
                      onClick={() => handleAdd(manageGroup.id, u.id)}
                      disabled={busy}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Thêm
                    </button>
                  </li>
                ))}
            </ul>

            <button
              onClick={() => handleDelete(manageGroup)}
              disabled={busy}
              className="mt-5 w-full text-sm text-red-500 hover:bg-red-50 rounded-xl py-2 border border-red-200 flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> Xóa nhóm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
