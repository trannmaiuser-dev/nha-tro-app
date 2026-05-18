/**
 * T-042 — Contract renewal reminder dispatcher.
 *
 * Requirements §3.5: "Nhắc gia hạn hợp đồng sắp hết hạn".
 *
 * Pattern on-page check (giống T-017 / T-039) khi owner load /dashboard.
 * Lấy tất cả membership đang active có contract_end_date trong vòng 30 ngày tới
 * → nếu tháng này chưa notify → insert 1 notification list tổng + best-effort push.
 *
 * Dedup: app_settings.last_contract_check_ym = "YYYY-MM".
 *
 * DB type: 'contract_renewal_reminder' (mới thêm v22). Push data.type cùng tên.
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSetting, setSetting } from '@/lib/db/settings'
import { sendPushNotification, type PushSubscriptionRow } from '@/lib/push'

const WINDOW_DAYS = 30

function ymKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400_000)
}

function fmtDate(s: string): string {
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

interface ContractDue {
  membership_id: string
  user_id:       string
  user_name:     string | null
  room_name:     string | null
  end_date:      string
  days_left:     number
}

/**
 * On-page check khi owner load /dashboard.
 * Best-effort: nuốt error, idempotent qua dedup key tháng.
 *
 * Returns: { notified, count, contracts } cho observability.
 */
export async function notifyContractsExpiringSoon(ownerId: string): Promise<{ notified: boolean; count: number; reason: string }> {
  try {
    const today = new Date()
    const ym = ymKey(today)
    const lastChecked = await getSetting<string>('last_contract_check_ym')
    if (lastChecked === ym) {
      return { notified: false, count: 0, reason: 'already checked this month' }
    }

    const cutoff = new Date(today.getTime() + WINDOW_DAYS * 86400_000).toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    const sb = createServerSupabaseClient()
    type Row = {
      id: string
      user_id: string
      contract_end_date: string
      user: { full_name: string | null } | { full_name: string | null }[] | null
      room: { name: string } | { name: string }[] | null
    }
    const { data, error } = await sb
      .from('room_tenants')
      .select('id, user_id, contract_end_date, user:users!user_id(full_name), room:rooms!room_id(name)')
      .is('left_at', null)
      .not('contract_end_date', 'is', null)
      .gte('contract_end_date', todayStr)
      .lte('contract_end_date', cutoff)
      .order('contract_end_date', { ascending: true })
    if (error) {
      console.error('[contract-notify] query failed:', error.message)
      return { notified: false, count: 0, reason: 'query error' }
    }

    const contracts: ContractDue[] = ((data ?? []) as Row[]).map(r => {
      const user = Array.isArray(r.user) ? r.user[0] : r.user
      const room = Array.isArray(r.room) ? r.room[0] : r.room
      return {
        membership_id: r.id,
        user_id:       r.user_id,
        user_name:     user?.full_name ?? null,
        room_name:     room?.name ?? null,
        end_date:      r.contract_end_date,
        days_left:     daysBetween(today, new Date(r.contract_end_date)),
      }
    })

    if (contracts.length === 0) {
      // Vẫn mark đã check tháng này để khỏi query lại
      await setSetting('last_contract_check_ym', ym)
      return { notified: false, count: 0, reason: 'no contracts due in 30d' }
    }

    const lines = contracts.map(c => {
      const name = c.user_name ?? '(chưa rõ tên)'
      const room = c.room_name ? ` phòng ${c.room_name}` : ''
      return `• ${name}${room}: ${fmtDate(c.end_date)} (còn ${c.days_left} ngày)`
    }).join('\n')
    const message = `📅 ${contracts.length} hợp đồng sắp hết hạn trong 30 ngày tới:\n${lines}\nVào /admin/tenants để gia hạn.`

    const { error: insertErr } = await sb.from('notifications').insert({
      sender_id:   ownerId,
      receiver_id: ownerId,
      type:        'contract_renewal_reminder',
      message,
      status:      'pending',
    })
    if (insertErr) {
      console.error('[contract-notify] insert failed:', insertErr.message)
      return { notified: false, count: contracts.length, reason: 'insert error' }
    }

    // Push (best-effort)
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', ownerId)
    for (const sub of (subs as PushSubscriptionRow[] | null) ?? []) {
      try {
        await sendPushNotification(sub, {
          title: '📅 Hợp đồng sắp hết hạn',
          body:  `${contracts.length} hợp đồng cần gia hạn trong 30 ngày tới.`,
          data:  { type: 'contract_renewal_reminder', count: contracts.length },
        })
      } catch (err) {
        console.error('[contract-notify] push failed:', err)
      }
    }

    await setSetting('last_contract_check_ym', ym)
    return { notified: true, count: contracts.length, reason: 'dispatched' }
  } catch (err) {
    console.error('[contract-notify] exception:', err)
    return { notified: false, count: 0, reason: 'exception' }
  }
}
