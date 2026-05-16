import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getMyMoveRequest } from '@/lib/db/move-requests'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'tenant') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const request = await getMyMoveRequest(user.userId)
  return NextResponse.json({ request })
}
