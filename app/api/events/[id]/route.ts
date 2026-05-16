import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerSupabaseClient()
  const { data: ev } = await sb.from('community_events').select('creator_id').eq('id', params.id).single()

  if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ev.creator_id !== user.userId && user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await sb.from('community_events').update({ deleted_at: new Date().toISOString() }).eq('id', params.id)
  return NextResponse.json({ success: true })
}
