'use client'

import { useState } from 'react'

interface Props {
  open:             boolean
  defaultAmount:    number
  invoiceTotal:     number
  invoicePaid:      number
  onConfirm:        (amount: number) => void
  onCancel:         () => void
  loading?:         boolean
}

export default function ApprovePartialDialog({
  open, defaultAmount, invoiceTotal, invoicePaid, onConfirm, onCancel, loading,
}: Props) {
  const [amount, setAmount] = useState<number | ''>(defaultAmount)

  if (!open) return null

  const remaining = invoiceTotal - invoicePaid

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-gray-800 text-lg mb-4">Duyệt 1 phần</h3>

        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Khách báo</span><span className="font-bold">{defaultAmount.toLocaleString('vi-VN')}đ</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Hóa đơn</span><span className="font-bold">{invoiceTotal.toLocaleString('vi-VN')}đ</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Đã trả trước</span><span className="font-bold">{invoicePaid.toLocaleString('vi-VN')}đ</span></div>
          <div className="flex justify-between text-orange-600"><span>Còn lại</span><span className="font-bold">{remaining.toLocaleString('vi-VN')}đ</span></div>
        </div>

        <label className="block text-sm font-bold text-gray-600 mb-1.5">
          Số tiền chủ chấp nhận (VNĐ) <span className="text-red-400">*</span>
        </label>
        <input
          type="number" min={1} step={10000}
          value={amount}
          onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          className="input-field w-full"
          autoFocus
        />
        <p className="text-xs text-gray-400 mt-1">Nhập số tiền thực tế chủ ghi nhận (có thể khác số khách báo).</p>

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} disabled={loading} className="btn-secondary flex-1">Hủy</button>
          <button
            onClick={() => amount !== '' && onConfirm(Number(amount))}
            disabled={loading || amount === '' || Number(amount) <= 0}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  )
}
