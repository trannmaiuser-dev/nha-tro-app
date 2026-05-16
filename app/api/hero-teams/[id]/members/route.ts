import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, role = 'member' } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const sb = createServerSupabaseClient()

  if (role === 'leader') {
    // Demote current leader to member first (only 1 leader per team)
    await sb.from('hero_team_members').update({ role: 'member' })
      .eq('team_id', params.id).eq('role', 'leader')
  }

  const { data, error } = await sb
    .from('hero_team_members')
    .upsert({ team_id: params.id, user_id: userId, role }, { onConflict: 'team_id,user_id' })
    .select('id, user_id, role, user:users!user_id(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
