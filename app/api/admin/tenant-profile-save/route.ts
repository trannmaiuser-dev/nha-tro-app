import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface Personal {
  full_name?:   string
  dob?:         string
  gender?:      string
  cccd_number?: string
  address?:     string
  occupation?:  string
  avatar_url?:  string
}

interface Documents {
  cccd_front_url?: string
  cccd_back_url?:  string
}

interface Body {
  targetUserId?: string
  personal?:     Personal
  documents?:    Documents
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as Body
  const targetUserId = body.targetUserId
  if (!targetUserId) {
    return NextResponse.json({ error: 'Thiếu targetUserId' }, { status: 400 })
  }
  if (targetUserId === user.userId) {
    return NextResponse.json({ error: 'Dùng /api/profile/owner-save cho chính mình' }, { status: 400 })
  }

  const sb = createServerSupabaseClient()

  const { data: target } = await sb
    .from('users')
    .select('id, role')
    .eq('id', targetUserId)
    .maybeSingle()
  if (!target) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  if (target.role !== 'tenant') {
    return NextResponse.json({ error: 'Chỉ owner có thể sửa hồ sơ tenant' }, { status: 400 })
  }

  const { data: existing } = await sb.from('tenant_profiles')
    .select('id').eq('user_id', targetUserId).maybeSingle()

  let profileId: string
  if (!existing) {
    const { data: created, error } = await sb.from('tenant_profiles')
      .insert({ user_id: targetUserId, profile_status: 'draft' })
      .select('id').single()
    if (error || !created) {
      return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 })
    }
    profileId = created.id
  } else {
    profileId = existing.id
  }

  if (body.personal) {
    const p = body.personal
    const { error } = await sb.from('tenant_profiles').update({
      full_name:   p.full_name   || null,
      dob:         p.dob         || null,
      gender:      p.gender      || null,
      cccd_number: p.cccd_number || null,
      address:     p.address     || null,
      occupation:  p.occupation  || null,
      avatar_url:  p.avatar_url  || null,
      updated_at:  new Date().toISOString(),
    }).eq('id', profileId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (p.full_name) {
      await sb.from('users').update({ full_name: p.full_name }).eq('id', targetUserId)
    }
  }

  if (body.documents) {
    const d = body.documents
    const upsertDoc = async (type: 'cccd_front' | 'cccd_back', url: string) => {
      const { data: existDoc } = await sb.from('tenant_documents')
        .select('id').eq('tenant_id', profileId).eq('type', type).maybeSingle()
      if (existDoc) {
        await sb.from('tenant_documents').update({ file_url: url, file_type: 'image' })
          .eq('id', existDoc.id)
      } else {
        await sb.from('tenant_documents').insert({
          tenant_id: profileId, type, file_url: url, file_type: 'image',
        })
      }
    }
    if (d.cccd_front_url) await upsertDoc('cccd_front', d.cccd_front_url)
    if (d.cccd_back_url)  await upsertDoc('cccd_back',  d.cccd_back_url)
  }

  revalidatePath(`/profile/${targetUserId}`)
  revalidatePath(`/profile/${targetUserId}/edit`)
  revalidatePath('/admin/tenants')
  return NextResponse.json({ success: true, profileId })
}
