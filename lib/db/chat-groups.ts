/**
 * T-043 — Data layer cho chat nhóm (Module 6).
 *
 * Migration v23: chat_groups + chat_group_members + messages.group_id.
 *
 * Convention (theo lib/db/rooms.ts, lib/db/room-tenants.ts):
 *   - createServerSupabaseClient from '@/lib/supabase-server'
 *   - throw Error tiếng Việt khi fail; server-action wrap Result<T>
 *   - select nested join cho UI
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface ChatGroup {
  id:          string
  name:        string
  description: string | null
  created_by:  string
  created_at:  string
  deleted_at:  string | null
}

export interface ChatGroupMember {
  id:        string
  group_id:  string
  user_id:   string
  joined_at: string
  left_at:   string | null
}

export interface GroupMessage {
  id:         string
  sender_id:  string
  group_id:   string
  content:    string | null
  image_url:  string | null
  is_read:    boolean
  created_at: string
  sender?:    { full_name: string }
}

/** Tạo group mới. Auto-add creator làm member. */
export async function createGroup(input: { name: string; description?: string | null; createdBy: string }): Promise<ChatGroup> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('chat_groups')
    .insert({ name: input.name, description: input.description ?? null, created_by: input.createdBy })
    .select()
    .single()
  if (error) throw new Error('Không thể tạo nhóm: ' + error.message)

  // Auto-add creator
  await sb.from('chat_group_members').insert({ group_id: data.id, user_id: input.createdBy })
  return data as ChatGroup
}

/** List tất cả nhóm active mà user là member. */
export async function listGroupsForUser(userId: string): Promise<Array<ChatGroup & { member_count: number; last_message_at: string | null }>> {
  const sb = createServerSupabaseClient()
  const { data: memberships } = await sb
    .from('chat_group_members')
    .select('group_id')
    .eq('user_id', userId)
    .is('left_at', null)
  const groupIds = (memberships ?? []).map(m => m.group_id)
  if (groupIds.length === 0) return []

  const { data: groups } = await sb
    .from('chat_groups')
    .select('*')
    .in('id', groupIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Member count + last message per group (parallel)
  const enriched = await Promise.all((groups ?? []).map(async g => {
    const [{ count }, { data: lastMsg }] = await Promise.all([
      sb.from('chat_group_members').select('id', { count: 'exact', head: true }).eq('group_id', g.id).is('left_at', null),
      sb.from('messages').select('created_at').eq('group_id', g.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    return { ...(g as ChatGroup), member_count: count ?? 0, last_message_at: lastMsg?.created_at ?? null }
  }))
  return enriched
}

/** Lấy 1 group + members + verify user là member. Returns null nếu user không có quyền. */
export async function getGroupForUser(groupId: string, userId: string): Promise<{
  group: ChatGroup
  members: Array<{ user_id: string; full_name: string; phone: string; role: string; joined_at: string }>
  isMember: boolean
} | null> {
  const sb = createServerSupabaseClient()
  const { data: group } = await sb.from('chat_groups').select('*').eq('id', groupId).is('deleted_at', null).maybeSingle()
  if (!group) return null

  const { data: membership } = await sb
    .from('chat_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle()

  // Owner luôn có quyền xem; member khác phải có active membership
  const { data: u } = await sb.from('users').select('role').eq('id', userId).single()
  const isOwner = u?.role === 'owner'
  const isMember = !!membership
  if (!isOwner && !isMember) return null

  type MemberRow = { user_id: string; joined_at: string; user: { full_name: string; phone: string; role: string } | { full_name: string; phone: string; role: string }[] | null }
  const { data: rows } = await sb
    .from('chat_group_members')
    .select('user_id, joined_at, user:users!user_id(full_name, phone, role)')
    .eq('group_id', groupId)
    .is('left_at', null)
    .order('joined_at', { ascending: true })
  const members = ((rows ?? []) as MemberRow[]).map(r => {
    const user = Array.isArray(r.user) ? r.user[0] : r.user
    return { user_id: r.user_id, joined_at: r.joined_at, full_name: user?.full_name ?? '', phone: user?.phone ?? '', role: user?.role ?? '' }
  })

  return { group: group as ChatGroup, members, isMember }
}

export async function addMemberToGroup(groupId: string, userId: string): Promise<void> {
  const sb = createServerSupabaseClient()
  // Soft re-join: nếu có row với left_at, set left_at = null. Else insert mới.
  const { data: existing } = await sb
    .from('chat_group_members')
    .select('id, left_at')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing && existing.left_at === null) return  // already member
  // Insert new (UNIQUE allows multiple rows differing by joined_at)
  const { error } = await sb.from('chat_group_members').insert({ group_id: groupId, user_id: userId })
  if (error) throw new Error('Không thể thêm thành viên: ' + error.message)
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('chat_group_members')
    .update({ left_at: new Date().toISOString() })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .is('left_at', null)
  if (error) throw new Error('Không thể xóa thành viên: ' + error.message)
}

export async function softDeleteGroup(groupId: string): Promise<void> {
  const sb = createServerSupabaseClient()
  const { error } = await sb.from('chat_groups').update({ deleted_at: new Date().toISOString() }).eq('id', groupId)
  if (error) throw new Error('Không thể xóa nhóm: ' + error.message)
}

export async function getMessagesForGroup(groupId: string, limit = 100): Promise<GroupMessage[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('messages')
    .select('*, sender:users!sender_id(full_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error('Không thể tải tin nhắn nhóm')
  return (data ?? []) as unknown as GroupMessage[]
}

export async function sendGroupMessage(senderId: string, groupId: string, content: string): Promise<GroupMessage> {
  const sb = createServerSupabaseClient()
  const trimmed = content.trim()
  if (!trimmed) throw new Error('Nội dung tin nhắn không được trống')
  const { data, error } = await sb
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: null, group_id: groupId, content: trimmed, is_read: false })
    .select('*, sender:users!sender_id(full_name)')
    .single()
  if (error) throw new Error('Không thể gửi tin nhắn: ' + error.message)
  return data as unknown as GroupMessage
}

/** Eligible members: active tenants + owner. Dùng trong UI "thêm thành viên". */
export async function listEligibleUsers(): Promise<Array<{ id: string; full_name: string; phone: string; role: string }>> {
  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('users')
    .select('id, full_name, phone, role')
    .or('role.eq.owner,and(role.eq.tenant,tenant_status.eq.active)')
    .order('full_name')
  return (data ?? []) as Array<{ id: string; full_name: string; phone: string; role: string }>
}
