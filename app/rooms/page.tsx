import Link from 'next/link'
import { getAllRoomsWithTenants } from '@/lib/db/rooms'
import { getSetting } from '@/lib/db/settings'
import RoomList from '@/components/rooms/RoomList'

export const dynamic = 'force-dynamic'

export default async function RoomsPage() {
  const [rooms, defaultElectricityRate] = await Promise.all([
    getAllRoomsWithTenants(),
    getSetting<number>('electricity_rate_default'),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-800">Quản lý phòng</h1>
              <p className="text-xs text-gray-400">{rooms.length} phòng</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6">
        <RoomList initialRooms={rooms} defaultElectricityRate={defaultElectricityRate ?? undefined} />
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
