import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSession } from '@/lib/auth'

// GET /api/first-login?token=xxx  →  verify token, return user info
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const sb = createServerSupabaseClient()
  const { data: user } = await sb
    .from('users')
    .select('id, phone, full_name, first_login_expires')
    .eq('first_login_token', token)
    .single()

  if (!user) return NextResponse.json({ error: 'Link không hợp lệ' }, { status: 404 })
  if (user.first_login_expires && new Date(user.first_login_expires) < new Date()) {
    return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 })
  }

  return NextResponse.json({ valid: true, phone: user.phone, fullName: user.full_name })
}

// POST /api/first-login  →  set new password, create session
export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json()
  if (!token || !newPassword) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  if (newPassword.length < 6) return NextResponse.json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, { status: 400 })

  const sb = createServerSupabaseClient()
  const { data: user } = await sb
    .from('users')
    .select('id, phone, role, full_name, first_login_expires')
    .eq('first_login_token', token)
    .single()

  if (!user) return NextResponse.json({ error: 'Link không hợp lệ' }, { status: 404 })
  if (user.first_login_expires && new Date(user.first_login_expires) < new Date()) {
    return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await sb.from('users').update({
    password_hash:       passwordHash,
    first_login_token:   null,
    first_login_expires: null,
  }).eq('id', user.id)

  const sessionToken = await createSession({
    userId:   user.id,
    phone:    user.phone,
    role:     user.role,
    fullName: user.full_name,
  })

  const res = NextResponse.json({ success: true })
  res.cookies.set('auth-token', sessionToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
  })
  return res
}
