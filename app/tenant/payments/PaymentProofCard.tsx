'use client'

import type { PaymentProof } from '@/types'
import ImageCarousel from '@/components/ui/ImageCarousel'

interface Props {
  proof: PaymentProof
}

const STATUS_CONFIG = {
  pending:             { label: '🕒 Chờ duyệt',    cls: 'badge-orange' },
  approved:            { label: '✅ Đã duyệt',     cls: 'badge-green' },
  partially_approved:  { label: '⚠️ Duyệt 1 phần', cls: 'badge-orange' },
  rejected:            { label: '❌ Bị từ chối',  cls: 'badge-gray' },
} as const

export default function PaymentProofCard({ proof }: Props) {
  const cfg = STATUS_CONFIG[proof.status]
  const month = proof.invoice?.month
  const year  = proof.invoice?.year

  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400">Hóa đơn</p>
          <p className="font-black text-gray-800">Tháng {month}/{year}</p>
        </div>
        <span className={cfg.cls}>{cfg.label}</span>
      </div>

      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-gray-500">Số tiền đã báo</span>
        <span className="font-bold text-gray-800">{proof.amount_reported.toLocaleString('vi-VN')}đ</span>
      </div>

      {proof.amount_approved != null && proof.amount_approved !== proof.amount_reported && (
        <div className="flex items-center justify-between text-sm mb-3 text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5">
          <span>Số tiền chủ ghi nhận</span>
          <span className="font-bold">{proof.amount_approved.toLocaleString('vi-VN')}đ</span>
        </div>
      )}

      {proof.note && (
        <p className="text-sm text-gray-600 italic mb-3 border-l-2 border-gray-200 pl-3">
          {proof.note}
        </p>
      )}

      {proof.proof_images.length > 0 && (
        <div className="mb-3">
          <ImageCarousel images={proof.proof_images} thumbSize={64} />
        </div>
      )}

      {proof.status === 'rejected' && proof.rejection_note && (
        <div className="bg-red-50 rounded-lg px-3 py-2 text-sm">
          <p className="text-xs text-red-500 font-bold mb-0.5">Lý do từ chối:</p>
          <p className="text-red-700">{proof.rejection_note}</p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        {new Date(proof.created_at).toLocaleString('vi-VN')}
      </p>
    </div>
  )
}
