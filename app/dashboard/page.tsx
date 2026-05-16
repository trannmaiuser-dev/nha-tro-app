import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getRoomsByTenant, getTenantsByRoom } from '@/lib/db/room-tenants'
import OwnerDashboard from '@/components/OwnerDashboard'
import TenantDashboard from '@/components/TenantDashboard'
import PushNotificationSetup from '@/components/PushNotificationSetup'
import type { Payment } from '@/types'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sb = createServerSupabaseClient()

  // Fetch rooms (owner sees all, tenant sees own — T-016 Phase C: qua room_tenants)
  // Tenant có thể là non-primary; query qua room_tenants để vẫn tìm được phòng.
  let rooms: Array<{ id: string; name: string; floor: number; price: number; status: string; tenant_id: string | null }> = []
  let otherTenants: Array<{ user_id: string; full_name: string; is_primary: boolean }> = []
  if (user.role === 'owner') {
    const { data } = await sb
      .from('rooms')
      .select('*, tenant:users!tenant_id(id, full_name, phone)')
      .order('name')
    rooms = data ?? []
  } else {
    const memberships = await getRoomsByTenant(user.userId, true)
    if (memberships.length > 0 && memberships[0].room) {
      const roomId = memberships[0].room.id
      const { data: roomRow } = await sb
        .from('rooms')
        .select('id, name, floor, price, status, tenant_id')
        .eq('id', roomId)
        .single()
      if (roomRow) rooms = [roomRow]

      // Lấy danh sách người ở cùng (chỉ tên — privacy, không lộ SĐT)
      const allTenants = await getTenantsByRoom(roomId, true)
      otherTenants = allTenants
        .filter(t => t.user_id !== user.userId && t.user?.full_name)
        .map(t => ({
          user_id:    t.user_id,
          full_name:  t.user!.full_name,
          is_primary: t.is_primary,
        }))
    }
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
          otherTenants={otherTenants}
        />
      )}
    </>
  )
}
