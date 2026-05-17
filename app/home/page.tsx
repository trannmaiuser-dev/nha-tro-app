import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import HomePageOwner from '@/components/HomePageOwner'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user)                 redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard')

  const sb      = createServerSupabaseClient()
  const todayISO = new Date().toISOString().split('T')[0]
  const weekISO  = new Date(Date.now() + 7 * 86400_000).toISOString().split('T')[0]

  const [
    { data: rooms },
    { count: unreadMessages },
    { count: pendingNotifs },
    { count: unconfirmedProfiles },
    { data: duePayments },
  ] = await Promise.all([
    sb.from('rooms').select('id, name, floor, status'),
    sb.from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.userId).eq('is_read', false),
    sb.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.userId).eq('status', 'pending'),
    sb.from('tenant_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('profile_status', 'pending'),
    sb.from('payments')
      .select('room_id, due_date')
      .lte('due_date', weekISO)
      .eq('status', 'pending'),
  ])

  const totalRooms    = rooms?.length ?? 0
  const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length ?? 0
  const vacantRooms   = rooms?.filter(r => r.status === 'vacant').length ?? 0
  const vacantRoomList = (rooms ?? [])
    .filter(r => r.status === 'vacant')
    .map(r => ({ id: r.id, name: r.name, floor: r.floor }))

  const overduePayments = duePayments?.filter(p => p.due_date <= todayISO).length ?? 0
  const dueSoonCount    = duePayments?.length ?? 0

  return (
    <HomePageOwner
      user={user}
      stats={{
        totalRooms, occupiedRooms, vacantRooms, vacantRoomList,
        unreadMessages:      unreadMessages      ?? 0,
        pendingNotifs:       pendingNotifs        ?? 0,
        unconfirmedProfiles: unconfirmedProfiles  ?? 0,
        overduePayments,
        dueSoonCount,
      }}
    />
  )
}
