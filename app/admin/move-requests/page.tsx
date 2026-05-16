'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { approveMoveRequestAction, rejectMoveRequestAction } from './actions'
import type { MoveRequest } from '@/types'

type Filter = 'all' | 'pending' | 'approved' | 'rejected'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',      label: 'Tất cả' },
  { value: 'pending',  label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
]

const STATUS_BADGE: Record<string, string> = {
  pending:  'badge-orange',
  approved: 'badge-green',
  rejected: 'badge-red',
}
const STATUS_LABEL: Record<string, string> = {
  pending:  'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
}

export default function AdminMoveRequestsPage() {
  const [requests,    setRequests]    = useState<MoveRequest[]>([])
  const [filter,      setFilter]      = useState<Filter>('all')
  const [loading,     setLoading]     = useState(true)
  const [approving,   setApproving]   = useState<string | null>(null)
  const [rejecting,   setRejecting]   = useState<string | null>(null)
  const [rejectNote,  setRejectNote]  = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  useEffect(() => {
    fetch('/api/admin/move-requests')
      .then(r => r.json())
      .then(d => { setRequests(d.requests ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  async function handleApprove() {
    if (!approving) return
    setSubmitting(true)
    const res = await approveMoveRequestAction(approving)
    setSubmitting(false)
    setApproving(null)
    if (!res.success) { toast.error(res.error); return }
    setRequests(prev => prev.map(r => r.id === approving ? { ...r, status: 'approved' } : r))
    toast.success('Đã duyệt yêu cầu chuyển đi')
  }

  async function handleReject() {
    if (!rejecting) return
    setSubmitting(true)
    const res = await rejectMoveRequestAction(rejecting, rejectNote)
    setSubmitting(false)
    if (!res.success) { toast.error(res.error); return }
    setRequests(prev => prev.map(r => r.id === rejecting ? { ...r, status: 'rejected', rejection_note: rejectNote } : r))
    setRejecting(null)
    setRejectNote('')
    toast.success('Đã từ chối yêu cầu')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400"><BackIcon /></Link>
          <h1 className="text-lg font-black text-gray-800">Yêu cầu chuyển đi</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${filter === f.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">Đang tải...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><div className="text-5xl mb-3">📋</div><p className="text-gray-400">Không có yêu cầu nào</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => (
              <div key={req.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-gray-800">{req.user?.full_name ?? req.user?.phone}</p>
                    <p className="text-sm text-gray-400">Phòng {req.room?.name} · Tầng {req.room?.floor}</p>
                  </div>
                  <span className={STATUS_BADGE[req.status] ?? 'badge-gray'}>{STATUS_LABEL[req.status] ?? req.status}</span>
                </div>

                <div className="text-sm text-gray-600">
                  <span className="text-gray-400">Ngày dự kiến: </span>
                  <strong>{new Date(req.requested_date).toLocaleDateString('vi-VN')}</strong>
                </div>

                {req.reason && <p className="text-sm text-gray-500 italic bg-gray-50 rounded-xl px-3 py-2">&ldquo;{req.reason}&rdquo;</p>}

                {req.rejection_note && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">Lý do từ chối: {req.rejection_note}</p>
                )}

                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => setApproving(req.id)} className="btn-primary flex-1 text-sm py-2">✅ Duyệt</button>
                    <button onClick={() => { setRejecting(req.id); setRejectNote('') }} className="btn-danger flex-1 text-sm py-2">❌ Từ chối</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Confirm approve */}
      <ConfirmDialog
        open={!!approving}
        title="Duyệt yêu cầu chuyển đi?"
        description="Khách sẽ bị xóa khỏi phòng và tài khoản bị khóa sau khi duyệt. Hành động không thể hoàn tác."
        confirmLabel="Duyệt"
        onConfirm={handleApprove}
        onCancel={() => setApproving(null)}
        loading={submitting}
      />

      {/* Dialog từ chối với lý do */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4" style={{ boxShadow: 'var(--shadow-float)' }}>
            <h3 className="font-black text-gray-800 text-lg">Lý do từ chối</h3>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Nhập lý do từ chối để gửi cho khách..."
              rows={3}
              className="input-field w-full resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejecting(null)} className="btn-secondary flex-1" disabled={submitting}>Hủy</button>
              <button onClick={handleReject} className="btn-danger flex-1 flex items-center justify-center gap-2" disabled={submitting || !rejectNote.trim()}>
                {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BackIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
}
