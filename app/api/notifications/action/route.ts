import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendPushNotification } from '@/lib/push'

export async function POST(req: NextRequest) {
  const actor = await getCurrentUser()
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notificationId, action } = await req.json()
  const status = action === 'accepted' ? 'accepted' : 'rejected'

  const sb = createServerSupabaseClient()

  const { data: notif, error: fetchErr } = await sb
    .from('notifications')
    .select('*, sender:users!sender_id(push_subscription, full_name)')
    .eq('id', notificationId)
    .eq('receiver_id', actor.userId)
    .single()

  if (fetchErr || !notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await sb.from('notifications').update({ status }).eq('id', notificationId)

  // Notify the original sender about the action
  if (notif.type === 'extension_request' && notif.sender?.push_subscription) {
    const msg = status === 'accepted'
      ? '✅ Chủ nhà đã duyệt yêu cầu gia hạn của bạn!'
      : '❌ Chủ nhà từ chối yêu cầu gia hạn của bạn'

    // Save reply notification
    await sb.from('notifications').insert({
      sender_id:   actor.userId,
      receiver_id: notif.sender_id,
      type:        status === 'accepted' ? 'extension_approved' : 'extension_rejected',
      message:     msg,
      status:      'pending',
    })

    try {
      await sendPushNotification(notif.sender.push_subscription, {
        title: status === 'accepted' ? '✅ Gia hạn được duyệt' : '❌ Gia hạn bị từ chối',
        body:  msg,
        data:  { type: status === 'accepted' ? 'extension_approved' : 'extension_rejected' },
      })
    } catch {
      console.warn('Push failed')
    }
  }

  return NextResponse.json({ success: true })
}
