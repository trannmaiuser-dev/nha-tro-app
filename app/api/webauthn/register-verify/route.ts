import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse, getRpId, getOrigin } from '@/lib/webauthn'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'

export async function POST(req: NextRequest) {
  const { phone, registration } = await req.json()
  const sb = createServerSupabaseClient()

  const { data: user } = await sb
    .from('users')
    .select('id, webauthn_challenge')
    .eq('phone', phone)
    .single()

  if (!user?.webauthn_challenge) {
    return NextResponse.json({ error: 'No challenge found' }, { status: 400 })
  }

  try {
    const verification = await verifyRegistrationResponse({
      response:             registration,
      expectedChallenge:    user.webauthn_challenge,
      expectedOrigin:       getOrigin(),
      expectedRPID:         getRpId(),
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    const { credentialID, credentialPublicKey, counter } =
      verification.registrationInfo

    await sb.from('users').update({
      webauthn_credential_id: isoBase64URL.fromBuffer(credentialID),
      webauthn_public_key:    isoBase64URL.fromBuffer(credentialPublicKey),
      webauthn_counter:       counter,
      webauthn_challenge:     null,
    }).eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
