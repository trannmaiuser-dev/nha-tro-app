import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb          = createServerSupabaseClient()
  const pinned      = req.nextUrl.searchParams.get('pinned') === 'true'
  const showArchived = req.nextUrl.searchParams.get('archived') === 'true' && user.role === 'owner'

  let q = sb
    .from('community_posts')
    .select('*, author:users!author_id(id, full_name, role), reactions:post_reactions(reaction_type, user_id), tags:post_tags(tagged_user_id, user:users!tagged_user_id(full_name)), replies:post_replies(id)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (pinned) {
    q = q.eq('is_pinned', true).limit(3)
  } else {
    q = q.eq('is_pinned', false).limit(50)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  const filtered = (data ?? []).filter(p => {
    // Private: only author or tagged users
    if (p.visibility === 'private') {
      if (p.author_id !== user.userId && user.role !== 'owner') {
        const isTagged = (p.tags ?? []).some((t: { tagged_user_id: string }) => t.tagged_user_id === user.userId)
        if (!isTagged) return false
      }
    }

    // Archived (done > 2 days): hidden unless owner explicitly requests
    if (p.status === 'done' && p.done_at) {
      const age = now - new Date(p.done_at).getTime()
      if (age > TWO_DAYS_MS && !showArchived) return false
    }

    return true
  })

  return NextResponse.json(filtered)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, imageUrl, visibility, taggedUserIds, themeId, fontStyle, decorationId } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const sb = createServerSupabaseClient()

  const { data: post, error } = await sb
    .from('community_posts')
    .insert({
      author_id:  user.userId,
      content:    content.trim(),
      image_url:  imageUrl || null,
      visibility: visibility || 'public',
      theme_id:      typeof themeId === 'number' ? themeId : 9,
      font_style:    fontStyle || 'normal',
      decoration_id: typeof decorationId === 'number' ? decorationId : 12,
    })
    .select('*, author:users!author_id(id, full_name, role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (taggedUserIds?.length) {
    await sb.from('post_tags').insert(
      taggedUserIds.map((uid: string) => ({ post_id: post.id, tagged_user_id: uid }))
    )
  }

  return NextResponse.json({ ...post, reactions: [], tags: [], replies: [] })
}
