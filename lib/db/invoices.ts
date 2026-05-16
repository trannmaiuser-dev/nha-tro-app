import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAllSettings } from '@/lib/db/settings'
import { getMeterReadingByRoomMonth } from '@/lib/db/meter-readings'
import type {
  Invoice,
  InvoiceExtraItem,
  InvoiceStatus,
  WaterBillingMode,
} from '@/types'

/**
 * Kết quả tính hóa đơn (chưa lưu DB) — dùng để hiển thị preview cho admin.
 */
export interface InvoiceCalcResult {
  room_id:            string
  room_name:          string
  rent_amount:        number
  electricity_amount: number
  electricity_log_id: string | null
  kwh_usage:          number
  electricity_rate:   number
  water_billing_mode: WaterBillingMode
  water_amount:       number
  water_detail:       string  // human-readable
  trash_fee:          number
  parking_fee:        number
  internet_fee:       number
  over_capacity_fee:  number
  extra_items:        InvoiceExtraItem[]
  total:              number
  due_date:           string
  /** Cảnh báo cho admin (nếu có) */
  warnings:           string[]
}

function asNumber(v: unknown, fb: number): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : fb }
  return fb
}
function asBool(v: unknown): boolean {
  return v === true || v === 'true'
}

/**
 * Tính hóa đơn cho 1 phòng trong (month, year). KHÔNG ghi DB.
 *
 * Công thức:
 *   total = rent_amount
 *         + electricity_amount (kwh_usage × electricity_rate)
 *         + water_amount (theo mode)
 *         + 4 phí khác (nếu enabled trong settings)
 *
 * Cần input: room.price, room.electricity_rate (hoặc default từ settings),
 *            electricity_logs cho (room, month, year), số người trong phòng (cho per_person + over_capacity).
 */
export async function calculateInvoiceForRoom(
  roomId: string,
  month: number,
  year: number,
): Promise<InvoiceCalcResult> {
  const sb = createServerSupabaseClient()

  const [roomRes, settings, meter] = await Promise.all([
    sb.from('rooms').select('id, name, price, electricity_rate').eq('id', roomId).single(),
    getAllSettings(),
    getMeterReadingByRoomMonth(roomId, month, year),
  ])

  if (roomRes.error || !roomRes.data) throw new Error('Không tìm thấy phòng')
  const room = roomRes.data as { id: string; name: string; price: number; electricity_rate: number | null }

  // Đếm số tenant đang ở phòng (cần cho per_person và over_capacity)
  const { count: peopleCount } = await sb
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'tenant')
  // NOTE: Schema hiện tại chỉ link 1 tenant_id qua rooms — chưa hỗ trợ nhiều người/phòng.
  // Tạm dùng count = 1 nếu phòng có tenant, 0 nếu trống. Sẽ refactor khi có bảng room_tenants.
  const { data: roomWithTenant } = await sb
    .from('rooms').select('tenant_id').eq('id', roomId).maybeSingle()
  const numPeople = roomWithTenant?.tenant_id ? 1 : 0
  void peopleCount

  const warnings: string[] = []

  // ─── Tiền phòng ─────────────────────────────────────────
  const rent_amount = room.price ?? 0

  // ─── Tiền điện ──────────────────────────────────────────
  const electricity_rate = room.electricity_rate ?? asNumber(settings.electricity_rate_default, 4000)
  let electricity_amount = 0
  let kwh_usage = 0
  let electricity_log_id: string | null = null
  if (meter) {
    electricity_log_id = meter.id
    kwh_usage = (meter.curr_kwh ?? 0) - (meter.prev_kwh ?? 0)
    if (kwh_usage < 0) warnings.push('⚠️ Chỉ số điện giảm (đồng hồ reset?). Vui lòng kiểm tra.')
    electricity_amount = Math.max(0, kwh_usage) * electricity_rate
  } else {
    warnings.push('Chưa nhập chỉ số điện cho tháng này.')
  }

  // ─── Tiền nước ──────────────────────────────────────────
  const water_billing_mode = (settings.water_billing_mode as WaterBillingMode) ?? 'per_m3'
  let water_amount = 0
  let water_detail = ''
  if (water_billing_mode === 'per_m3') {
    const rate = asNumber(settings.water_rate_per_m3, 15000)
    const usage = meter?.water_usage_m3 ?? null
    if (usage == null) {
      warnings.push('Chưa nhập chỉ số nước (mode per_m3).')
      water_detail = `${rate.toLocaleString('vi-VN')}đ/m³ (chưa có chỉ số)`
    } else {
      if (usage < 0) warnings.push('⚠️ Chỉ số nước giảm. Kiểm tra lại.')
      water_amount = Math.max(0, usage) * rate
      water_detail = `${usage} m³ × ${rate.toLocaleString('vi-VN')}đ`
    }
  } else if (water_billing_mode === 'per_person') {
    const rate = asNumber(settings.water_rate_per_person, 50000)
    water_amount = numPeople * rate
    water_detail = `${numPeople} người × ${rate.toLocaleString('vi-VN')}đ`
  } else {
    const rate = asNumber(settings.water_rate_fixed, 100000)
    water_amount = rate
    water_detail = `Cố định ${rate.toLocaleString('vi-VN')}đ/phòng`
  }

  // ─── 4 phí khác ─────────────────────────────────────────
  const trash_fee    = asBool(settings.trash_fee_enabled)    ? asNumber(settings.trash_fee_amount, 0)        : 0
  const parking_fee  = asBool(settings.parking_fee_enabled)  ? asNumber(settings.parking_fee_per_vehicle, 0) : 0
  const internet_fee = asBool(settings.internet_fee_enabled) ? asNumber(settings.internet_fee_amount, 0)    : 0
  let over_capacity_fee = 0
  if (asBool(settings.over_capacity_fee_enabled)) {
    const threshold = asNumber(settings.over_capacity_threshold, 3)
    if (numPeople > threshold) {
      over_capacity_fee = asNumber(settings.over_capacity_fee_amount, 0)
    }
  }

  // ─── Hạn đóng tiền ──────────────────────────────────────
  const dueDay = asNumber(settings.payment_due_day, 5)
  // Hóa đơn tháng X → hạn đóng tháng X+1 ngày dueDay
  const dueMonth = month === 12 ? 1    : month + 1
  const dueYear  = month === 12 ? year + 1 : year
  const due_date = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

  const total =
    rent_amount + electricity_amount + water_amount +
    trash_fee + parking_fee + internet_fee + over_capacity_fee

  return {
    room_id:            room.id,
    room_name:          room.name,
    rent_amount,
    electricity_amount,
    electricity_log_id,
    kwh_usage:          Math.max(0, kwh_usage),
    electricity_rate,
    water_billing_mode,
    water_amount,
    water_detail,
    trash_fee,
    parking_fee,
    internet_fee,
    over_capacity_fee,
    extra_items:        [],
    total,
    due_date,
    warnings,
  }
}

