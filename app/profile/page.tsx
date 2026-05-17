import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProfileSelfPage from '@/components/ProfileSelfPage'

export const dynamic = 'force-dynamic'

export default async function ProfileRoute() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sb = createServerSupabaseClient()

  // T-016b: query phòng qua room_tenants thay vì rooms.tenant_id (đã drop).
  // Lấy phòng active của user (primary hoặc non-primary đều OK).
  const [{ data: profile }, { data: membership }] = await Promise.all([
    sb.from('tenant_profiles').select('*').eq('user_id', user.userId).maybeSingle(),
    sb.from('room_tenants')
      .select('room:rooms!room_id(name, floor, price)')
      .eq('user_id', user.userId)
      .is('left_at', null)
      .limit(1)
      .maybeSingle(),
  ])
  const room = membership?.room
    ? (Array.isArray(membership.room) ? membership.room[0] : membership.room)
    : null

  return <ProfileSelfPage currentUser={user} profile={profile} room={room} />
}
