/**
 * Verify schema Module Thu chi (T-011)
 * Chạy: npx tsx scripts/verify-finance-schema.ts
 *
 * Kiểm tra:
 *   1. 5 bảng mới tồn tại + có hàng nào không (chỉ test schema, không seed)
 *   2. Cột rooms.electricity_rate có tồn tại
 *   3. 15 settings keys mới đã được INSERT
 *   4. Trigger update invoices.status hoạt động (insert + update paid_amount)
 *   5. 2 storage buckets tồn tại
 */
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^#=][^=]*)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
}

import { createClient } from '@supabase/supabase-js'

const EXPECTED_SETTINGS = [
  'meter_reading_day', 'electricity_rate_default',
  'water_billing_mode', 'water_rate_per_m3', 'water_rate_per_person', 'water_rate_fixed',
  'trash_fee_enabled', 'trash_fee_amount',
  'parking_fee_enabled', 'parking_fee_per_vehicle',
  'internet_fee_enabled', 'internet_fee_amount',
  'over_capacity_fee_enabled', 'over_capacity_threshold', 'over_capacity_fee_amount',
]

const FINANCE_TABLES = ['electricity_logs', 'invoices', 'payment_proofs', 'expenses', 'meter_reading_logs']

async function run() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  let allPass = true
  const fail = (msg: string) => { allPass = false; console.error(`❌ ${msg}`) }
  const pass = (msg: string) => console.log(`✅ ${msg}`)

  // 1. 5 bảng mới
  console.log('\n━━━ 1. Kiểm tra 5 bảng mới ━━━')
  for (const t of FINANCE_TABLES) {
    const { error } = await sb.from(t).select('*', { count: 'exact', head: true })
    if (error) fail(`Bảng "${t}": ${error.message}`)
    else pass(`Bảng "${t}" tồn tại`)
  }

  // 2. Cột rooms.electricity_rate
  console.log('\n━━━ 2. Kiểm tra rooms.electricity_rate ━━━')
  const { data: rooms, error: roomsErr } = await sb.from('rooms').select('id, electricity_rate').limit(1)
  if (roomsErr) fail(`rooms.electricity_rate: ${roomsErr.message}`)
  else pass(`Cột electricity_rate có (${rooms?.length ?? 0} phòng mẫu)`)

  // 3. 15 settings keys
  console.log('\n━━━ 3. Kiểm tra 15 settings keys ━━━')
  const { data: settings, error: settingsErr } = await sb
    .from('app_settings').select('key').in('key', EXPECTED_SETTINGS)
  if (settingsErr) {
    fail(`app_settings: ${settingsErr.message}`)
  } else {
    const found = new Set(settings?.map(s => s.key) ?? [])
    const missing = EXPECTED_SETTINGS.filter(k => !found.has(k))
    if (missing.length === 0) pass(`Đủ 15 keys (${found.size}/${EXPECTED_SETTINGS.length})`)
    else fail(`Thiếu ${missing.length} keys: ${missing.join(', ')}`)
  }

  // 4. Trigger update invoices.status
  console.log('\n━━━ 4. Test trigger update invoices.status ━━━')
  const { data: anyRoom } = await sb.from('rooms').select('id').limit(1).single()
  if (!anyRoom) {
    fail('Không có phòng nào để test trigger — chạy npm run seed trước')
  } else {
    // Cleanup nếu có invoice test cũ
    await sb.from('invoices').delete().eq('note', '__verify_finance_schema_test__')

    const { data: inv, error: insertErr } = await sb.from('invoices').insert({
      room_id: anyRoom.id, month: 1, year: 2020,
      rent_amount: 1000000, total: 1000000, paid_amount: 0,
      due_date: '2020-01-05',
      note: '__verify_finance_schema_test__',
    }).select().single()
    if (insertErr) {
      fail(`Insert test invoice fail: ${insertErr.message}`)
    } else {
      if (inv.status === 'unpaid') pass(`INSERT paid_amount=0 → status="unpaid"`)
      else fail(`INSERT: status="${inv.status}", mong đợi "unpaid"`)

      // Update partial
      const { data: upd1 } = await sb.from('invoices').update({ paid_amount: 500000 })
        .eq('id', inv.id).select().single()
      if (upd1?.status === 'partially_paid') pass(`UPDATE paid_amount=500k/1M → status="partially_paid"`)
      else fail(`UPDATE partial: status="${upd1?.status}", mong đợi "partially_paid"`)

      // Update đủ
      const { data: upd2 } = await sb.from('invoices').update({ paid_amount: 1000000 })
        .eq('id', inv.id).select().single()
      if (upd2?.status === 'paid' && upd2?.paid_at) pass(`UPDATE paid_amount=total → status="paid", paid_at set`)
      else fail(`UPDATE full: status="${upd2?.status}", paid_at="${upd2?.paid_at}"`)

      // Cleanup
      await sb.from('invoices').delete().eq('id', inv.id)
      pass(`Đã xóa invoice test`)
    }
  }

  // 5. 2 buckets
  console.log('\n━━━ 5. Kiểm tra 2 storage buckets ━━━')
  const { data: buckets, error: bErr } = await sb.storage.listBuckets()
  if (bErr) {
    fail(`listBuckets: ${bErr.message}`)
  } else {
    const ids = new Set(buckets.map(b => b.id))
    for (const id of ['payment-proofs', 'expense-receipts']) {
      if (ids.has(id)) pass(`Bucket "${id}" tồn tại`)
      else fail(`Thiếu bucket "${id}"`)
    }
  }

  console.log('')
  if (allPass) {
    console.log('🎉 TẤT CẢ PASS — T-011 đã sẵn sàng')
    process.exit(0)
  } else {
    console.log('⚠️  Có lỗi — xem các dòng ❌ ở trên')
    process.exit(1)
  }
}

run().catch(err => { console.error('❌ Lỗi:', err); process.exit(1) })
