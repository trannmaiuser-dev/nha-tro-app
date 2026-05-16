import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  const sb = createServerSupabaseClient()

  await sb.from('maintenance_requests').update({
    status,
    resolved_at: status === 'done' ? new Date().toISOString() : null,
  }).eq('id', params.id)

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerSupabaseClient()
  const { data: req } = await sb.from('maintenance_requests').select('reporter_id').eq('id', params.id).single()

  if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (req.reporter_id !== user.userId && user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await sb.from('maintenance_requests').delete().eq('id', params.id)
  return NextResponse.json({ success: true })
}
