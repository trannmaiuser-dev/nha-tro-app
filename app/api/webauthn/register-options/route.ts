import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions, RP_NAME, getRpId } from '@/lib/webauthn'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  const sb = createServerSupabaseClient()

  const { data: user } = await sb
    .from('users')
    .select('id, phone, full_name, webauthn_credential_id')
    .eq('phone', phone)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const options = await generateRegistrationOptions({
    rpName:                RP_NAME,
    rpID:                  getRpId(),
    userID:                user.id,
    userName:              user.phone,
    userDisplayName:       user.full_name,
    attestationType:       'none',
    authenticatorSelection: {
      residentKey:        'preferred',
      userVerification:   'preferred',
      authenticatorAttachment: 'platform',
    },
    excludeCredentials: user.webauthn_credential_id
      ? [{ id: user.webauthn_credential_id, type: 'public-key' }]
      : [],
  })

  // Store challenge temporarily
  await sb.from('users').update({ webauthn_challenge: options.challenge }).eq('id', user.id)

  return NextResponse.json(options)
}
