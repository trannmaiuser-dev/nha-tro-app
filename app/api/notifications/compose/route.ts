import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createComposeNotification } from '@/lib/db/compose-notifications'

interface Body {
  title:                  string
  body:                   string
  recipientIds:           string[]
  scheduledAt?:           string | null
  repeatIntervalMinutes?: number | null
  repeatUntilAck?:        boolean
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Body
  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: 'Tiêu đề và nội dung không được trống' }, { status: 400 })
  }
  if (!Array.isArray(body.recipientIds) || body.recipientIds.length === 0) {
    return NextResponse.json({ error: 'Chọn ít nhất 1 người nhận' }, { status: 400 })
  }

  try {
    const compose = await createComposeNotification({
      senderId:              user.userId,
      title:                 body.title.trim(),
      body:                  body.body.trim(),
      recipientIds:          body.recipientIds,
      scheduledAt:           body.scheduledAt ?? null,
      repeatIntervalMinutes: body.repeatIntervalMinutes ?? null,
      repeatUntilAck:        body.repeatUntilAck ?? false,
    })
    revalidatePath('/notifications')
    revalidatePath('/notifications/compose')
    return NextResponse.json({ success: true, composeId: compose.id })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
