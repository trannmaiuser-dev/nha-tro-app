import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Expense, ExpenseType, Invoice, InvoiceStatus } from '@/types'

export interface FinanceReportFilters {
  date_from: string  // YYYY-MM-DD
  date_to:   string  // YYYY-MM-DD
  room_id?:  string  // optional
}

export interface FinanceReport {
  range:               { from: string; to: string }
  total_revenue:       number  // Tổng đã thu (sum paid_amount, filter by paid_at)
  total_expenses:      number  // Tổng đã chi
  profit:              number
  unpaid_count:        number  // số hóa đơn chưa thu (unpaid + partially_paid)
  unpaid_amount:       number  // tổng số tiền còn nợ
  revenue_by_room:     Array<{ room_id: string; room_name: string; amount: number }>
  expenses_by_type:    Record<ExpenseType, number>
  invoices:            Invoice[]
  expenses:            Expense[]
  unpaid_invoices:     Invoice[]
}

export async function getFinanceReport(filters: FinanceReportFilters): Promise<FinanceReport> {
  const sb = createServerSupabaseClient()
  const { date_from, date_to, room_id } = filters

  // ─── Invoices đã thu trong khoảng (theo paid_at) ─────────
  let revQ = sb
    .from('invoices')
    .select('*, room:rooms(id, name, floor)')
    .gte('paid_at', date_from + 'T00:00:00')
    .lte('paid_at', date_to + 'T23:59:59')
  if (room_id) revQ = revQ.eq('room_id', room_id)
  const { data: revInvoices, error: revErr } = await revQ
  if (revErr) throw new Error('Lỗi tải doanh thu: ' + revErr.message)

  const paidInvoices = (revInvoices ?? []) as Invoice[]
  const total_revenue = paidInvoices.reduce((s, i) => s + (i.paid_amount ?? 0), 0)

  // ─── Expenses trong khoảng ──────────────────────────────
  let expQ = sb
    .from('expenses')
    .select('*, room:rooms(id, name)')
    .gte('expense_date', date_from)
    .lte('expense_date', date_to)
  if (room_id) {
    // KHI filter theo phòng: include expenses của phòng đó VÀ "toàn nhà" (room_id NULL)
    expQ = expQ.or(`room_id.eq.${room_id},room_id.is.null`)
  }
  const { data: expsRaw, error: expErr } = await expQ
  if (expErr) throw new Error('Lỗi tải chi phí: ' + expErr.message)
  const expenses = (expsRaw ?? []) as Expense[]
  const total_expenses = expenses.reduce((s, e) => s + e.amount, 0)

  // ─── Hóa đơn chưa thu (trong khoảng theo due_date hoặc tất cả unpaid) ─
  let unpaidQ = sb
    .from('invoices')
    .select('*, room:rooms(id, name)')
    .in('status', ['unpaid', 'partially_paid'])
  if (room_id) unpaidQ = unpaidQ.eq('room_id', room_id)
  const { data: unpaidRaw } = await unpaidQ
  const unpaid_invoices = (unpaidRaw ?? []) as Invoice[]
  const unpaid_amount = unpaid_invoices.reduce((s, i) => s + Math.max(0, i.total - i.paid_amount), 0)

  // ─── Breakdown revenue by room ──────────────────────────
  const revenueMap = new Map<string, { room_name: string; amount: number }>()
  for (const inv of paidInvoices) {
    const rid = inv.room?.id ?? inv.room_id
    const name = inv.room?.name ?? 'Không rõ'
    const cur = revenueMap.get(rid) ?? { room_name: name, amount: 0 }
    cur.amount += inv.paid_amount ?? 0
    revenueMap.set(rid, cur)
  }
  const revenue_by_room = Array.from(revenueMap.entries())
    .map(([id, v]) => ({ room_id: id, room_name: v.room_name, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount)

  // ─── Breakdown expenses by type ─────────────────────────
  const expenses_by_type: Record<ExpenseType, number> = {
    repair:      0,
    maintenance: 0,
    purchase:    0,
    general:     0,
    other:       0,
  }
  for (const e of expenses) {
    expenses_by_type[e.expense_type] += e.amount
  }

  void ({} as InvoiceStatus) // type unused but kept in import for clarity

  return {
    range: { from: date_from, to: date_to },
    total_revenue,
    total_expenses,
    profit:           total_revenue - total_expenses,
    unpaid_count:     unpaid_invoices.length,
    unpaid_amount,
    revenue_by_room,
    expenses_by_type,
    invoices:         paidInvoices,
    expenses,
    unpaid_invoices,
  }
}
