import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import OwnerDashboard from '@/components/OwnerDashboard'
import TenantDashboard from '@/components/TenantDashboard'
import PushNotificationSetup from '@/components/PushNotificationSetup'
import type { Payment } from '@/types'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sb = createServerSupabaseClient()

  // Fetch rooms (owner sees all, tenant sees own)
  let rooms = []
  if (user.role === 'owner') {
    const { data } = await sb
      .from('rooms')
      .select('*, tenant:users!tenant_id(id, full_name, phone)')
      .order('name')
    rooms = data ?? []
  } else {
    const { data } = await sb
      .from('rooms')
      .select('*, tenant:users!tenant_id(id, full_name, phone)')
      .eq('tenant_id', user.userId)
      .single()
    rooms = data ? [data] : []
  }

  // Fetch latest payment per room
  const roomIds = (rooms as { id: string }[]).map(r => r.id)
  let payments: Payment[] = []
  if (roomIds.length > 0) {
    const { data } = await sb
      .from('payments')
      .select('*')
      .in('room_id', roomIds)
      .order('due_date', { ascending: false })
    payments = (data ?? []) as Payment[]
  }

  // Fetch unread notifications for current user
  const { data: notifications } = await sb
    .from('notifications')
    .select('*, sender:users!sender_id(full_name)')
    .eq('receiver_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <>
      <PushNotificationSetup />
      {user.role === 'owner' ? (
        <OwnerDashboard
          user={user}
          rooms={rooms}
          payments={payments}
          notifications={notifications ?? []}
        />
      ) : (
        <TenantDashboard
          user={user}
          room={rooms[0] ?? null}
          payments={payments}
          notifications={notifications ?? []}
        />
      )}
    </>
  )
}
