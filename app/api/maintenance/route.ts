import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notifyOwner } from '@/lib/db/notifications'
import { sendPushNotification, type PushSubscriptionRow } from '@/lib/push'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('maintenance_requests')
    .select('*, reporter:users!reporter_id(id, full_name, role)')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description, imageUrl } = await req.json()
  const desc = description?.trim()
  if (!desc) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('maintenance_requests')
    .insert({ reporter_id: user.userId, description: desc, image_url: imageUrl || null })
    .select('*, reporter:users!reporter_id(id, full_name, role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // T-037: dispatch notification + push cho owner (best-effort, không block return).
  // Reuse type='extension_request' (CHECK constraint allowed list v13) — semantic gần.
  // Future: add type='maintenance_new' nếu cần phân biệt UI.
  void dispatchMaintenanceNotify(user.userId, desc, data.id).catch(err => {
    console.error('[maintenance/POST] notify dispatch failed:', err)
  })

  return NextResponse.json(data)
}

async function dispatchMaintenanceNotify(reporterId: string, description: string, requestId: string): Promise<void> {
  const sb = createServerSupabaseClient()
  const truncated = description.length > 50 ? description.slice(0, 50) + '…' : description

  // Get reporter name cho message UX
  const { data: reporter } = await sb.from('users').select('full_name, phone').eq('id', reporterId).single()
  const reporterLabel = reporter?.full_name ?? reporter?.phone ?? 'Khách'

  const message = `🔧 ${reporterLabel} báo sự cố: ${truncated}`

  // 1. Insert notifications row cho mọi owner (notifyOwner handle best-effort)
  await notifyOwner(reporterId, {
    type:    'extension_request',
    message,
  })

  // 2. Push notification cho mọi owner subscription (best-effort per-sub)
  const { data: owners } = await sb.from('users').select('id').eq('role', 'owner')
  for (const owner of owners ?? []) {
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', owner.id)
    for (const sub of (subs as PushSubscriptionRow[] | null) ?? []) {
      try {
        await sendPushNotification(sub, {
          title: '🔧 Sự cố mới',
          body:  `${reporterLabel}: ${truncated}`,
          data:  { type: 'maintenance_new', request_id: requestId },
        })
      } catch (err) {
        console.error('[maintenance/POST] push failed for owner', owner.id, err)
      }
    }
  }
}
