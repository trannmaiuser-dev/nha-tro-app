import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { ElectricityLog } from '@/types'

export interface MeterReadingUpsertInput {
  room_id:       string
  month:         number
  year:          number
  prev_kwh:      number
  curr_kwh:      number
  prev_water_m3?: number | null
  curr_water_m3?: number | null
  recorded_by?:  string | null
}

export async function getMeterReadingsByMonth(month: number, year: number): Promise<ElectricityLog[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('electricity_logs')
    .select('*, room:rooms(id, name)')
    .eq('month', month).eq('year', year)
    .order('room_id')
  if (error) throw new Error('Không thể lấy chỉ số tháng')
  return data ?? []
}

export async function getLatestMeterReadingByRoom(roomId: string): Promise<ElectricityLog | null> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('electricity_logs')
    .select('*')
    .eq('room_id', roomId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}

export async function getMeterReadingByRoomMonth(
  roomId: string, month: number, year: number,
): Promise<ElectricityLog | null> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('electricity_logs')
    .select('*')
    .eq('room_id', roomId).eq('month', month).eq('year', year)
    .maybeSingle()
  if (error) return null
  return data
}

/**
 * Lấy chỉ số tháng trước của 1 phòng (để pre-fill `prev_kwh` của tháng mới).
 * Cụ thể: lấy `curr_kwh` của bản ghi gần nhất trước (month, year).
 */
export async function getPreviousReading(
  roomId: string, month: number, year: number,
): Promise<{ prev_kwh: number; prev_water_m3: number | null } | null> {
  const sb = createServerSupabaseClient()
  // Tìm record trước (year, month) gần nhất
  const { data, error } = await sb
    .from('electricity_logs')
    .select('curr_kwh, curr_water_m3, year, month')
    .eq('room_id', roomId)
    .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return {
    prev_kwh:      data.curr_kwh ?? 0,
    prev_water_m3: data.curr_water_m3 ?? null,
  }
}

export async function upsertMeterReading(input: MeterReadingUpsertInput): Promise<ElectricityLog> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('electricity_logs')
    .upsert({
      room_id:       input.room_id,
      month:         input.month,
      year:          input.year,
      prev_kwh:      input.prev_kwh,
      curr_kwh:      input.curr_kwh,
      prev_water_m3: input.prev_water_m3 ?? null,
      curr_water_m3: input.curr_water_m3 ?? null,
      recorded_by:   input.recorded_by ?? null,
    }, { onConflict: 'room_id,month,year' })
    .select()
    .single()
  if (error) throw new Error(`Không thể lưu chỉ số phòng: ${error.message}`)
  return data
}

export async function upsertMeterReadingsBulk(inputs: MeterReadingUpsertInput[]): Promise<void> {
  if (inputs.length === 0) return
  const sb = createServerSupabaseClient()
  const rows = inputs.map(i => ({
    room_id:       i.room_id,
    month:         i.month,
    year:          i.year,
    prev_kwh:      i.prev_kwh,
    curr_kwh:      i.curr_kwh,
    prev_water_m3: i.prev_water_m3 ?? null,
    curr_water_m3: i.curr_water_m3 ?? null,
    recorded_by:   i.recorded_by ?? null,
  }))
  const { error } = await sb
    .from('electricity_logs')
    .upsert(rows, { onConflict: 'room_id,month,year' })
  if (error) throw new Error('Không thể lưu chỉ số: ' + error.message)
}

/**
 * Sửa 1 chỉ số đã nhập + ghi audit log.
 */
export async function updateMeterReadingWithAudit(
  id: string,
  changes: Partial<Pick<ElectricityLog, 'prev_kwh' | 'curr_kwh' | 'prev_water_m3' | 'curr_water_m3'>>,
  reason: string,
  changedBy: string | null,
): Promise<ElectricityLog> {
  const sb = createServerSupabaseClient()

  const { data: before, error: fetchErr } = await sb
    .from('electricity_logs')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchErr || !before) throw new Error('Không tìm thấy chỉ số')

  const { data: updated, error: updErr } = await sb
    .from('electricity_logs')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  if (updErr) throw new Error('Không thể sửa chỉ số')

  // Log diff
  const logs: Array<{
    electricity_log_id: string
    field_changed:      'prev_kwh' | 'curr_kwh' | 'prev_water_m3' | 'curr_water_m3'
    old_value:          number | null
    new_value:          number | null
    reason:             string
    changed_by:         string | null
  }> = []
  for (const field of ['prev_kwh', 'curr_kwh', 'prev_water_m3', 'curr_water_m3'] as const) {
    if (field in changes && (changes as Record<string, unknown>)[field] !== (before as Record<string, unknown>)[field]) {
      logs.push({
        electricity_log_id: id,
        field_changed:      field,
        old_value:          (before as Record<string, number | null>)[field] ?? null,
        new_value:          (changes as Record<string, number | null>)[field] ?? null,
        reason,
        changed_by:         changedBy,
      })
    }
  }
  if (logs.length > 0) {
    await sb.from('meter_reading_logs').insert(logs)
  }

  return updated
}
