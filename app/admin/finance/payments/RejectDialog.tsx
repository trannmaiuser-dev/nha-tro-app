'use client'

import { useState } from 'react'

interface Props {
  open:      boolean
  onConfirm: (note: string) => void
  onCancel:  () => void
  loading?:  boolean
}

export default function RejectDialog({ open, onConfirm, onCancel, loading }: Props) {
  const [note, setNote] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-gray-800 text-lg mb-2">Từ chối bằng chứng</h3>
        <p className="text-sm text-gray-400 mb-4">
          Khách thuê sẽ nhận thông báo với lý do bên dưới.
        </p>

        <label className="block text-sm font-bold text-gray-600 mb-1.5">
          Lý do từ chối <span className="text-red-400">*</span>
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          className="input-field w-full resize-none"
          placeholder="Vd: Ảnh sao kê mờ, không đọc được số tài khoản..."
          autoFocus
        />

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} disabled={loading} className="btn-secondary flex-1">Hủy</button>
          <button
            onClick={() => note.trim() && onConfirm(note.trim())}
            disabled={loading || !note.trim()}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Từ chối
          </button>
        </div>
      </div>
    </div>
  )
}
