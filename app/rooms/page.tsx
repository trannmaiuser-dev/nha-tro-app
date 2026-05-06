import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function RoomsPage() {
  const user = await getCurrentUser()
  if (!user)                redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard')

  const sb = createServerSupabaseClient()
  const { data: rooms } = await sb
    .from('rooms')
    .select('*, tenant:users!tenant_id(id, full_name, phone)')
    .order('name')

  const { data: payments } = await sb
    .from('payments')
    .select('*')
    .order('due_date', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-10">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
              <BackIcon />
            </Link>
            <h1 className="text-lg font-black text-gray-800">Quản lý phòng</h1>
          </div>
          <span className="badge-green">{rooms?.length ?? 0} phòng</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {rooms?.map(room => {
          const latestPay = payments
            ?.filter(p => p.room_id === room.id)
            .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0]

          return (
            <div key={room.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-lg ${
                    room.status === 'occupied' ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-xs font-semibold opacity-60">Tầng {room.floor}</span>
                    <span>{room.name}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800 text-lg">Phòng {room.name}</h3>
                    <p className="text-sm text-gray-400">{(room.price).toLocaleString('vi-VN')}đ / tháng</p>
                  </div>
                </div>
                <StatusBadge status={room.status} />
              </div>

              {room.tenant && (
                <div className="bg-primary-50 rounded-2xl p-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600">
                      {room.tenant.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-700">{room.tenant.full_name}</p>
                      <p className="text-xs text-gray-400">{room.tenant.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {latestPay && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Hạn tháng này:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700">
                      {new Date(latestPay.due_date).toLocaleDateString('vi-VN')}
                    </span>
                    <PayBadge status={latestPay.status} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'occupied')    return <span className="badge-green">Có người</span>
  if (status === 'vacant')      return <span className="badge-gray">Trống</span>
  if (status === 'maintenance') return <span className="badge-orange">Sửa chữa</span>
  return null
}

function PayBadge({ status }: { status: string }) {
  if (status === 'paid')    return <span className="badge-green">Đã trả</span>
  if (status === 'overdue') return <span className="badge-red">Quá hạn</span>
  if (status === 'extended') return <span className="badge-orange">Gia hạn</span>
  return <span className="badge-orange">Chờ trả</span>
}

function BackIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}
