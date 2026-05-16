import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendPushNotification } from '@/lib/push'

const PUSH_TITLES: Record<string, string> = {
  payment_reminder:   '🔔 Nhắc tiền thuê',
  payment_confirmed:  '✅ Đã thanh toán',
  extension_request:  '📅 Xin gia hạn',
  extension_approved: '✅ Gia hạn được duyệt',
  extension_rejected: '❌ Gia hạn bị từ chối',
}

export async function POST(req: NextRequest) {
  const sender = await getCurrentUser()
  if (!sender) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiverId, type, message } = await req.json()
  const sb = createServerSupabaseClient()

  let finalReceiverId = receiverId
  if (sender.role === 'tenant' && !receiverId) {
    const { data: owner } = await sb.from('users').select('id').eq('role', 'owner').single()
    if (!owner) return NextResponse.json({ error: 'Không tìm thấy chủ nhà' }, { status: 404 })
    finalReceiverId = owner.id
  }

  const { data: notif, error } = await sb
    .from('notifications')
    .insert({ sender_id: sender.userId, receiver_id: finalReceiverId, type, message, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send push to all devices of the receiver
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', finalReceiverId)

  if (subs && subs.length > 0) {
    await Promise.allSettled(
      subs.map(sub =>
        sendPushNotification(sub, {
          title: PUSH_TITLES[type] || 'Aloha Tran Home',
          body:  message,
          data:  { notificationId: notif.id, type },
        })
      )
    )
  }

  return NextResponse.json({ success: true, notification: notif })
}
