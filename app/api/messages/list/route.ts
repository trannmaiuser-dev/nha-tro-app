import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const withId = req.nextUrl.searchParams.get('with')
  if (!withId) return NextResponse.json({ error: 'Missing ?with=' }, { status: 400 })

  const sb = createServerSupabaseClient()

  const { data, error } = await sb
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${user.userId},receiver_id.eq.${withId}),` +
      `and(sender_id.eq.${withId},receiver_id.eq.${user.userId})`
    )
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
