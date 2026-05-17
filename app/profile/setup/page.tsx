import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProfileSetupWizard from '@/components/ProfileSetupWizard'

export const dynamic = 'force-dynamic'

export default async function ProfileSetupPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'tenant') redirect('/dashboard')

  const sb = createServerSupabaseClient()

  const { data: profile } = await sb
    .from('tenant_profiles')
    .select('*')
    .eq('user_id', user.userId)
    .single()

  const profileId = profile?.id
  const [emergency, related, documents] = profileId
    ? await Promise.all([
        sb.from('emergency_contacts').select('*').eq('tenant_id', profileId).maybeSingle().then(r => r.data),
        sb.from('related_persons').select('*').eq('tenant_id', profileId).then(r => r.data ?? []),
        sb.from('tenant_documents').select('*').eq('tenant_id', profileId).then(r => r.data ?? []),
      ])
    : [null, [], []]

  // Get owner's max_related_persons setting
  const { data: ownerSettings } = await sb
    .from('owner_settings')
    .select('max_related_persons')
    .limit(1)
    .single()
  const maxRelated = ownerSettings?.max_related_persons ?? 5

  return (
    <ProfileSetupWizard
      currentUser={user}
      initialProfile={profile}
      initialEmergency={emergency}
      initialRelated={related as Parameters<typeof ProfileSetupWizard>[0]['initialRelated']}
      initialDocuments={documents as Parameters<typeof ProfileSetupWizard>[0]['initialDocuments']}
      maxRelated={maxRelated}
    />
  )
}
