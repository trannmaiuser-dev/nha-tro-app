import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { listGroupsForUser, listEligibleUsers } from '@/lib/db/chat-groups'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminChatGroupsClient from './AdminChatGroupsClient'

export const dynamic = 'force-dynamic'

export default async function AdminChatGroupsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard')

  const sb = createServerSupabaseClient()

  // Owner thấy tất cả groups (mà mình tạo). Vì owner luôn là member khi tạo nhóm,
  // listGroupsForUser trả được. Nhưng owner có thể đã rời nhóm — fall back: query
  // direct chat_groups nếu role owner.
  const [groups, allUsers] = await Promise.all([
    sb.from('chat_groups').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    listEligibleUsers(),
  ])

  // Member count + last_message_at cho mỗi group
  type GroupListItem = {
    id: string; name: string; description: string | null; created_at: string
    member_count: number; last_message_at: string | null
  }
  const enriched: GroupListItem[] = await Promise.all(
    (groups.data ?? []).map(async g => {
      const [{ count }, { data: lastMsg }] = await Promise.all([
        sb.from('chat_group_members').select('id', { count: 'exact', head: true }).eq('group_id', g.id).is('left_at', null),
        sb.from('messages').select('created_at').eq('group_id', g.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      return { ...g, member_count: count ?? 0, last_message_at: lastMsg?.created_at ?? null }
    })
  )

  // Members per group cho UI manage
  const groupIds = enriched.map(g => g.id)
  type MemberRow = { group_id: string; user_id: string; user: { full_name: string } | { full_name: string }[] | null }
  let membersByGroup: Record<string, Array<{ user_id: string; full_name: string }>> = {}
  if (groupIds.length > 0) {
    const { data: memberRows } = await sb
      .from('chat_group_members')
      .select('group_id, user_id, user:users!user_id(full_name)')
      .in('group_id', groupIds)
      .is('left_at', null)
    membersByGroup = (memberRows as MemberRow[] | null ?? []).reduce((acc, r) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user
      if (!acc[r.group_id]) acc[r.group_id] = []
      acc[r.group_id].push({ user_id: r.user_id, full_name: u?.full_name ?? '' })
      return acc
    }, {} as Record<string, Array<{ user_id: string; full_name: string }>>)
  }

  // suppress unused warning
  void listGroupsForUser

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-5 py-4">
          <Link href="/dashboard" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600">
            ‹
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-800">Nhóm chat</h1>
            <p className="text-xs text-gray-400">{enriched.length} nhóm</p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 pt-6">
        <AdminChatGroupsClient groups={enriched} membersByGroup={membersByGroup} eligibleUsers={allUsers} />
      </main>
    </div>
  )
}
