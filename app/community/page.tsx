import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import CommunityPage from '@/components/CommunityPage'
import type { RawCommunityEventRow, CommunityEventForUI } from '@/lib/types/community'

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

export default async function CommunityPageRoute() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sb    = createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]
  const now   = Date.now()

  const [
    { data: rawPosts },
    { data: rawPinned },
    { data: maintenance },
    { data: eventsRaw },
    { data: marketplace },
    { data: allUsers },
  ] = await Promise.all([
    sb.from('community_posts')
      .select('*, author:users!author_id(id,full_name,role), reactions:post_reactions(reaction_type,user_id), tags:post_tags(tagged_user_id, user:users!tagged_user_id(full_name)), replies:post_replies(id)')
      .is('deleted_at', null)
      .eq('is_pinned', false)
      .order('created_at', { ascending: false })
      .limit(50),
    sb.from('community_posts')
      .select('*, author:users!author_id(id,full_name,role), replies:post_replies(id)')
      .is('deleted_at', null)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(10),
    sb.from('maintenance_requests')
      .select('*, reporter:users!reporter_id(id,full_name,role)')
      .order('created_at', { ascending: false })
      .limit(20),
    sb.from('community_events')
      .select('*, creator:users!creator_id(id,full_name), responses:event_responses(user_id,response,user:users!user_id(full_name))')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(10),
    sb.from('marketplace_posts')
      .select('*, author:users!author_id(id,full_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20),
    sb.from('users').select('id,full_name,role').order('full_name'),
  ])

  // Normalize events — add missing fields added by migrations-v8 with safe defaults.
  // Cast cuối về CommunityEventForUI[] để khớp prop của CommunityPage.
  const events = ((eventsRaw ?? []) as RawCommunityEventRow[]).map(e => ({
    ...e,
    creator_id:          e.creator_id          ?? '',
    response_option_yes: e.response_option_yes ?? 'Tham gia',
    response_option_no:  e.response_option_no  ?? 'Không tham gia',
    deleted_at:          e.deleted_at          ?? null,
    tags:                e.tags                ?? [],
  })) as unknown as CommunityEventForUI[]

  // Filter private posts: only show to author, tagged users, or owner
  const filterPosts = (list: typeof rawPosts) => (list ?? []).filter(p => {
    if (p.visibility !== 'private') return true
    if (p.author_id === user.userId || user.role === 'owner') return true
    return (p.tags ?? []).some((t: { tagged_user_id: string }) => t.tagged_user_id === user.userId)
  })

  // Filter auto-hidden archived posts (done > 2 days) — tenants never see these; owners see via toggle client-side
  const filterArchived = (list: ReturnType<typeof filterPosts>) => list.filter(p => {
    if (p.status !== 'done' || !p.done_at) return true
    const age = now - new Date(p.done_at).getTime()
    return age <= TWO_DAYS_MS || user.role === 'owner'
  })

  const posts  = filterArchived(filterPosts(rawPosts))
  const pinned = filterPosts(rawPinned)

  return (
    <CommunityPage
      currentUser={user}
      initialPosts={posts}
      initialPinned={pinned}
      initialMaintenance={maintenance ?? []}
      initialEvents={events ?? []}
      initialMarketplace={marketplace ?? []}
      allUsers={allUsers ?? []}
    />
  )
}
