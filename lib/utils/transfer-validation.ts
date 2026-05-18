/**
 * T-020 — Validation cho internal transfer (UC-08).
 *
 * Rules:
 *   1. Chỉ được chuyển ngày 1-5 hàng tháng (chốt chu kỳ hóa đơn).
 *   2. Phải chốt hết invoice unpaid phòng nguồn (tất cả tenants trong phòng).
 *   3. Phòng nguồn và đích KHÁC NHAU.
 *   4. Phòng đích phải tồn tại + KHÔNG ở status 'maintenance'.
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface TransferValidationResult {
  ok:      boolean
  reason?: string
}

/**
 * Check hôm nay có phải ngày 1-5 tháng hiện tại không.
 * Trả về { ok: true } nếu cho phép, { ok: false, reason } nếu block.
 */
export function isWithinFirstFiveDays(today: Date = new Date()): TransferValidationResult {
  const day = today.getDate()
  if (day >= 1 && day <= 5) return { ok: true }

  // Suggest next available date
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const nextStr = next.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return {
    ok:     false,
    reason: `Chỉ được chuyển phòng ngày 1-5 hàng tháng. Vui lòng đợi đến ${nextStr}.`,
  }
}

/**
 * Check phòng nguồn còn invoice unpaid không (tất cả tenants trong phòng, không chỉ user request).
 *
 * Returns: { ok: true } nếu hết, { ok: false, reason } nếu còn.
 */
export async function hasUnpaidInvoicesForRoom(roomId: string): Promise<TransferValidationResult> {
  const sb = createServerSupabaseClient()
  const { data, count } = await sb
    .from('invoices')
    .select('id, month, year, total, paid_amount', { count: 'exact' })
    .eq('room_id', roomId)
    .neq('status', 'paid')

  if ((count ?? 0) === 0) return { ok: true }

  const list = (data ?? [])
    .map(inv => `${inv.month}/${inv.year} (còn ${(inv.total - (inv.paid_amount ?? 0)).toLocaleString('vi-VN')}đ)`)
    .join(', ')
  return {
    ok:     false,
    reason: `Phòng nguồn còn ${count} hóa đơn chưa thanh toán: ${list}. Vui lòng chốt hết trước khi chuyển phòng.`,
  }
}

/**
 * Validate đầy đủ trước khi tạo transfer request.
 *
 * Check theo thứ tự: ngày → phòng nguồn/đích → invoice unpaid.
 * Trả về error đầu tiên gặp (fail-fast).
 */
export async function validateTransferRequest(input: {
  fromRoomId: string
  toRoomId:   string
}): Promise<TransferValidationResult> {
  // 1. Date check
  const dateCheck = isWithinFirstFiveDays()
  if (!dateCheck.ok) return dateCheck

  // 2. From/to rooms khác nhau
  if (input.fromRoomId === input.toRoomId) {
    return { ok: false, reason: 'Phòng nguồn và đích phải khác nhau.' }
  }

  // 3. Phòng đích tồn tại + không maintenance
  const sb = createServerSupabaseClient()
  const { data: toRoom } = await sb
    .from('rooms')
    .select('id, status, name')
    .eq('id', input.toRoomId)
    .maybeSingle()
  if (!toRoom) return { ok: false, reason: 'Phòng đích không tồn tại.' }
  if (toRoom.status === 'maintenance') {
    return { ok: false, reason: `Phòng ${toRoom.name} đang sửa chữa, không thể nhận khách mới.` }
  }

  // 4. Unpaid invoices phòng nguồn
  const invoiceCheck = await hasUnpaidInvoicesForRoom(input.fromRoomId)
  if (!invoiceCheck.ok) return invoiceCheck

  return { ok: true }
}
