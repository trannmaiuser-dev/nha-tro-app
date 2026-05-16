'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { guestSchema, type GuestInput } from '@/lib/schemas/guest'
import { createGuestAction, deleteGuestAction } from './actions'
import type { Guest } from '@/types'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

export default function TenantGuestsPage() {
  const [guests,    setGuests]    = useState<Guest[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [submitting,setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GuestInput>({
    resolver: zodResolver(guestSchema),
    defaultValues: { number_of_nights: 1 },
  })

  useEffect(() => {
    fetch('/api/tenant/guests')
      .then(r => r.json())
      .then(d => { setGuests(d.guests ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function onSubmit(data: GuestInput) {
    setSubmitting(true)
    const res = await createGuestAction(data)
    setSubmitting(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success('Đã ghi nhận khách đến chơi')
    setModalOpen(false)
    reset()
    // Refresh danh sách
    fetch('/api/tenant/guests').then(r => r.json()).then(d => setGuests(d.guests ?? []))
  }

  async function handleDelete() {
    if (!deleting) return
    setSubmitting(true)
    const res = await deleteGuestAction(deleting)
    setSubmitting(false)
    if (!res.success) { toast.error(res.error); return }
    setGuests(prev => prev.filter(g => g.id !== deleting))
    setDeleting(null)
    toast.success('Đã xóa')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-gray-50 rounded-xl text-gray-400"><BackIcon /></Link>
            <h1 className="text-lg font-black text-gray-800">Khách đến chơi</h1>
          </div>
          <button onClick={() => setModalOpen(true)} className="btn-primary text-sm px-4 py-2">+ Báo</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        <p className="text-xs text-gray-400 bg-blue-50 rounded-xl px-3 py-2">
          💡 Báo trước để chủ trọ biết và camera không nhận diện người lạ trong những đêm đó.
        </p>

        {loading ? (
          <p className="text-center text-gray-400 py-10">Đang tải...</p>
        ) : guests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏠</div>
            <p className="text-gray-400">Chưa có lần báo khách nào</p>
            <button onClick={() => setModalOpen(true)} className="btn-primary mt-4">Báo khách đến chơi</button>
          </div>
        ) : (
          guests.map(g => (
            <div key={g.id} className="card flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800">{g.guest_name}</p>
                <p className="text-sm text-gray-400">{g.number_of_nights} đêm · {new Date(g.created_at).toLocaleDateString('vi-VN')}</p>
                {g.note && <p className="text-xs text-gray-400 mt-1 italic">{g.note}</p>}
              </div>
              <button onClick={() => setDeleting(g.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                <TrashIcon />
              </button>
            </div>
          ))
        )}
      </main>

      {/* Form modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !submitting && setModalOpen(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 animate-slide-up" style={{ boxShadow: 'var(--shadow-float)' }} onClick={e => e.stopPropagation()}>
            <h2 className="font-black text-gray-800 text-lg mb-5">Báo khách đến chơi</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Tên người đến chơi <span className="text-red-400">*</span></label>
                <input {...register('guest_name')} placeholder="Nguyễn Văn B" className={`input-field w-full ${errors.guest_name ? 'error' : ''}`} />
                {errors.guest_name && <p className="text-xs text-red-500 mt-1">{errors.guest_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Số đêm dự kiến <span className="text-red-400">*</span></label>
                <input {...register('number_of_nights', { valueAsNumber: true })} type="number" min={1} max={7} className={`input-field w-full ${errors.number_of_nights ? 'error' : ''}`} />
                {errors.number_of_nights && <p className="text-xs text-red-500 mt-1">{errors.number_of_nights.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1.5">Ghi chú (tùy chọn)</label>
                <input {...register('note')} placeholder="Ghi chú thêm..." className="input-field w-full" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1" disabled={submitting}>Hủy</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={submitting}>
                  {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Gửi báo cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Xóa báo cáo này?"
        description="Lịch sử báo khách sẽ bị xóa."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={submitting}
      />
    </div>
  )
}

function BackIcon() { return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg> }
function TrashIcon() { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg> }