/**
 * Tính hóa đơn preview cho 1 list phòng.
 */
export async function calculateInvoicesPreview(
  roomIds: string[], month: number, year: number,
): Promise<InvoiceCalcResult[]> {
  return Promise.all(roomIds.map(id => calculateInvoiceForRoom(id, month, year)))
}

/* ───── CRUD ───── */

export interface InvoiceCreateRow {
  room_id:            string
  rent_amount:        number
  electricity_amount: number
  electricity_log_id: string | null
  water_billing_mode: WaterBillingMode
  water_amount:       number
  trash_fee:          number
  parking_fee:        number
  internet_fee:       number
  over_capacity_fee:  number
  extra_items:        InvoiceExtraItem[]
  total:              number
  due_date:           string
  note?:              string | null
}

export async function createInvoices(
  month: number, year: number,
  rows: InvoiceCreateRow[],
  createdBy: string | null,
): Promise<{ created: number; skipped: string[] }> {
  if (rows.length === 0) return { created: 0, skipped: [] }
  const sb = createServerSupabaseClient()

  // Lọc phòng đã có hóa đơn tháng này
  const { data: existing } = await sb
    .from('invoices').select('room_id')
    .eq('month', month).eq('year', year)
    .in('room_id', rows.map(r => r.room_id))
  const existingIds = new Set((existing ?? []).map(r => r.room_id))
  const newRows = rows.filter(r => !existingIds.has(r.room_id))
  const skipped: string[] = Array.from(existingIds)

  if (newRows.length > 0) {
    const insertData = newRows.map(r => ({
      room_id:            r.room_id,
      month, year,
      rent_amount:        r.rent_amount,
      electricity_amount: r.electricity_amount,
      electricity_log_id: r.electricity_log_id,
      water_billing_mode: r.water_billing_mode,
      water_amount:       r.water_amount,
      trash_fee:          r.trash_fee,
      parking_fee:        r.parking_fee,
      internet_fee:       r.internet_fee,
      over_capacity_fee:  r.over_capacity_fee,
      extra_items:        r.extra_items,
      total:              r.total,
      due_date:           r.due_date,
      note:               r.note ?? null,
      created_by:         createdBy,
    }))
    const { error } = await sb.from('invoices').insert(insertData)
    if (error) throw new Error('Không thể lưu hóa đơn: ' + error.message)
  }

  return { created: newRows.length, skipped }
}

export interface InvoiceFilters {
  month?:  number
  year?:   number
  status?: InvoiceStatus
  roomId?: string
}

export async function getInvoices(filters: InvoiceFilters = {}): Promise<Invoice[]> {
  const sb = createServerSupabaseClient()
  let q = sb.from('invoices').select('*, room:rooms(id, name, floor)').order('year', { ascending: false }).order('month', { ascending: false }).order('room_id')
  if (filters.month != null)  q = q.eq('month',   filters.month)
  if (filters.year  != null)  q = q.eq('year',    filters.year)
  if (filters.status)         q = q.eq('status',  filters.status)
  if (filters.roomId)         q = q.eq('room_id', filters.roomId)
  const { data, error } = await q
  if (error) throw new Error('Không thể tải hóa đơn')
  return data ?? []
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('invoices')
    .select('*, room:rooms(id, name, floor), electricity_log:electricity_logs(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) return null
  return data
}

export async function updateInvoice(
  id: string,
  patch: Partial<InvoiceCreateRow & { note: string | null }>,
): Promise<Invoice> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('invoices')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error('Không thể cập nhật hóa đơn')
  return data
}

export async function deleteInvoice(id: string): Promise<void> {
  const sb = createServerSupabaseClient()
  // Block xóa nếu đã có payment proof
  const { count } = await sb
    .from('payment_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_id', id)
  if ((count ?? 0) > 0) {
    throw new Error('Không thể xóa: hóa đơn đã có bằng chứng thanh toán')
  }
  const { error } = await sb.from('invoices').delete().eq('id', id)
  if (error) throw new Error('Không thể xóa hóa đơn')
}
