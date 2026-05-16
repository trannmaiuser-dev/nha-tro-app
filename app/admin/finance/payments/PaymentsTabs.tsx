'use client'

import Link from 'next/link'

interface Props {
  active: 'pending' | 'approved' | 'rejected' | 'all'
  counts: { pending: number; approved: number; rejected: number; all: number }
}

const TABS = [
  { id: 'pending',  label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'all',      label: 'Tất cả' },
] as const

export default function PaymentsTabs({ active, counts }: Props) {
  return (
    <div className="bg-white rounded-2xl p-1.5 shadow-soft flex gap-1 mb-4 overflow-x-auto">
      {TABS.map(t => (
        <Link
          key={t.id}
          href={`/admin/finance/payments?status=${t.id}`}
          className={`flex-1 min-w-[80px] py-2 px-3 rounded-xl text-sm font-bold text-center transition whitespace-nowrap ${
            active === t.id
              ? 'bg-primary-500 text-white'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {t.label}
          <span className="ml-1 text-xs opacity-70">({counts[t.id]})</span>
        </Link>
      ))}
    </div>
  )
}
