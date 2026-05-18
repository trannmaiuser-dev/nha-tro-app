import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAllRoomsWithTenants } from '@/lib/db/rooms'
import { getRoomsByTenant, getTenantsByRoom } from '@/lib/db/room-tenants'
import { getOverdueInvoicesByRoom, type OverdueInvoice } from '@/lib/db/invoices'
import { processDebtForRoom } from '@/lib/debt-notify'
import { notifyMeterReadingIfDue } from '@/lib/meter-notify'
import { getSetting } from '@/lib/db/settings'
import OwnerDashboard from '@/components/OwnerDashboard'
import TenantDashboard from '@/components/TenantDashboard'
import PushNotificationSetup from '@/components/PushNotificationSetup'
import type { TodayTasksData } from '@/components/dashboard/TodayTasksWidget'
import type { Payment, RoomWithTenants } from '@/types'

// T-021b: opt-out caching để revalidatePath từ approveMoveRequestAction
// thực sự refresh được khi F5 thường (không cần Ctrl+Shift+R).
export const dynamic = 'force-dynamic'

type TenantRoomShape = {
  id:         string
  name:       string
  floor:      number
  price:      number
  status:     string
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sb = createServerSupabaseClient()

  // Fetch rooms theo role.
  // Owner: T-016d Bug A fix — dùng getAllRoomsWithTenants để có tenants[] (multi-tenant render).
  // Tenant (có thể non-primary): query qua room_tenants để vẫn tìm được phòng.
  let ownerRooms: RoomWithTenants[]   = []
  let tenantRoom: TenantRoomShape | null = null
  let otherTenants: Array<{ user_id: string; full_name: string; is_primary: boolean }> = []
  let overdueInvoices: OverdueInvoice[] = []

  let todayTasks: TodayTasksData | null = null
  if (user.role === 'owner') {
    ownerRooms = await getAllRoomsWithTenants()

    // T-039: on-page check — nếu hôm nay là ngày chốt chỉ số + chưa notify tháng này,
    // dispatch notification + push (best-effort, fire-and-forget chấp nhận trễ render).
    await notifyMeterReadingIfDue(user.userId)

    // T-038: aggregate "Việc cần làm hôm nay" (requirements §4).
    const today = new Date()
    const meterReadingDayRaw = await getSetting<string | number>('meter_reading_day')
    const meterReadingDay = Number(meterReadingDayRaw ?? 1) || 1
    const isMeterReadingDay = today.getDate() === meterReadingDay

    const [overdueRes, pendingMoveRes, pendingProofRes] = await Promise.all([
      sb.from('invoices').select('total, paid_amount', { count: 'exact' }).eq('has_debt', true),
      sb.from('move_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('payment_proofs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    const overdueTotalAmount = (overdueRes.data ?? []).reduce(
      (sum, inv) => sum + Math.max(0, (inv.total ?? 0) - (inv.paid_amount ?? 0)),
      0,
    )
    todayTasks = {
      overdueInvoicesCount: overdueRes.count ?? 0,
      overdueTotalAmount,
      pendingMoveCount:     pendingMoveRes.count ?? 0,
      pendingProofCount:    pendingProofRes.count ?? 0,
      isMeterReadingDay,
      meterReadingDay,
    }
  } else {
    const memberships = await getRoomsByTenant(user.userId, true)
    if (memberships.length > 0 && memberships[0].room) {
      const roomId = memberships[0].room.id
      const { data: roomRow } = await sb
        .from('rooms')
        .select('id, name, floor, price, status')
        .eq('id', roomId)
        .single()
      if (roomRow) tenantRoom = roomRow as TenantRoomShape

      // Lấy danh sách người ở cùng (chỉ tên — privacy, không lộ SĐT)
      const allTenants = await getTenantsByRoom(roomId, true)
      otherTenants = allTenants
        .filter(t => t.user_id !== user.userId && t.user?.full_name)
        .map(t => ({
          user_id:    t.user_id,
          full_name:  t.user!.full_name,
          is_primary: t.is_primary,
        }))

      // T-017: sync debt + dispatch push nếu có invoice overdue mới (on-page check).
      // Best-effort, không block render (processDebtForRoom nuốt error).
      await processDebtForRoom(roomId)
      overdueInvoices = await getOverdueInvoicesByRoom(roomId)
    }
  }

  // Fetch latest payment per room
  const roomIds = user.role === 'owner'
    ? ownerRooms.map(r => r.id)
    : (tenantRoom ? [tenantRoom.id] : [])
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
          rooms={ownerRooms}
          payments={payments}
          notifications={notifications ?? []}
          todayTasks={todayTasks}
        />
      ) : (
        <TenantDashboard
          user={user}
          room={tenantRoom}
          payments={payments}
          notifications={notifications ?? []}
          otherTenants={otherTenants}
          overdueInvoices={overdueInvoices}
        />
      )}
    </>
  )
}
