import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse, RP_ID, ORIGIN } from '@/lib/webauthn'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSession } from '@/lib/auth'
import { isoBase64URL } from '@simplewebauthn/server/helpers'

export async function POST(req: NextRequest) {
  const { phone, assertion } = await req.json()
  const sb = createServerSupabaseClient()

  const { data: user } = await sb
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!user?.webauthn_challenge || !user.webauthn_credential_id || !user.webauthn_public_key) {
    return NextResponse.json({ error: 'Not set up for biometric' }, { status: 400 })
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response:          assertion,
      expectedChallenge: user.webauthn_challenge,
      expectedOrigin:    ORIGIN,
      expectedRPID:      RP_ID,
      authenticator: {
        credentialID:        isoBase64URL.toBuffer(user.webauthn_credential_id),
        credentialPublicKey: isoBase64URL.toBuffer(user.webauthn_public_key),
        counter:             user.webauthn_counter ?? 0,
      },
      requireUserVerification: true,
    })

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 401 })
    }

    // Update counter
    await sb.from('users').update({
      webauthn_counter:   verification.authenticationInfo.newCounter,
      webauthn_challenge: null,
    }).eq('id', user.id)

    const token = await createSession({
      userId:   user.id,
      phone:    user.phone,
      role:     user.role,
      fullName: user.full_name,
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 30,
      path:     '/',
    })
    return response
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
