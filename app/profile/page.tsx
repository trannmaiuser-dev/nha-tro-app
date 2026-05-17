import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProfileSelfPage from '@/components/ProfileSelfPage'

export const dynamic = 'force-dynamic'

export default async function ProfileRoute() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sb = createServerSupabaseClient()

  const [{ data: profile }, { data: room }] = await Promise.all([
    sb.from('tenant_profiles').select('*').eq('user_id', user.userId).maybeSingle(),
    sb.from('rooms').select('name, floor, price').eq('tenant_id', user.userId).maybeSingle(),
  ])

  return <ProfileSelfPage currentUser={user} profile={profile} room={room} />
}
