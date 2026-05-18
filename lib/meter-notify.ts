/**
 * T-039 — Meter reading reminder notification dispatcher.
 *
 * UC-08 usecase-thu-chi: "Đến ngày meter_reading_day → hệ thống gửi notification
 * 'Đến hạn chốt chỉ số tháng X'."
 *
 * Pattern on-page check (giống processDebtForRoom T-017): khi owner load
 * /dashboard, nếu today.getDate() === meter_reading_day && chưa notify tháng này
 * → insert notification + best-effort push.
 *
 * Dedup: app_settings key `last_meter_reading_notify_ym` = "YYYY-MM".
 *
 * DB type: tái dụng 'payment_reminder' (semantic gần) để tránh ALTER CHECK
 * constraint migration. Push data.type='meter_reading_reminder' để client phân biệt
 * (cùng pattern T-037 D1).
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSetting, setSetting } from '@/lib/db/settings'
import { sendPushNotification, type PushSubscriptionRow } from '@/lib/push'

function ymKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

function asNumber(v: unknown, fb: number): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : fb }
  return fb
}

/**
 * Nếu hôm nay là `meter_reading_day` và tháng này chưa notify → insert + push.
 * Best-effort: nuốt error, log console. Idempotent qua dedup key.
 *
 * Returns: { notified, reason } cho observability.
 */
export async function notifyMeterReadingIfDue(ownerId: string): Promise<{ notified: boolean; reason: string }> {
  try {
    const meterDayRaw = await getSetting<string | number>('meter_reading_day')
    const meterDay = asNumber(meterDayRaw, 1)
    const today = new Date()
    if (today.getDate() !== meterDay) {
      return { notified: false, reason: 'not meter day' }
    }

    const ym = ymKey(today)
    const lastNotified = await getSetting<string>('last_meter_reading_notify_ym')
    if (lastNotified === ym) {
      return { notified: false, reason: 'already notified this month' }
    }

    const month = today.getMonth() + 1
    const year  = today.getFullYear()
    const message = `🔧 Đến hạn chốt chỉ số điện nước tháng ${month}/${year}. Vào /admin/utilities để nhập số.`

    const sb = createServerSupabaseClient()
    const { error } = await sb.from('notifications').insert({
      sender_id:   ownerId,
      receiver_id: ownerId,
      type:        'payment_reminder',
      message,
      status:      'pending',
    })
    if (error) {
      console.error('[meter-notify] insert failed:', error.message)
      return { notified: false, reason: 'insert error' }
    }

    // Push (best-effort)
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', ownerId)
    for (const sub of (subs as PushSubscriptionRow[] | null) ?? []) {
      try {
        await sendPushNotification(sub, {
          title: '🔧 Đến hạn chốt chỉ số',
          body:  `Tháng ${month}/${year}: hãy chốt chỉ số điện nước tất cả phòng.`,
          data:  { type: 'meter_reading_reminder', month, year },
        })
      } catch (err) {
        console.error('[meter-notify] push failed:', err)
      }
    }

    // Mark dedup
    await setSetting('last_meter_reading_notify_ym', ym)
    return { notified: true, reason: 'dispatched' }
  } catch (err) {
    console.error('[meter-notify] notifyMeterReadingIfDue error:', err)
    return { notified: false, reason: 'exception' }
  }
}
