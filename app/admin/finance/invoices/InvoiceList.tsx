'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import type { Invoice, Room, ElectricityLog, InvoiceStatus } from '@/types'
import { deleteInvoiceAction } from './actions'
import CreateInvoicesWizard from './CreateInvoicesWizard'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Props {
  invoices:               Invoice[]
  rooms:                  Pick<Room, 'id' | 'name' | 'floor'>[]
  meterByRoom:            Record<string, ElectricityLog>
  existingInvoiceRoomIds: string[]
  defaultMonth:           number
  defaultYear:            number
}

const STATUS_LABEL: Record<InvoiceStatus, { label: string; cls: string }> = {
  unpaid:         { label: 'Chưa thanh toán', cls: 'badge-orange' },
  partially_paid: { label: 'Trả 1 phần',      cls: 'badge-orange' },
  paid:           { label: 'Đã thanh toán',   cls: 'badge-green' },
}

export default function InvoiceList({
  invoices, rooms, meterByRoom, existingInvoiceRoomIds, defaultMonth, defaultYear,
}: Props) {
  const router = useRouter()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete() {
    if (!deletingId) return
    setSubmitting(true)
    const res = await deleteInvoiceAction(deletingId)
    setSubmitting(false)
    if (res.success) {
      toast.success('Đã xóa hóa đơn')
      setDeletingId(null)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setWizardOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon size={16} />
          Tạo hóa đơn tháng {defaultMonth}/{defaultYear}
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">🧾</p>
          <p className="font-bold text-gray-500">Chưa có hóa đơn nào</p>
          <p className="text-sm mt-1">Click nút &ldquo;Tạo hóa đơn&rdquo; để bắt đầu.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card per invoice (T-044) */}
          <div className="md:hidden space-y-3">
            {invoices.map(inv => {
              const st = STATUS_LABEL[inv.status]
              return (
                <div key={inv.id} className="card space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-800">Phòng {inv.room?.name ?? '—'}</h3>
                      <p className="text-xs text-gray-400">Tháng {inv.month}/{inv.year} · Hạn {new Date(inv.due_date).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <span className={st.cls + ' shrink-0'}>{st.label}</span>
                  </div>

                  <div className="flex items-baseline gap-3 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs">Tổng: </span>
                      <span className="font-black text-gray-800">{inv.total.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Đã trả: </span>
                      <span className="text-gray-600">{inv.paid_amount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Link
                      href={`/admin/finance/invoices/${inv.id}`}
                      className="btn-secondary flex-1 text-sm py-2 text-center"
                    >
                      Xem chi tiết
                    </Link>
                    {inv.status === 'unpaid' && (
                      <button
                        onClick={() => setDeletingId(inv.id)}
                        className="text-sm px-4 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 shrink-0"
                        title="Xóa"
                      >
                        <Trash2Icon size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                <tr>
                  <th className="px-3 py-3 text-left">Phòng</th>
                  <th className="px-3 py-3 text-left">Tháng</th>
                  <th className="px-3 py-3 text-right">Tổng</th>
                  <th className="px-3 py-3 text-right">Đã trả</th>
                  <th className="px-3 py-3 text-center">Trạng thái</th>
                  <th className="px-3 py-3 text-left">Hạn</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const st = STATUS_LABEL[inv.status]
                  return (
                    <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-bold text-gray-700">{inv.room?.name ?? '—'}</td>
                      <td className="px-3 py-2.5">{inv.month}/{inv.year}</td>
                      <td className="px-3 py-2.5 text-right font-bold">{inv.total.toLocaleString('vi-VN')}đ</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{inv.paid_amount.toLocaleString('vi-VN')}đ</td>
                      <td className="px-3 py-2.5 text-center"><span className={st.cls}>{st.label}</span></td>
                      <td className="px-3 py-2.5 text-gray-500">
                        {new Date(inv.due_date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex gap-1 justify-end">
                          <Link
                            href={`/admin/finance/invoices/${inv.id}`}
                            className="text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded-lg font-bold hover:bg-primary-100"
                          >
                            Xem
                          </Link>
                          {inv.status === 'unpaid' && (
                            <button
                              onClick={() => setDeletingId(inv.id)}
                              className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                              title="Xóa"
                            >
                              <Trash2Icon size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CreateInvoicesWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => router.refresh()}
        defaultMonth={defaultMonth}
        defaultYear={defaultYear}
        rooms={rooms}
        meterByRoom={meterByRoom}
        existingInvoiceRoomIds={new Set(existingInvoiceRoomIds)}
      />

      <ConfirmDialog
        open={!!deletingId}
        title="Xóa hóa đơn?"
        description="Hành động này không thể hoàn tác. Chỉ được xóa nếu chưa có bằng chứng thanh toán."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => { if (!submitting) setDeletingId(null) }}
        loading={submitting}
      />
    </div>
  )
}
