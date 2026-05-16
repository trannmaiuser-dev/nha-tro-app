import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { pinned } = await req.json()
  const sb = createServerSupabaseClient()

  if (pinned) {
    // Max 10 pinned posts
    const { count } = await sb.from('community_posts').select('*', { count: 'exact', head: true }).eq('is_pinned', true)
    if ((count ?? 0) >= 10) return NextResponse.json({ error: 'Tối đa 10 thông báo ghim' }, { status: 400 })
  }

  await sb.from('community_posts').update({ is_pinned: pinned }).eq('id', params.id)
  return NextResponse.json({ success: true })
}
