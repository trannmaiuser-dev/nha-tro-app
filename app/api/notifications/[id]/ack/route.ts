import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { ackNotification } from '@/lib/db/compose-notifications'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await ackNotification(params.id, user.userId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/notifications')
  return NextResponse.json({ success: true })
}
