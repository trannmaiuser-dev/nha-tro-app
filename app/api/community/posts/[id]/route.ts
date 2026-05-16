import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerSupabaseClient()

  const { data: post } = await sb
    .from('community_posts')
    .select('author_id')
    .eq('id', params.id)
    .single()

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.author_id !== user.userId && user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await sb
    .from('community_posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
