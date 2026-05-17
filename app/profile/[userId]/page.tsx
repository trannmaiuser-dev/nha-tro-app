import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import TenantSummaryPage from '@/components/TenantSummaryPage'

export const dynamic = 'force-dynamic'

export default async function TenantProfilePage({ params }: { params: { userId: string } }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard')

  const sb = createServerSupabaseClient()

  const { data: profile } = await sb.from('tenant_profiles').select('*').eq('user_id', params.userId).single()
  if (!profile) notFound()

  // T-016b: query phòng qua room_tenants (rooms.tenant_id đã drop).
  const [emergency, related, documents, tenantUser, membership] = await Promise.all([
    sb.from('emergency_contacts').select('*').eq('tenant_id', profile.id).maybeSingle().then(r => r.data),
    sb.from('related_persons').select('*').eq('tenant_id', profile.id).then(r => r.data ?? []),
    sb.from('tenant_documents').select('*').eq('tenant_id', profile.id).then(r => r.data ?? []),
    sb.from('users').select('phone, full_name, is_profile_complete').eq('id', params.userId).single().then(r => r.data),
    sb.from('room_tenants')
      .select('room:rooms!room_id(id, name, floor, price)')
      .eq('user_id', params.userId)
      .is('left_at', null)
      .limit(1)
      .maybeSingle()
      .then(r => r.data),
  ])
  const room = membership?.room
    ? (Array.isArray(membership.room) ? membership.room[0] : membership.room)
    : null

  return (
    <TenantSummaryPage
      userId={params.userId}
      profile={profile}
      emergency={emergency}
      related={related as Parameters<typeof TenantSummaryPage>[0]['related']}
      documents={documents as Parameters<typeof TenantSummaryPage>[0]['documents']}
      tenantUser={tenantUser}
      room={room}
    />
  )
}
