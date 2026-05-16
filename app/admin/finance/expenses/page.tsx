import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getExpenses } from '@/lib/db/expenses'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ExpensesClient from './ExpensesClient'
import type { ExpenseType } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { type?: string; from?: string; to?: string }
}

export default async function AdminExpensesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') redirect('/login')

  const expenseType = (['repair', 'maintenance', 'purchase', 'general', 'other'].includes(searchParams.type ?? '')
    ? (searchParams.type as ExpenseType)
    : undefined)

  const sb = createServerSupabaseClient()
  const [expenses, roomsRes] = await Promise.all([
    getExpenses({
      expense_type: expenseType,
      date_from:    searchParams.from,
      date_to:      searchParams.to,
    }),
    sb.from('rooms').select('id, name').order('name'),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-800">Chi phí</h1>
            <p className="text-xs text-gray-400">{expenses.length} khoản chi</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6">
        <ExpensesClient expenses={expenses} rooms={roomsRes.data ?? []} />
      </main>
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
