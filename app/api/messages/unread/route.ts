import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ count: 0 })

  const sb = createServerSupabaseClient()
  const { count } = await sb
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.userId)
    .eq('is_read', false)

  return NextResponse.json({ count: count ?? 0 })
}
