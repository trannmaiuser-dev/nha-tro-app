import Link from 'next/link'
import { getAllTenants } from '@/lib/db/tenants'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import TenantList from '@/components/tenants/TenantList'

export default async function AdminTenantsPage() {
  const [tenants, roomsRes] = await Promise.all([
    getAllTenants(),
    createServerSupabaseClient().from('rooms').select('id, name, floor, status').order('name'),
  ])
  const rooms = roomsRes.data ?? []

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/home" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-800">Quản lý khách thuê</h1>
              <p className="text-xs text-gray-400">{tenants.length} khách</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6">
        <TenantList initialTenants={tenants} rooms={rooms} />
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
