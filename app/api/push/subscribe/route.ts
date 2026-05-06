import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscription } = await req.json()
  const sb = createServerSupabaseClient()

  await sb
    .from('users')
    .update({ push_subscription: JSON.stringify(subscription) })
    .eq('id', user.userId)

  return NextResponse.json({ success: true })
}
