/**
 * T-017 — Debt warning notification dispatcher.
 *
 * Layer trên lib/db/invoices.ts (DB helpers) — orchestrate notification flow:
 *   1. Sync debt cho phòng (mark/clear has_debt theo threshold setting)
 *   2. Với mỗi invoice has_debt mới → try acquire 24h notify slot
 *   3. Nếu acquired: insert notifications + fire push cho all active tenants in room
 *
 * Entry point: `processDebtForRoom(roomId)`. Best-effort, không throw.
 * Gọi từ server component khi tenant load page (on-page check pattern).
 *
 * UC-05 spec ([memory/usecase-thu-chi.md](memory/usecase-thu-chi.md) + [task/done/done.026-rpc-transactional-wrap.md](task/done/done.026-rpc-transactional-wrap.md)):
 *   - Cảnh báo theo PHÒNG (tất cả tenant active trong phòng đều nhận)
 *   - Dedup 24h chống spam
 *   - Threshold configurable qua app_settings.debt_warning_threshold_days
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSetting } from '@/lib/db/settings'
import { getTenantsByRoom } from '@/lib/db/room-tenants'
import {
  syncDebtForRoom,
  getOverdueInvoicesByRoom,
  tryAcquireDebtNotifySlot,
  type OverdueInvoice,
} from '@/lib/db/invoices'
import { sendPushNotification, type PushSubscriptionRow } from '@/lib/push'

function asNumber(v: unknown, fb: number): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : fb }
  return fb
}

/**
 * Sync + dispatch debt notification cho 1 phòng. Best-effort: nuốt error, log console.
 *
 * Idempotent: chạy lại trong vòng 24h sẽ không spam push (atomic slot acquire).
 *
 * Returns: { synced, notified } cho observability + Phase E verify.
 */
export async function processDebtForRoom(roomId: string): Promise<{ synced: { marked: number; cleared: number }; notified: number }> {
  try {
    const thresholdRaw = await getSetting<string | number>('debt_warning_threshold_days')
    const thresholdDays = asNumber(thresholdRaw, 0)

    const synced = await syncDebtForRoom(roomId, thresholdDays)
    const overdue = await getOverdueInvoicesByRoom(roomId)

    let notified = 0
    for (const inv of overdue) {
      const acquired = await tryAcquireDebtNotifySlot(inv.id)
      if (!acquired) continue
      await dispatchPushToRoomTenants(roomId, inv)
      notified++
    }
    return { synced, notified }
  } catch (err) {
    console.error('[debt-notify] processDebtForRoom failed (continuing):', err)
    return { synced: { marked: 0, cleared: 0 }, notified: 0 }
  }
}

/**
 * Insert notification row + fire push cho tất cả active tenants trong phòng.
 * Best-effort: lỗi 1 user không block users khác.
 */
async function dispatchPushToRoomTenants(roomId: string, invoice: OverdueInvoice): Promise<void> {
  const sb = createServerSupabaseClient()
  const tenants = await getTenantsByRoom(roomId, true)
  if (tenants.length === 0) return

  // Lấy room name cho UX
  const { data: room } = await sb.from('rooms').select('name').eq('id', roomId).single()
  const roomName = room?.name ?? '?'

  const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400_000))
  const message = `🔴 Hóa đơn phòng ${roomName} tháng ${invoice.month}/${invoice.year} quá hạn ${overdueDays} ngày. Vui lòng thanh toán.`
  const remaining = invoice.total - (invoice.paid_amount ?? 0)

  for (const t of tenants) {
    const userId = t.user_id

    // 1. Insert in-app notification (audit + bell badge)
    await sb.from('notifications').insert({
      sender_id:   null,
      receiver_id: userId,
      type:        'payment_reminder',
      message,
      status:      'pending',
    })

    // 2. Push notification (best-effort)
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
    for (const sub of (subs as PushSubscriptionRow[] | null) ?? []) {
      try {
        await sendPushNotification(sub, {
          title: '🔴 Hóa đơn quá hạn',
          body:  `Phòng ${roomName} - ${invoice.month}/${invoice.year}: ${remaining.toLocaleString('vi-VN')}đ`,
          data:  { type: 'debt_warning', invoice_id: invoice.id, room_id: roomId },
        })
      } catch (err) {
        console.error('[debt-notify] push failed for user', userId, err)
      }
    }
  }
}
