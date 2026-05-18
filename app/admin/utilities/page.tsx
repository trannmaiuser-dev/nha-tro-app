import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMeterReadingsByMonth, getPreviousReading } from '@/lib/db/meter-readings'
import { getSetting } from '@/lib/db/settings'
import MeterReadingTable from './MeterReadingTable'
import MonthSelector from './MonthSelector'
import type { WaterBillingMode } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { month?: string; year?: string }
}

export default async function AdminUtilitiesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') redirect('/login')

  const now = new Date()
  const month = Number(searchParams.month) || (now.getMonth() + 1)
  const year  = Number(searchParams.year)  || now.getFullYear()

  const sb = createServerSupabaseClient()
  const [roomsRes, logs, waterMode] = await Promise.all([
    sb.from('rooms')
      .select('id, name, floor, status')
      .neq('status', 'maintenance')
      .order('name'),
    getMeterReadingsByMonth(month, year),
    getSetting<WaterBillingMode>('water_billing_mode'),
  ])

  const rooms = (roomsRes.data ?? []) as Array<{ id: string; name: string; floor: number }>

  // Fetch previous-month readings for auto-fill
  const prevEntries = await Promise.all(
    rooms.map(async r => {
      const prev = await getPreviousReading(r.id, month, year)
      return [r.id, prev] as const
    })
  )
  const prevMonthLogs = Object.fromEntries(
    prevEntries
      .filter(([, p]) => p != null)
      .map(([id, p]) => [id, { curr_kwh: p!.prev_kwh, curr_water_m3: p!.prev_water_m3 }]),
  )

  const filledCount = logs.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 shrink-0">
              <BackIcon />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-gray-800 truncate">Chỉ số điện nước</h1>
              <p className="text-xs text-gray-400">{filledCount}/{rooms.length} phòng đã nhập</p>
            </div>
          </div>
          <div className="self-end sm:self-auto">
            <MonthSelector month={month} year={year} basePath="/admin/utilities" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        {rooms.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Chưa có phòng nào để nhập chỉ số.
          </div>
        ) : (
          <MeterReadingTable
            month={month}
            year={year}
            rooms={rooms}
            currentMonthLogs={logs}
            prevMonthLogs={prevMonthLogs}
            waterMode={waterMode ?? 'per_m3'}
          />
        )}
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
