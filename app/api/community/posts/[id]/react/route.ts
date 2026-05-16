import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reaction } = await req.json()
  const sb = createServerSupabaseClient()

  // Toggle: if already reacted with same type → remove, else add
  const { data: existing } = await sb
    .from('post_reactions')
    .select('id')
    .eq('post_id', params.id)
    .eq('user_id', user.userId)
    .eq('reaction_type', reaction)
    .maybeSingle()

  if (existing) {
    await sb.from('post_reactions').delete().eq('id', existing.id)
    return NextResponse.json({ action: 'removed' })
  }

  await sb.from('post_reactions').insert({ post_id: params.id, user_id: user.userId, reaction_type: reaction })
  return NextResponse.json({ action: 'added' })
}
