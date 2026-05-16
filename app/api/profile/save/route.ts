import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'tenant') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const sb   = createServerSupabaseClient()

  // Ensure profile record exists
  const { data: existing } = await sb.from('tenant_profiles').select('id').eq('user_id', user.userId).single()

  let profileId: string
  if (!existing) {
    const { data: created } = await sb
      .from('tenant_profiles')
      .insert({ user_id: user.userId, profile_status: 'draft' })
      .select('id').single()
    profileId = created!.id
  } else {
    profileId = existing.id
  }

  // ── Step 1: Personal info ──────────────────────────────────
  if (body.personal) {
    const p = body.personal
    await sb.from('tenant_profiles').update({
      full_name:   p.full_name,
      dob:         p.dob || null,
      gender:      p.gender || null,
      cccd_number: p.cccd_number || null,
      address:     p.address || null,
      occupation:  p.occupation || null,
      avatar_url:  p.avatar_url || null,
      updated_at:  new Date().toISOString(),
    }).eq('id', profileId)

    // Sync full_name to users table
    if (p.full_name) {
      await sb.from('users').update({ full_name: p.full_name }).eq('id', user.userId)
    }
  }

  // ── Step 2: Documents ─────────────────────────────────────
  if (body.documents) {
    const d = body.documents

    const upsertDoc = async (type: string, url: string, customName?: string, fileType?: string) => {
      if (!url) return
      const { data: existDoc } = await sb.from('tenant_documents')
        .select('id').eq('tenant_id', profileId).eq('type', type)
        .maybeSingle()
      if (existDoc) {
        await sb.from('tenant_documents').update({ file_url: url, file_type: fileType || null })
          .eq('id', existDoc.id)
      } else {
        await sb.from('tenant_documents').insert({
          tenant_id: profileId, type, file_url: url,
          file_type: fileType || null, custom_name: customName || null,
        })
      }
    }

    if (d.cccd_front_url) await upsertDoc('cccd_front', d.cccd_front_url, undefined, 'image')
    if (d.cccd_back_url)  await upsertDoc('cccd_back',  d.cccd_back_url,  undefined, 'image')

    if (d.contract_urls?.length) {
      // Delete old contract docs then re-insert
      await sb.from('tenant_documents').delete().eq('tenant_id', profileId).eq('type', 'contract')
      await sb.from('tenant_documents').insert(
        d.contract_urls.map((url: string, i: number) => ({
          tenant_id: profileId, type: 'contract',
          file_url: url, file_type: d.contract_types?.[i] || 'file',
        }))
      )
    }

    if (d.custom_docs?.length) {
      await sb.from('tenant_documents').delete().eq('tenant_id', profileId).eq('type', 'custom')
      await sb.from('tenant_documents').insert(
        d.custom_docs.map((doc: { name: string; url: string; file_type: string }) => ({
          tenant_id: profileId, type: 'custom',
          custom_name: doc.name, file_url: doc.url, file_type: doc.file_type,
        }))
      )
    }
  }

  // ── Step 3: Emergency contact ─────────────────────────────
  if (body.emergency) {
    await sb.from('emergency_contacts').delete().eq('tenant_id', profileId)
    await sb.from('emergency_contacts').insert({ ...body.emergency, tenant_id: profileId })
  }

  // ── Step 4: Related persons ───────────────────────────────
  if (body.related !== undefined) {
    await sb.from('related_persons').delete().eq('tenant_id', profileId)
    if (body.related.length > 0) {
      await sb.from('related_persons').insert(
        body.related.map((p: Record<string, unknown>) => ({ ...p, tenant_id: profileId }))
      )
    }
  }

  // ── Step 5: Submit ────────────────────────────────────────
  if (body.submit) {
    await sb.from('tenant_profiles').update({
      profile_status: 'pending',
      updated_at: new Date().toISOString(),
    }).eq('id', profileId)
    await sb.from('users').update({ is_profile_complete: true }).eq('id', user.userId)
  }

  return NextResponse.json({ success: true, profileId })
}
