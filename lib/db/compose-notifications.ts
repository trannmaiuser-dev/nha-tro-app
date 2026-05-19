import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface CreateComposeInput {
  senderId:              string
  title:                 string
  body:                  string
  recipientIds:          string[]
  scheduledAt?:          string | null  // ISO timestamp; null = send now
  repeatIntervalMinutes?: number | null  // null = no repeat
  repeatUntilAck?:       boolean
}

export interface ComposeNotificationRow {
  id:                     string
  sender_id:              string
  title:                  string
  body:                   string
  scheduled_at:           string | null
  repeat_interval_minutes: number | null
  repeat_until_ack:       boolean
  next_due_at:            string | null
  created_at:             string
}

/**
 * Create a new compose_notifications + recipients rows. If scheduled_at is in
 * the past or null, also dispatches immediately so user sees notifications now.
 */
export async function createComposeNotification(input: CreateComposeInput) {
  const sb = createServerSupabaseClient()
  const now = new Date()
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
  const dueAt = scheduledAt && scheduledAt > now ? scheduledAt : now

  const { data: compose, error } = await sb
    .from('compose_notifications')
    .insert({
      sender_id:               input.senderId,
      title:                   input.title,
      body:                    input.body,
      scheduled_at:            input.scheduledAt,
      repeat_interval_minutes: input.repeatIntervalMinutes ?? null,
      repeat_until_ack:        input.repeatUntilAck ?? false,
      next_due_at:             dueAt.toISOString(),
    })
    .select('*')
    .single()
  if (error || !compose) throw new Error(error?.message || 'Create failed')

  const recipientRows = input.recipientIds.map(id => ({
    compose_id:   compose.id,
    recipient_id: id,
  }))
  const { error: rError } = await sb
    .from('compose_notification_recipients')
    .insert(recipientRows)
  if (rError) throw new Error(rError.message)

  // If due now (no future schedule), dispatch immediately
  if (dueAt <= now) {
    await dispatchDueForUser(input.senderId, compose.id)
  }

  return compose as ComposeNotificationRow
}

/**
 * On-demand dispatch: find compose_notifications due for the given user, push
 * into notifications table for that user, advance next_due_at if repeat.
 *
 * Called from /notifications page load to ensure user sees fresh dispatches.
 */
export async function dispatchDueForUser(userId: string, onlyComposeId?: string) {
  const sb = createServerSupabaseClient()
  const now = new Date()

  // Find compose notifications where this user is an unacked recipient AND
  // the parent is due. If onlyComposeId provided, scope to that compose row.
  let q = sb.from('compose_notifications')
    .select('id, sender_id, title, body, scheduled_at, repeat_interval_minutes, repeat_until_ack, next_due_at')
    .lte('next_due_at', now.toISOString())
  if (onlyComposeId) q = q.eq('id', onlyComposeId)
  const { data: composes } = await q

  if (!composes || composes.length === 0) return 0

  let dispatched = 0
  for (const compose of composes) {
    // Find this user's recipient row (unacked only — if acked, skip)
    const { data: recipient } = await sb.from('compose_notification_recipients')
      .select('id, acked_at, last_dispatched_at')
      .eq('compose_id', compose.id)
      .eq('recipient_id', userId)
      .maybeSingle()
    if (!recipient || recipient.acked_at) continue

    // Insert into notifications table for this user
    await sb.from('notifications').insert({
      sender_id:   compose.sender_id,
      receiver_id: userId,
      type:        'compose_message',
      message:     `${compose.title}\n\n${compose.body}`,
      compose_id:  compose.id,
    })
    await sb.from('compose_notification_recipients')
      .update({ last_dispatched_at: now.toISOString() })
      .eq('id', recipient.id)
    dispatched++

    // Advance next_due_at if repeat configured
    await advanceNextDueIfNeeded(compose, now)
  }

  return dispatched
}

async function advanceNextDueIfNeeded(
  compose: Pick<ComposeNotificationRow, 'id' | 'repeat_interval_minutes' | 'repeat_until_ack'>,
  now: Date,
) {
  const sb = createServerSupabaseClient()

  if (!compose.repeat_interval_minutes) {
    // No repeat — stop after first dispatch
    await sb.from('compose_notifications')
      .update({ next_due_at: null })
      .eq('id', compose.id)
    return
  }

  if (compose.repeat_until_ack) {
    // Check if any recipient still unacked
    const { count } = await sb.from('compose_notification_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('compose_id', compose.id)
      .is('acked_at', null)
    if (!count || count === 0) {
      await sb.from('compose_notifications')
        .update({ next_due_at: null })
        .eq('id', compose.id)
      return
    }
  }

  // Schedule next
  const next = new Date(now.getTime() + compose.repeat_interval_minutes * 60_000)
  await sb.from('compose_notifications')
    .update({ next_due_at: next.toISOString() })
    .eq('id', compose.id)
}

/**
 * Mark a notification (linked to compose_id) as acked by the receiver.
 * Returns whether ack was applied.
 */
export async function ackNotification(notificationId: string, userId: string) {
  const sb = createServerSupabaseClient()

  const { data: notif } = await sb.from('notifications')
    .select('id, receiver_id, compose_id')
    .eq('id', notificationId)
    .maybeSingle()
  if (!notif) return { ok: false, error: 'Không tìm thấy thông báo' as const }
  if (notif.receiver_id !== userId) return { ok: false, error: 'Không có quyền' as const }
  if (!notif.compose_id) return { ok: false, error: 'Thông báo này không cần xác nhận' as const }

  const { error } = await sb.from('compose_notification_recipients')
    .update({ acked_at: new Date().toISOString() })
    .eq('compose_id', notif.compose_id)
    .eq('recipient_id', userId)
  if (error) return { ok: false, error: error.message }

  // Also mark notification status='read' so list UI hides ack button
  await sb.from('notifications').update({ status: 'read' }).eq('id', notificationId)

  return { ok: true as const }
}
