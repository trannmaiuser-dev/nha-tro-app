import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = createServerSupabaseClient()

  const { data: profile } = await sb
    .from('tenant_profiles')
    .select('*')
    .eq('user_id', params.userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 })

  const [{ data: emergency }, { data: related }, { data: documents }, { data: tenantUser }] =
    await Promise.all([
      sb.from('emergency_contacts').select('*').eq('tenant_id', profile.id).maybeSingle(),
      sb.from('related_persons').select('*').eq('tenant_id', profile.id),
      sb.from('tenant_documents').select('*').eq('tenant_id', profile.id),
      sb.from('users').select('phone, full_name, is_profile_complete').eq('id', params.userId).single(),
    ])

  return NextResponse.json({
    profile, emergency,
    related:   related   ?? [],
    documents: documents ?? [],
    user:      tenantUser,
  })
}

// Owner confirms profile
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action } = await req.json()
  const sb = createServerSupabaseClient()

  if (action === 'confirm') {
    const { data: profile } = await sb.from('tenant_profiles').select('id').eq('user_id', params.userId).single()
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await sb.from('tenant_profiles').update({ profile_status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', profile.id)
  }

  return NextResponse.json({ success: true })
}
