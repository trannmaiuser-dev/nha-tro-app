import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getFinanceReport } from '@/lib/db/finance-report'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ReportFilters from './ReportFilters'
import type { ExpenseType } from '@/types'

export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<ExpenseType, string> = {
  repair: 'Sửa chữa', maintenance: 'Bảo trì', purchase: 'Mua sắm', general: 'Chi phí chung', other: 'Khác',
}

interface PageProps {
  searchParams: { from?: string; to?: string; room_id?: string }
}

export default async function FinanceReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') redirect('/login')

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const defaultTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const from = searchParams.from || defaultFrom
  const to   = searchParams.to   || defaultTo
  const room_id = searchParams.room_id || undefined

  const sb = createServerSupabaseClient()
  const [report, roomsRes] = await Promise.all([
    getFinanceReport({ date_from: from, date_to: to, room_id }),
    sb.from('rooms').select('id, name').order('name'),
  ])

  const rooms = roomsRes.data ?? []

  const maxRevenue = Math.max(...report.revenue_by_room.map(r => r.amount), 0)
  const maxExpense = Math.max(...Object.values(report.expenses_by_type), 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-800">Báo cáo thu chi</h1>
            <p className="text-xs text-gray-400">
              {new Date(from).toLocaleDateString('vi-VN')} → {new Date(to).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        <ReportFilters defaultFrom={from} defaultTo={to} defaultRoom={room_id ?? ''} rooms={rooms} />

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Tổng thu"   value={report.total_revenue}  color="green" />
          <StatCard label="Tổng chi"   value={report.total_expenses} color="red" />
          <StatCard label="Lợi nhuận"  value={report.profit}         color={report.profit >= 0 ? 'blue' : 'red'} />
          <StatCard
            label={`Chưa thu (${report.unpaid_count} HĐ)`}
            value={report.unpaid_amount}
            color="orange"
          />
        </div>

        {/* Breakdown by room + by type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <section className="bg-white rounded-2xl shadow-soft p-4">
            <h2 className="font-bold text-gray-700 mb-3">Thu theo phòng</h2>
            {report.revenue_by_room.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có khoản thu nào trong khoảng này</p>
            ) : (
              <div className="space-y-2">
                {report.revenue_by_room.map(r => (
                  <div key={r.room_id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-gray-700">Phòng {r.room_name}</span>
                      <span className="font-bold text-green-600">{r.amount.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400"
                        style={{ width: maxRevenue > 0 ? `${(r.amount / maxRevenue) * 100}%` : '0' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-soft p-4">
            <h2 className="font-bold text-gray-700 mb-3">Chi theo loại</h2>
            {report.total_expenses === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Không có chi phí nào</p>
            ) : (
              <div className="space-y-2">
                {(Object.entries(report.expenses_by_type) as [ExpenseType, number][])
                  .filter(([, v]) => v > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([t, v]) => (
                    <div key={t}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-gray-700">{TYPE_LABEL[t]}</span>
                        <span className="font-bold text-red-500">{v.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400"
                          style={{ width: maxExpense > 0 ? `${(v / maxExpense) * 100}%` : '0' }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>

        {/* Unpaid invoices */}
        {report.unpaid_invoices.length > 0 && (
          <section className="bg-white rounded-2xl shadow-soft p-4 mb-4">
            <h2 className="font-bold text-gray-700 mb-3">Hóa đơn chưa thu</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 text-xs font-bold uppercase">
                  <tr>
                    <th className="py-2 text-left">Phòng</th>
                    <th className="py-2 text-left">Tháng</th>
                    <th className="py-2 text-right">Tổng</th>
                    <th className="py-2 text-right">Còn lại</th>
                    <th className="py-2 text-left">Hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {report.unpaid_invoices.map(inv => (
                    <tr key={inv.id} className="border-t border-gray-100">
                      <td className="py-2 font-bold">{inv.room?.name ?? '—'}</td>
                      <td className="py-2">{inv.month}/{inv.year}</td>
                      <td className="py-2 text-right">{inv.total.toLocaleString('vi-VN')}đ</td>
                      <td className="py-2 text-right font-bold text-orange-500">
                        {(inv.total - inv.paid_amount).toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-2 text-gray-500">{new Date(inv.due_date).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tabs Thu / Chi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-2xl shadow-soft p-4">
            <h2 className="font-bold text-gray-700 mb-3">Chi tiết khoản thu ({report.invoices.length})</h2>
            {report.invoices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có khoản thu nào</p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {report.invoices.map(inv => (
                  <div key={inv.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                    <div>
                      <p className="font-bold text-gray-700">Phòng {inv.room?.name} — Tháng {inv.month}/{inv.year}</p>
                      <p className="text-xs text-gray-400">{inv.paid_at && new Date(inv.paid_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <span className="font-bold text-green-600">{inv.paid_amount.toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-soft p-4">
            <h2 className="font-bold text-gray-700 mb-3">Chi tiết khoản chi ({report.expenses.length})</h2>
            {report.expenses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có khoản chi nào</p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {report.expenses.map(e => (
                  <div key={e.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                    <div>
                      <p className="font-bold text-gray-700">{TYPE_LABEL[e.expense_type]} • {e.room?.name ? `Phòng ${e.room.name}` : 'Toàn nhà'}</p>
                      <p className="text-xs text-gray-400">{e.description}</p>
                      <p className="text-xs text-gray-400">{new Date(e.expense_date).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <span className="font-bold text-red-500">{e.amount.toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'green' | 'red' | 'blue' | 'orange' }) {
  const colorMap = {
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-700',
    blue:   'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
  }
  return (
    <div className={`${colorMap[color]} rounded-2xl p-4 shadow-soft`}>
      <p className="text-xs font-bold opacity-80">{label}</p>
      <p className="text-xl font-black mt-1">{value.toLocaleString('vi-VN')}đ</p>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
