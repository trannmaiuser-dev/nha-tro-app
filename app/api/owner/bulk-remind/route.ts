import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendPushNotification } from '@/lib/push'

export async function POST() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = createServerSupabaseClient()

  // T-016b: query primary tenant qua room_tenants thay vì rooms.tenant_id (đã drop).
  const { data: memberships } = await sb
    .from('room_tenants')
    .select(`
      user_id,
      room:rooms!room_id(id, name, status)
    `)
    .eq('is_primary', true)
    .is('left_at', null)

  if (!memberships?.length) return NextResponse.json({ sent: 0 })

  // Filter: chỉ remind phòng status='occupied' (defensive — primary active thường implies occupied)
  type Membership = { user_id: string; room: { id: string; name: string; status: string } | { id: string; name: string; status: string }[] | null }
  const targets = (memberships as Membership[])
    .map(m => {
      const room = Array.isArray(m.room) ? m.room[0] : m.room
      return room && room.status === 'occupied' ? { user_id: m.user_id, room } : null
    })
    .filter((t): t is { user_id: string; room: { id: string; name: string; status: string } } => t !== null)

  if (!targets.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  await Promise.allSettled(
    targets.map(async ({ user_id, room }) => {
      // Save notification
      const { data: notif } = await sb.from('notifications').insert({
        sender_id:   user.userId,
        receiver_id: user_id,
        type:        'payment_reminder',
        message:     `🔔 Nhắc thanh toán tiền phòng ${room.name} tháng này nhé! 💰`,
        status:      'pending',
      }).select().single()

      if (!notif) return
      sent++

      // Send push
      const { data: subs } = await sb
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', user_id)

      if (subs?.length) {
        await Promise.allSettled(
          subs.map(sub => sendPushNotification(sub, {
            title: '🔔 Nhắc tiền thuê',
            body:  `Đến hạn thanh toán phòng ${room.name} rồi nhé!`,
            data:  { notificationId: notif.id, type: 'payment_reminder' },
          }))
        )
      }
    })
  )

  return NextResponse.json({ sent })
}
