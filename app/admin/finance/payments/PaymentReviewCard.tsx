'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { PaymentProof } from '@/types'
import ImageCarousel from '@/components/ui/ImageCarousel'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ApprovePartialDialog from './ApprovePartialDialog'
import RejectDialog from './RejectDialog'
import {
  approveFullAction,
  approvePartialAction,
  rejectAction,
} from './actions'
import { useRouter } from 'next/navigation'

interface Props {
  proof: PaymentProof
}

export default function PaymentReviewCard({ proof }: Props) {
  const router = useRouter()
  const [busy,        setBusy]        = useState(false)
  const [fullOpen,    setFullOpen]    = useState(false)
  const [partialOpen, setPartialOpen] = useState(false)
  const [rejectOpen,  setRejectOpen]  = useState(false)

  const invoice = proof.invoice
  const total   = invoice?.total       ?? 0
  const paid    = invoice?.paid_amount ?? 0
  const remain  = total - paid

  async function doApproveFull() {
    setBusy(true)
    const res = await approveFullAction(proof.id)
    setBusy(false)
    if (res.success) { toast.success('Đã duyệt'); router.refresh() }
    else { toast.error(res.error) }
    setFullOpen(false)
  }
  async function doApprovePartial(amount: number) {
    setBusy(true)
    const res = await approvePartialAction({ proof_id: proof.id, amount_approved: amount })
    setBusy(false)
    if (res.success) { toast.success('Đã duyệt 1 phần'); router.refresh() }
    else { toast.error(res.error) }
    setPartialOpen(false)
  }
  async function doReject(note: string) {
    setBusy(true)
    const res = await rejectAction({ proof_id: proof.id, rejection_note: note })
    setBusy(false)
    if (res.success) { toast.success('Đã từ chối'); router.refresh() }
    else { toast.error(res.error) }
    setRejectOpen(false)
  }

  const isPending = proof.status === 'pending'

  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-black text-gray-800">{proof.tenant?.full_name ?? '—'}</p>
          <p className="text-xs text-gray-400">
            {proof.tenant?.phone} • Phòng {invoice?.room?.name ?? '—'} • Tháng {invoice?.month}/{invoice?.year}
          </p>
        </div>
        <span className={`badge-${proof.status === 'approved' ? 'green' : proof.status === 'rejected' ? 'gray' : 'orange'}`}>
          {proof.status === 'pending' ? 'Chờ duyệt' :
           proof.status === 'approved' ? 'Đã duyệt' :
           proof.status === 'rejected' ? 'Từ chối' : 'Duyệt 1 phần'}
        </span>
      </div>

      <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Khách báo</span><span className="font-bold">{proof.amount_reported.toLocaleString('vi-VN')}đ</span></div>
        {invoice && (
          <>
            <div className="flex justify-between"><span className="text-gray-500">Hóa đơn</span><span>{total.toLocaleString('vi-VN')}đ</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Đã trả trước</span><span>{paid.toLocaleString('vi-VN')}đ</span></div>
            <div className="flex justify-between text-orange-600"><span>Còn lại</span><span className="font-bold">{remain.toLocaleString('vi-VN')}đ</span></div>
          </>
        )}
      </div>

      {proof.note && (
        <p className="text-sm text-gray-600 italic mb-3 border-l-2 border-gray-200 pl-3">
          {proof.note}
        </p>
      )}

      {proof.proof_images.length > 0 && (
        <div className="mb-3">
          <ImageCarousel images={proof.proof_images} thumbSize={72} />
        </div>
      )}

      {!isPending && proof.amount_approved != null && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5 mb-2">
          Chủ đã ghi nhận: <strong>{proof.amount_approved.toLocaleString('vi-VN')}đ</strong>
        </p>
      )}
      {proof.status === 'rejected' && proof.rejection_note && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 mb-2">
          Lý do từ chối: {proof.rejection_note}
        </p>
      )}

      {isPending && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <button
            onClick={() => setFullOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl py-2 text-sm"
            disabled={busy}
          >
            Duyệt đủ
          </button>
          <button
            onClick={() => setPartialOpen(true)}
            className="bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-xl py-2 text-sm"
            disabled={busy}
          >
            Duyệt 1 phần
          </button>
          <button
            onClick={() => setRejectOpen(true)}
            className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl py-2 text-sm"
            disabled={busy}
          >
            Từ chối
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Gửi: {new Date(proof.created_at).toLocaleString('vi-VN')}
        {proof.reviewed_at && ` • Duyệt: ${new Date(proof.reviewed_at).toLocaleString('vi-VN')}`}
      </p>

      <ConfirmDialog
        open={fullOpen}
        title={`Duyệt ${proof.amount_reported.toLocaleString('vi-VN')}đ?`}
        description="Số tiền này sẽ được cộng vào hóa đơn. Thao tác này không thể hoàn tác."
        confirmLabel="Duyệt"
        onConfirm={doApproveFull}
        onCancel={() => setFullOpen(false)}
        loading={busy}
      />
      <ApprovePartialDialog
        open={partialOpen}
        defaultAmount={proof.amount_reported}
        invoiceTotal={total}
        invoicePaid={paid}
        onConfirm={doApprovePartial}
        onCancel={() => setPartialOpen(false)}
        loading={busy}
      />
      <RejectDialog
        open={rejectOpen}
        onConfirm={doReject}
        onCancel={() => setRejectOpen(false)}
        loading={busy}
      />
    </div>
  )
}
