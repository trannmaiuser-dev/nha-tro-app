import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSession, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { phone, password } = await req.json()

  if (!phone || !password) {
    return NextResponse.json({ error: 'Thiếu số điện thoại hoặc mật khẩu' }, { status: 400 })
  }

  const sb = createServerSupabaseClient()
  const { data: user, error } = await sb
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: 'Số điện thoại chưa đăng ký' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Mật khẩu không đúng' }, { status: 401 })
  }

  const token = await createSession({
    userId:            user.id,
    phone:             user.phone,
    role:              user.role,
    fullName:          user.full_name,
    isProfileComplete: user.is_profile_complete ?? true,
  })

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, phone: user.phone, role: user.role, fullName: user.full_name },
  })

  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
  })

  return response
}
