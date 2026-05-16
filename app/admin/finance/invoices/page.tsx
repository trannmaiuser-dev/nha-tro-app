import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getInvoices } from '@/lib/db/invoices'
import { getMeterReadingsByMonth } from '@/lib/db/meter-readings'
import InvoiceList from './InvoiceList'
import MonthSelector from '@/app/admin/utilities/MonthSelector'
import type { InvoiceStatus } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { month?: string; year?: string; status?: string }
}

export default async function AdminInvoicesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') redirect('/login')

  const now = new Date()
  const month = Number(searchParams.month) || (now.getMonth() + 1)
  const year  = Number(searchParams.year)  || now.getFullYear()
  const status = searchParams.status as InvoiceStatus | undefined

  const sb = createServerSupabaseClient()
  const [roomsRes, invoices, logs] = await Promise.all([
    sb.from('rooms').select('id, name, floor, status').neq('status', 'maintenance').order('name'),
    getInvoices({ month, year, status }),
    getMeterReadingsByMonth(month, year),
  ])

  const rooms = (roomsRes.data ?? []) as Array<{ id: string; name: string; floor: number }>
  const meterByRoom = Object.fromEntries(logs.map(l => [l.room_id, l]))
  const existingInvoiceRoomIds = invoices.map(i => i.room_id)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-800">Hóa đơn</h1>
              <p className="text-xs text-gray-400">{invoices.length} hóa đơn tháng {month}/{year}</p>
            </div>
          </div>
          <MonthSelector month={month} year={year} basePath="/admin/finance/invoices" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        <InvoiceList
          invoices={invoices}
          rooms={rooms}
          meterByRoom={meterByRoom}
          existingInvoiceRoomIds={existingInvoiceRoomIds}
          defaultMonth={month}
          defaultYear={year}
        />
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
