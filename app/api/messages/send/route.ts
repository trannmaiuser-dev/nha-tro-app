import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendPushNotification } from '@/lib/push'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiverId, content, imageUrl } = await req.json()
  if (!receiverId || (!content && !imageUrl)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const sb = createServerSupabaseClient()

  const { data: msg, error } = await sb
    .from('messages')
    .insert({ sender_id: user.userId, receiver_id: receiverId, content: content || null, image_url: imageUrl || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Push notification to receiver
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', receiverId)

  if (subs && subs.length > 0) {
    const preview = imageUrl ? '📷 Ảnh' : (content?.slice(0, 50) || '')
    await Promise.allSettled(
      subs.map(sub =>
        sendPushNotification(sub, {
          title: `💬 ${user.fullName}`,
          body:  preview,
          data:  { type: 'chat', senderId: user.userId },
        })
      )
    )
  }

  return NextResponse.json(msg)
}
