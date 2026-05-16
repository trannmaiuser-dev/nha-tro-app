import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerSupabaseClient()

  try {
    // Auto-seed 3 default teams if table exists but is empty
    const { data: existing, error: checkErr } = await sb.from('hero_teams').select('id').limit(1)
    if (checkErr) {
      // Table likely doesn't exist yet — return empty array, not 500
      return NextResponse.json([])
    }
    if (!existing || existing.length === 0) {
      await sb.from('hero_teams').insert([
        { team_type: 'fire' },
        { team_type: 'repair' },
        { team_type: 'cleaning' },
      ])
    }

    const { data, error } = await sb
      .from('hero_teams')
      .select('*, members:hero_team_members!team_id(id, user_id, role, user:users!user_id(id, full_name))')
      .order('created_at')

    if (error) return NextResponse.json([])
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}
