import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import ComposeNotificationForm from '@/components/ComposeNotificationForm'

export const dynamic = 'force-dynamic'

export default async function ComposeNotificationRoute() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return <ComposeNotificationForm currentUser={user} />
}
