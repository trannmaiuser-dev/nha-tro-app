import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function genPassword(len = 8) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from(randomBytes(len)).map(b => chars[b % chars.length]).join('')
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { phone, roomId } = await req.json()
  if (!phone || !roomId) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

  const sb = createServerSupabaseClient()

  // Check phone not already taken
  const { data: existing } = await sb.from('users').select('id').eq('phone', phone).single()
  if (existing) return NextResponse.json({ error: 'Số điện thoại đã tồn tại' }, { status: 409 })

  // Check room belongs to owner and is vacant
  const { data: room } = await sb.from('rooms').select('id, name, status').eq('id', roomId).single()
  if (!room) return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 })
  if (room.status !== 'vacant') return NextResponse.json({ error: 'Phòng đã có người thuê' }, { status: 409 })

  const tempPassword = genPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 10)
  const token        = randomBytes(32).toString('hex')
  const expires      = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Create tenant user
  const { data: newUser, error } = await sb
    .from('users')
    .insert({
      phone,
      password_hash:       passwordHash,
      role:                'tenant',
      full_name:           `Khách phòng ${room.name}`,
      first_login_token:   token,
      first_login_expires: expires,
      is_profile_complete: false,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Assign room
  await sb.from('rooms').update({ tenant_id: newUser.id, status: 'occupied' }).eq('id', roomId)

  // Create blank profile record
  await sb.from('tenant_profiles').insert({ user_id: newUser.id, profile_status: 'draft' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.json({
    userId:       newUser.id,
    phone,
    roomName:     room.name,
    tempPassword,
    loginLink:    `${baseUrl}/first-login?token=${token}`,
    expiresAt:    expires,
  })
}
