'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import type { PaymentProof } from '@/types'
import type { OverdueInvoice } from '@/lib/db/invoices'
import DebtBanner from '@/components/DebtBanner'
import PaymentProofCard from './PaymentProofCard'
import PaymentProofForm from './PaymentProofForm'

interface Props {
  proofs:           PaymentProof[]
  overdueInvoices?: OverdueInvoice[]
  roomName?:        string
}

export default function TenantPaymentsClient({ proofs, overdueInvoices = [], roomName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* T-017: Debt banner — đầu page, không có pay button (đã ở trang này) */}
      {overdueInvoices.length > 0 && (
        <div className="mb-4">
          <DebtBanner overdueInvoices={overdueInvoices} roomName={roomName} showPayButton={false} />
        </div>
      )}

      {proofs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-3">💸</p>
          <p className="font-bold text-gray-500">Chưa có báo cáo thanh toán nào</p>
          <p className="text-sm mt-1">Sau khi chuyển khoản, nhấn nút bên dưới để báo cho chủ trọ.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proofs.map(p => (
            <PaymentProofCard key={p.id} proof={p} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 bg-primary-500 hover:bg-primary-600 rounded-full shadow-float text-white flex items-center justify-center"
        aria-label="Báo đã thanh toán"
      >
        <PlusIcon size={24} />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-black text-gray-800 text-lg mb-5">Báo đã thanh toán</h2>
            <PaymentProofForm
              onClose={() => setOpen(false)}
              onSuccess={() => router.refresh()}
            />
          </div>
        </div>
      )}
    </>
  )
}
