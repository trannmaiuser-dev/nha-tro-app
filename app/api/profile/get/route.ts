import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerSupabaseClient()

  const { data: profile } = await sb
    .from('tenant_profiles')
    .select('*')
    .eq('user_id', user.userId)
    .single()

  if (!profile) return NextResponse.json({ profile: null })

  const [{ data: emergency }, { data: related }, { data: documents }] = await Promise.all([
    sb.from('emergency_contacts').select('*').eq('tenant_id', profile.id).limit(1).maybeSingle(),
    sb.from('related_persons').select('*').eq('tenant_id', profile.id),
    sb.from('tenant_documents').select('*').eq('tenant_id', profile.id),
  ])

  return NextResponse.json({ profile, emergency, related: related ?? [], documents: documents ?? [] })
}
