/**
 * T-017 DebtBanner — banner đỏ hiện khi tenant có hóa đơn quá hạn.
 *
 * Props:
 *   - overdueInvoices: list invoices đang has_debt (server fetch)
 *   - roomName: tên phòng (vd 'P101')
 *
 * Behavior:
 *   - Hiện total amount nợ (sum remaining từng invoice)
 *   - List ngắn: vd "Tháng 5/2026: 4.000.000đ"
 *   - Button "Báo đã chuyển khoản" → link /tenant/payments (tái dụng flow T-014 submitPaymentProof)
 *
 * Pure presentation — không có state hoặc action. Reusable cho TenantDashboard + TenantPaymentsClient.
 */
'use client'

import Link from 'next/link'
import type { OverdueInvoice } from '@/lib/db/invoices'

interface Props {
  overdueInvoices: OverdueInvoice[]
  roomName?: string
  showPayButton?: boolean
}

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ'
}

function overdueDays(dueDate: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400_000))
}

export default function DebtBanner({ overdueInvoices, roomName, showPayButton = true }: Props) {
  if (overdueInvoices.length === 0) return null

  const totalRemaining = overdueInvoices.reduce(
    (sum, inv) => sum + Math.max(0, inv.total - (inv.paid_amount ?? 0)),
    0,
  )
  const maxOverdue = Math.max(...overdueInvoices.map(inv => overdueDays(inv.due_date)))

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 space-y-3" role="alert">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0" aria-hidden>🔴</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-red-700 text-base">
            Hóa đơn quá hạn{roomName ? ` — phòng ${roomName}` : ''}
          </h3>
          <p className="text-sm text-red-600 mt-0.5">
            {overdueInvoices.length} hóa đơn quá hạn, tổng <strong>{formatVND(totalRemaining)}</strong>
            {maxOverdue > 0 ? ` (trễ ${maxOverdue} ngày)` : ''}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 ml-9">
        {overdueInvoices.map(inv => {
          const remaining = Math.max(0, inv.total - (inv.paid_amount ?? 0))
          const days = overdueDays(inv.due_date)
          return (
            <li key={inv.id} className="text-sm text-red-700 flex justify-between gap-3">
              <span>Tháng {inv.month}/{inv.year}{days > 0 ? ` (trễ ${days} ngày)` : ''}</span>
              <span className="font-bold whitespace-nowrap">{formatVND(remaining)}</span>
            </li>
          )
        })}
      </ul>

      {showPayButton && (
        <Link
          href="/tenant/payments"
          className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition"
        >
          Báo đã chuyển khoản →
        </Link>
      )}
    </div>
  )
}
