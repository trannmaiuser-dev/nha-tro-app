import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions, getRpId } from '@/lib/webauthn'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  const sb = createServerSupabaseClient()

  const { data: user } = await sb
    .from('users')
    .select('id, webauthn_credential_id')
    .eq('phone', phone)
    .single()

  if (!user?.webauthn_credential_id) {
    return NextResponse.json({ error: 'No credential registered' }, { status: 400 })
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: 'preferred',
    allowCredentials: [{
      id:   user.webauthn_credential_id,
      type: 'public-key',
      transports: ['internal'],
    }],
  })

  await sb.from('users').update({ webauthn_challenge: options.challenge }).eq('id', user.id)

  return NextResponse.json(options)
}
