import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { response } = await req.json()
  const sb = createServerSupabaseClient()

  await sb.from('event_responses').upsert(
    { event_id: params.id, user_id: user.userId, response },
    { onConflict: 'event_id,user_id' }
  )

  return NextResponse.json({ success: true })
}
