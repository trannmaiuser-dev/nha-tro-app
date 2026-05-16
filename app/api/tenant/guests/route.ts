import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getGuestsByTenant } from '@/lib/db/guests'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'tenant') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const guests = await getGuestsByTenant(user.userId)
  return NextResponse.json({ guests })
}
