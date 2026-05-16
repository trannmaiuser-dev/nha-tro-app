import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { markPasswordChanged } from '@/lib/db/tenants'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'tenant') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const { newPassword } = await req.json()
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' }, { status: 400 })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  const sb   = createServerSupabaseClient()

  const { error } = await sb.from('users').update({ password_hash: hash }).eq('id', user.userId)
  if (error) return NextResponse.json({ error: 'Không thể đổi mật khẩu' }, { status: 500 })

  await markPasswordChanged(user.userId)
  return NextResponse.json({ success: true })
}
