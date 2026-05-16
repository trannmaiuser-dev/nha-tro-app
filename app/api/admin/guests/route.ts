import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAllGuests } from '@/lib/db/guests'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const guests = await getAllGuests()
  return NextResponse.json({ guests })
}
