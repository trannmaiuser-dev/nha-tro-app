import { createServerSupabaseClient } from '@/lib/supabase-server'

export type NotificationType =
  | 'payment_reminder'
  | 'payment_reported'
  | 'payment_confirmed'
  | 'payment_rejected'
  | 'extension_request'
  | 'extension_approved'
  | 'extension_rejected'

export interface NotificationInput {
  type:    NotificationType
  message: string
}

/**
 * Gửi notification từ 1 user tới TẤT CẢ admin (role='owner').
 * Dùng khi tenant cần thông báo cho chủ trọ (vd: báo đã thanh toán).
 * Lỗi khi insert được log nhưng KHÔNG throw — notification là phụ.
 */
export async function notifyOwner(senderId: string, input: NotificationInput): Promise<void> {
  try {
    const sb = createServerSupabaseClient()
    const { data: owners } = await sb.from('users').select('id').eq('role', 'owner')
    if (!owners || owners.length === 0) return
    const rows = owners.map(o => ({
      sender_id:   senderId,
      receiver_id: o.id,
      type:        input.type,
      message:     input.message,
    }))
    const { error } = await sb.from('notifications').insert(rows)
    if (error) console.error('[notifyOwner] insert failed:', error.message)
  } catch (err) {
    console.error('[notifyOwner] unexpected error:', err)
  }
}

/**
 * Gửi notification từ 1 user tới 1 user cụ thể.
 * Dùng khi admin thông báo cho tenant (vd: duyệt/từ chối thanh toán).
 * Lỗi khi insert được log nhưng KHÔNG throw — notification là phụ.
 */
export async function notifyUser(
  senderId: string,
  receiverId: string,
  input: NotificationInput,
): Promise<void> {
  try {
    const sb = createServerSupabaseClient()
    const { error } = await sb.from('notifications').insert({
      sender_id:   senderId,
      receiver_id: receiverId,
      type:        input.type,
      message:     input.message,
    })
    if (error) console.error('[notifyUser] insert failed:', error.message)
  } catch (err) {
    console.error('[notifyUser] unexpected error:', err)
  }
}
