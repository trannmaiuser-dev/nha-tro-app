import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(_req: NextRequest, { params }: { params: { userId: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createServerSupabaseClient()

  const { data: target } = await sb
    .from('users')
    .select('id, role, tenant_status')
    .eq('id', params.userId)
    .maybeSingle()
  if (!target) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  if (target.role !== 'tenant') {
    return NextResponse.json({ error: 'Chỉ tenant mới có thể archive' }, { status: 400 })
  }

  const { error } = await sb.from('users')
    .update({ tenant_status: 'archived' })
    .eq('id', params.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // End any active room_tenants membership (giữ history qua left_at)
  await sb.from('room_tenants')
    .update({ left_at: new Date().toISOString() })
    .eq('user_id', params.userId)
    .is('left_at', null)

  revalidatePath(`/profile/${params.userId}`)
  revalidatePath('/admin/tenants')
  revalidatePath('/rooms')
  return NextResponse.json({ success: true })
}
