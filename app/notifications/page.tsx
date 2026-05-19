import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { dispatchDueForUser } from '@/lib/db/compose-notifications'
import NotificationsPage from '@/components/NotificationsPage'

export const dynamic = 'force-dynamic'

export default async function NotificationsRoute() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // On-demand dispatch check (D6): find compose notifications due for this user
  // and insert into notifications table before rendering the list.
  try { await dispatchDueForUser(user.userId) } catch { /* ignore — table may not exist pre-migration */ }

  const sb = createServerSupabaseClient()
  const { data: notifications } = await sb
    .from('notifications')
    .select('*, sender:users!sender_id(full_name)')
    .eq('receiver_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return <NotificationsPage currentUser={user} notifications={notifications ?? []} />
}
