import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import TenantSummaryPage from '@/components/TenantSummaryPage'

export default async function TenantProfilePage({ params }: { params: { userId: string } }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard')

  const sb = createServerSupabaseClient()

  const { data: profile } = await sb.from('tenant_profiles').select('*').eq('user_id', params.userId).single()
  if (!profile) notFound()

  const [emergency, related, documents, tenantUser, room] = await Promise.all([
    sb.from('emergency_contacts').select('*').eq('tenant_id', profile.id).maybeSingle().then(r => r.data),
    sb.from('related_persons').select('*').eq('tenant_id', profile.id).then(r => r.data ?? []),
    sb.from('tenant_documents').select('*').eq('tenant_id', profile.id).then(r => r.data ?? []),
    sb.from('users').select('phone, full_name, is_profile_complete').eq('id', params.userId).single().then(r => r.data),
    sb.from('rooms').select('id, name, floor, price').eq('tenant_id', params.userId).maybeSingle().then(r => r.data),
  ])

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
