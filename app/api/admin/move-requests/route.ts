import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getMoveRequests } from '@/lib/db/move-requests'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const requests = await getMoveRequests()
  return NextResponse.json({ requests })
}
