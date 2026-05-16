import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { senderId } = await req.json()
  if (!senderId) return NextResponse.json({ error: 'Missing senderId' }, { status: 400 })

  const sb = createServerSupabaseClient()
  await sb
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', user.userId)
    .eq('sender_id', senderId)
    .eq('is_read', false)

  return NextResponse.json({ success: true })
}
