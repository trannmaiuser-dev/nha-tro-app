import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import NotificationsPage from '@/components/NotificationsPage'

export default async function NotificationsRoute() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sb = createServerSupabaseClient()
  const { data: notifications } = await sb
    .from('notifications')
    .select('*, sender:users!sender_id(full_name)')
    .eq('receiver_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return <NotificationsPage currentUser={user} notifications={notifications ?? []} />
}
