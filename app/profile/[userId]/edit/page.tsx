import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProfileEditForm from '@/components/ProfileEditForm'
import type { TenantProfile, TenantDocument } from '@/types'

export const dynamic = 'force-dynamic'

export default async function TenantProfileEditPage({ params }: { params: { userId: string } }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard')

  const sb = createServerSupabaseClient()

  const { data: targetUser } = await sb
    .from('users')
    .select('id, role, full_name, phone')
    .eq('id', params.userId)
    .maybeSingle()
  if (!targetUser) notFound()
  if (targetUser.role !== 'tenant') redirect(`/profile/${params.userId}`)

  const { data: profile } = await sb
    .from('tenant_profiles')
    .select('*')
    .eq('user_id', params.userId)
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
    <ProfileEditForm
      headerTitle={`Sửa hồ sơ: ${targetUser.full_name || 'khách'}`}
      cancelHref={`/profile/${params.userId}`}
      successHref={`/profile/${params.userId}`}
      phone={targetUser.phone || ''}
      initialFullName={targetUser.full_name || ''}
      initialProfile={profile as TenantProfile | null}
      initialDocuments={documents}
      saveEndpoint="/api/admin/tenant-profile-save"
      targetUserId={params.userId}
    />
  )
}
