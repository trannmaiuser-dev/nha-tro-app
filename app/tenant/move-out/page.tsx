'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { createMoveRequestAction, cancelMoveRequestAction } from './actions'
import type { MoveRequest } from '@/types'

export default function MoveOutPage() {
  const [request,    setRequest]    = useState<MoveRequest | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [date,       setDate]       = useState('')
  const [reason,     setReason]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  useEffect(() => {
    fetch('/api/tenant/move-request')
      .then(r => r.json())
      .then(d => { setRequest(d.request ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await createMoveRequestAction({ requested_date: date, reason })
    setSubmitting(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success('Đã gửi yêu cầu chuyển đi')
    window.location.reload()
  }

  async function handleCancel() {
    if (!request) return
    setSubmitting(true)
    const res = await cancelMoveRequestAction(request.id)
    setSubmitting(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success('Đã hủy yêu cầu')
    setRequest(null)
  }

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-gray-400">Đang tải...</span></div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/dashboard" className="p-2 bg-gray-50 rounded-xl text-gray-400"><BackIcon /></Link>
          <h1 className="text-lg font-black text-gray-800">Báo chuyển đi</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {!request ? (
          /* Chưa có yêu cầu — hiển thị form */
          <div className="card space-y-4">
            <div className="bg-orange-50 rounded-2xl p-4 text-sm text-orange-700">
              ⚠️ Sau khi gửi, chủ trọ sẽ xem xét và phản hồi trong vòng 24-48 giờ.
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">
                  Ngày dự kiến chuyển đi <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  min={tomorrow}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Lý do (tùy chọn)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Lý do chuyển đi..."
                  rows={3}
                  className="input-field w-full resize-none"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
                {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Gửi yêu cầu chuyển đi
              </button>
            </form>
          </div>
        ) : request.status === 'pending' ? (
          /* Đang chờ duyệt */
          <div className="card space-y-4">
            <div className="text-center py-4">
              <div className="text-4xl mb-3">⏳</div>
              <h2 className="font-black text-gray-800 text-lg">Đang chờ chủ trọ duyệt</h2>
              <p className="text-sm text-gray-400 mt-1">
                Ngày dự kiến: <strong>{new Date(request.requested_date).toLocaleDateString('vi-VN')}</strong>
              </p>
              {request.reason && <p className="text-sm text-gray-500 mt-2 italic">&ldquo;{request.reason}&rdquo;</p>}
            </div>
            <button onClick={handleCancel} disabled={submitting} className="btn-secondary w-full">
              Hủy yêu cầu
            </button>
          </div>
        ) : request.status === 'rejected' ? (
          /* Bị từ chối */
          <div className="card space-y-4">
            <div className="text-center py-4">
              <div className="text-4xl mb-3">❌</div>
              <h2 className="font-black text-gray-800 text-lg">Yêu cầu bị từ chối</h2>
              {request.rejection_note && (
                <div className="bg-red-50 rounded-2xl p-3 mt-3 text-sm text-red-700 text-left">
                  Lý do: {request.rejection_note}
                </div>
              )}
            </div>
            <button onClick={() => setRequest(null)} className="btn-primary w-full">
              Gửi yêu cầu mới
            </button>
          </div>
        ) : (
          /* Đã được duyệt */
          <div className="card text-center py-8">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="font-black text-gray-800 text-lg">Yêu cầu đã được chấp nhận</h2>
            <p className="text-sm text-gray-400 mt-2">
              Ngày chuyển đi: <strong>{new Date(request.requested_date).toLocaleDateString('vi-VN')}</strong>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function BackIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
}
