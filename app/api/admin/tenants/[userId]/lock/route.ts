import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface Body {
  locked: boolean
  reason?: string
}

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as Body
  const sb   = createServerSupabaseClient()

  const { data: target } = await sb
    .from('users')
    .select('id, role')
    .eq('id', params.userId)
    .maybeSingle()
  if (!target) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  if (target.role !== 'tenant') {
    return NextResponse.json({ error: 'Chỉ tenant mới có thể bị tạm khóa' }, { status: 400 })
  }

  const update: { locked_at: string | null; locked_reason: string | null } = body.locked
    ? { locked_at: new Date().toISOString(), locked_reason: body.reason?.trim() || null }
    : { locked_at: null, locked_reason: null }

  const { error } = await sb.from('users').update(update).eq('id', params.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/profile/${params.userId}`)
  revalidatePath('/admin/tenants')
  return NextResponse.json({ success: true, locked: body.locked })
}
