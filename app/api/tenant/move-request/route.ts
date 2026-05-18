import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getMyMoveRequest } from '@/lib/db/move-requests'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'tenant') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // T-020: trả về cả vacant rooms để client render dropdown transfer.
  // Filter: vacant + không phải phòng user đang ở.
  const sb = createServerSupabaseClient()
  const [request, currentMembership, vacantRoomsRes] = await Promise.all([
    getMyMoveRequest(user.userId),
    sb.from('room_tenants').select('room_id').eq('user_id', user.userId).is('left_at', null).limit(1).maybeSingle(),
    sb.from('rooms').select('id, name, floor').eq('status', 'vacant').order('name'),
  ])
  const currentRoomId = currentMembership.data?.room_id
  const transferableRooms = (vacantRoomsRes.data ?? []).filter(r => r.id !== currentRoomId)

  return NextResponse.json({ request, transferableRooms })
}
