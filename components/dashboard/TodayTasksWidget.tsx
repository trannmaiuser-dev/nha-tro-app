'use client'

/**
 * T-038 — Widget "Việc cần làm hôm nay" cho owner dashboard.
 *
 * Requirements §4: dashboard chủ trọ hiển thị "Danh sách việc cần làm hôm nay
 * (nhắc lịch, thu tiền...)". Aggregate 4 nguồn:
 *   1. Hóa đơn quá hạn — has_debt=true
 *   2. Yêu cầu chuyển phòng/move-out đang chờ duyệt
 *   3. Báo thanh toán đang chờ duyệt
 *   4. Hôm nay là ngày chốt chỉ số (meter_reading_day)
 *
 * Pure presentation — server pre-fetch counts, widget chỉ render link.
 */
import Link from 'next/link'
import { AlertCircle, ArrowRightCircle, ReceiptText, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface TodayTasksData {
  overdueInvoicesCount: number
  overdueTotalAmount:   number
  pendingMoveCount:     number
  pendingProofCount:    number
  isMeterReadingDay:    boolean
  meterReadingDay:      number
}

interface Props {
  data: TodayTasksData
}

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ'
}

export default function TodayTasksWidget({ data }: Props) {
  const { overdueInvoicesCount, overdueTotalAmount, pendingMoveCount, pendingProofCount, isMeterReadingDay, meterReadingDay } = data
  const totalCount = overdueInvoicesCount + pendingMoveCount + pendingProofCount + (isMeterReadingDay ? 1 : 0)

  if (totalCount === 0) {
    return (
      <div className="card bg-gradient-to-br from-primary-50 to-white border-2 border-primary-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-xl">✨</div>
          <div>
            <h3 className="font-black text-gray-800">Việc cần làm hôm nay</h3>
            <p className="text-xs text-gray-500">Chưa có việc nào — chúc một ngày bình yên!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-gray-800">📋 Việc cần làm hôm nay</h3>
        <span className="badge-orange">{totalCount} việc</span>
      </div>
      <div className="space-y-2">
        {overdueInvoicesCount > 0 && (
          <TaskRow
            href="/admin/finance/invoices"
            Icon={AlertCircle}
            tone="red"
            title={`${overdueInvoicesCount} hóa đơn quá hạn`}
            hint={overdueTotalAmount > 0 ? `Tổng chưa thu: ${formatVND(overdueTotalAmount)}` : undefined}
          />
        )}
        {pendingProofCount > 0 && (
          <TaskRow
            href="/admin/finance/payments"
            Icon={ReceiptText}
            tone="amber"
            title={`${pendingProofCount} báo thanh toán chờ duyệt`}
          />
        )}
        {pendingMoveCount > 0 && (
          <TaskRow
            href="/admin/move-requests"
            Icon={ArrowRightCircle}
            tone="blue"
            title={`${pendingMoveCount} yêu cầu chuyển phòng chờ duyệt`}
          />
        )}
        {isMeterReadingDay && (
          <TaskRow
            href="/admin/utilities"
            Icon={Zap}
            tone="primary"
            title={`Hôm nay (ngày ${meterReadingDay}) là hạn chốt chỉ số điện nước`}
          />
        )}
      </div>
    </div>
  )
}

const TONE_CLS = {
  red:     { bg: 'bg-red-50',     icon: 'text-red-500',     hover: 'hover:bg-red-100' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-500',   hover: 'hover:bg-amber-100' },
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-500',    hover: 'hover:bg-blue-100' },
  primary: { bg: 'bg-primary-50', icon: 'text-primary-600', hover: 'hover:bg-primary-100' },
} as const

function TaskRow({ href, Icon, tone, title, hint }: { href: string; Icon: LucideIcon; tone: keyof typeof TONE_CLS; title: string; hint?: string }) {
  const cls = TONE_CLS[tone]
  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${cls.bg} ${cls.hover} transition`}
    >
      <Icon size={20} className={`${cls.icon} shrink-0 mt-0.5`} strokeWidth={1.75} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-800">{title}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <span className="text-gray-300 self-center">›</span>
    </Link>
  )
}
