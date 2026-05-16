'use client'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  open, title, description, confirmLabel = 'Xác nhận',
  onConfirm, onCancel, loading = false,
}: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-sm animate-slide-up"
        style={{ boxShadow: 'var(--shadow-float)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon cảnh báo */}
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>

        <h3 className="font-black text-gray-800 text-center text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-400 text-center mb-6">{description}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
