import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ChatWindow from '@/components/ChatWindow'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sb = createServerSupabaseClient()

  // Determine conversation partner
  let partner: { id: string; full_name: string; role: string } | null = null

  if (user.role === 'tenant') {
    const { data } = await sb.from('users').select('id, full_name, role').eq('role', 'owner').single()
    partner = data
  } else {
    // Owner: check for ?with= param (handled client-side via ChatWindow)
    // Default: first tenant with a room
    const { data } = await sb
      .from('users')
      .select('id, full_name, role')
      .eq('role', 'tenant')
      .limit(1)
      .single()
    partner = data ?? null
  }

  // Load initial messages
  let initialMessages: unknown[] = []
  if (partner) {
    const { data } = await sb
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.userId},receiver_id.eq.${partner.id}),` +
        `and(sender_id.eq.${partner.id},receiver_id.eq.${user.userId})`
      )
      .order('created_at', { ascending: true })
      .limit(100)
    initialMessages = data ?? []

    // Mark as read
    await sb
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.userId)
      .eq('sender_id', partner.id)
      .eq('is_read', false)
  }

  // Owner: list all tenants for sidebar
  let tenants: { id: string; full_name: string }[] = []
  if (user.role === 'owner') {
    const { data } = await sb
      .from('users')
      .select('id, full_name')
      .eq('role', 'tenant')
      .order('full_name')
    tenants = data ?? []
  }

  return (
    <ChatWindow
      currentUser={user}
      partner={partner}
      tenants={tenants}
      initialMessages={initialMessages as Parameters<typeof ChatWindow>[0]['initialMessages']}
    />
  )
}
