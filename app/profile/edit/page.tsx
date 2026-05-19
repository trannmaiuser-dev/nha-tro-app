import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import OwnerProfileEditForm from '@/components/OwnerProfileEditForm'
import type { TenantProfile, TenantDocument } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ProfileEditPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'owner') redirect('/profile/setup')

  const sb = createServerSupabaseClient()
  const { data: profile } = await sb
    .from('tenant_profiles')
    .select('*')
    .eq('user_id', user.userId)
    .maybeSingle()

  const documents: TenantDocument[] = profile
    ? (await sb
        .from('tenant_documents')
        .select('*')
        .eq('tenant_id', profile.id)
        .in('type', ['cccd_front', 'cccd_back'])
        .then(r => (r.data ?? []) as TenantDocument[]))
    : []

  return (
    <OwnerProfileEditForm
      currentUser={user}
      initialProfile={profile as TenantProfile | null}
      initialDocuments={documents}
    />
  )
}
