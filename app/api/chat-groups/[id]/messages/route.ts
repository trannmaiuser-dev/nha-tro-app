import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getGroupForUser, getMessagesForGroup } from '@/lib/db/chat-groups'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getGroupForUser(params.id, user.userId)
  if (!ctx) return NextResponse.json({ error: 'Not found or no permission' }, { status: 404 })

  const messages = await getMessagesForGroup(params.id, 200)
  return NextResponse.json(messages)
}
