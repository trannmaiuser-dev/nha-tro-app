'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import type { Expense, ExpenseType, Room } from '@/types'
import ExpenseForm from './ExpenseForm'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ImageCarousel from '@/components/ui/ImageCarousel'
import { deleteExpenseAction } from './actions'

interface Props {
  expenses: Expense[]
  rooms:    Pick<Room, 'id' | 'name'>[]
}

const TYPE_LABEL: Record<ExpenseType, string> = {
  repair:      'Sửa chữa',
  maintenance: 'Bảo trì',
  purchase:    'Mua sắm',
  general:     'Chi phí chung',
  other:       'Khác',
}

const TYPE_BADGE: Record<ExpenseType, string> = {
  repair:      'badge-orange',
  maintenance: 'badge-green',
  purchase:    'badge-gray',
  general:     'badge-gray',
  other:       'badge-gray',
}

export default function ExpensesClient({ expenses, rooms }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!deletingId) return
    setBusy(true)
    const res = await deleteExpenseAction(deletingId)
    setBusy(false)
    if (res.success) {
      toast.success('Đã xóa')
      setDeletingId(null)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="bg-white rounded-2xl shadow-soft px-4 py-2.5">
          <p className="text-xs text-gray-400">Tổng chi</p>
          <p className="font-black text-lg text-red-500">{total.toLocaleString('vi-VN')}đ</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon size={16} />
          Thêm chi phí
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">💸</p>
          <p className="font-bold text-gray-500">Chưa có chi phí nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white rounded-2xl shadow-soft p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={TYPE_BADGE[exp.expense_type]}>{TYPE_LABEL[exp.expense_type]}</span>
                  {exp.room ? (
                    <span className="text-xs text-gray-500">• Phòng {exp.room.name}</span>
                  ) : (
                    <span className="text-xs text-gray-500">• Toàn nhà</span>
                  )}
                </div>
                <span className="font-black text-red-500">{exp.amount.toLocaleString('vi-VN')}đ</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{exp.description}</p>
              {exp.receipt_images.length > 0 && (
                <div className="mb-2">
                  <ImageCarousel images={exp.receipt_images} thumbSize={56} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{new Date(exp.expense_date).toLocaleDateString('vi-VN')}</p>
                <button
                  onClick={() => setDeletingId(exp.id)}
                  className="text-red-400 hover:text-red-600 p-1"
                  aria-label="Xóa"
                >
                  <Trash2Icon size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-0 sm:p-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl my-0 sm:my-8 p-6 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-black text-gray-800 text-lg mb-5">Thêm chi phí</h2>
            <ExpenseForm
              rooms={rooms}
              onClose={() => setOpen(false)}
              onSuccess={() => router.refresh()}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Xóa chi phí này?"
        description="Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => { if (!busy) setDeletingId(null) }}
        loading={busy}
      />
    </div>
  )
}
