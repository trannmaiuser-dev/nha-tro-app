import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type Params = { params: { id: string; userId: string } }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = createServerSupabaseClient()
  await sb.from('hero_team_members').delete().eq('team_id', params.id).eq('user_id', params.userId)
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { role } = await req.json()
  const sb = createServerSupabaseClient()

  if (role === 'leader') {
    // Demote existing leader first
    await sb.from('hero_team_members').update({ role: 'member' })
      .eq('team_id', params.id).eq('role', 'leader')
  }

  await sb.from('hero_team_members').update({ role }).eq('team_id', params.id).eq('user_id', params.userId)
  return NextResponse.json({ success: true })
}
