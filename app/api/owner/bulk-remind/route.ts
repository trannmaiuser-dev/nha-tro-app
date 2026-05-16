import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendPushNotification } from '@/lib/push'

export async function POST() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = createServerSupabaseClient()

  // Get all occupied rooms with tenant
  const { data: rooms } = await sb
    .from('rooms')
    .select('id, name, tenant_id')
    .eq('status', 'occupied')
    .not('tenant_id', 'is', null)

  if (!rooms?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  await Promise.allSettled(
    rooms.map(async room => {
      if (!room.tenant_id) return

      // Save notification
      const { data: notif } = await sb.from('notifications').insert({
        sender_id:   user.userId,
        receiver_id: room.tenant_id,
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
        .eq('user_id', room.tenant_id)

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
