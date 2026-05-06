/**
 * Seed script — tạo dữ liệu mẫu với bcrypt hash thật
 * Chạy: npm run seed
 */
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env
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
import bcrypt from 'bcryptjs'

async function seed() {
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env')
    process.exit(1)
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  console.log('🔐 Đang tạo bcrypt hashes...')
  const hash = await bcrypt.hash('123456', 10)

  console.log('🗑️  Xóa dữ liệu cũ...')
  await sb.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await sb.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await sb.from('rooms').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await sb.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('👤 Tạo users...')
  const { error: uError } = await sb.from('users').insert([
    {
      id:            '00000000-0000-0000-0000-000000000001',
      phone:         '0901000001',
      password_hash: hash,
      role:          'owner',
      full_name:     'Minh Anh',
    },
    {
      id:            '00000000-0000-0000-0000-000000000002',
      phone:         '0901000002',
      password_hash: hash,
      role:          'tenant',
      full_name:     'Anh Hùng',
    },
  ])
  if (uError) { console.error('❌ Lỗi tạo users:', uError.message); process.exit(1) }

  console.log('🏠 Tạo phòng...')
  const { data: rooms, error: rError } = await sb.from('rooms').insert([
    { name: 'P101', floor: 1, price: 3500000, status: 'vacant',   tenant_id: null },
    { name: 'P102', floor: 1, price: 3500000, status: 'vacant',   tenant_id: null },
    {
      name: 'P201', floor: 2, price: 4000000, status: 'occupied',
      tenant_id: '00000000-0000-0000-0000-000000000002',
    },
    { name: 'P202', floor: 2, price: 4000000, status: 'vacant',   tenant_id: null },
  ]).select()
  if (rError) { console.error('❌ Lỗi tạo rooms:', rError.message); process.exit(1) }

  console.log('💳 Tạo kỳ thanh toán P201...')
  const p201 = rooms?.find(r => r.name === 'P201')
  if (p201) {
    const due = new Date()
    due.setDate(5)
    if (due < new Date()) due.setMonth(due.getMonth() + 1)

    await sb.from('payments').insert({
      room_id:  p201.id,
      amount:   4000000,
      due_date: due.toISOString().split('T')[0],
      status:   'pending',
    })
  }

  console.log('')
  console.log('✅ Seed hoàn tất!')
  console.log('')
  console.log('📱 Tài khoản mẫu:')
  console.log('   Chủ nhà → 0901000001 / 123456  (Minh Anh)')
  console.log('   Khách   → 0901000002 / 123456  (Anh Hùng, P201)')
}

seed().catch(err => { console.error('❌ Seed lỗi:', err); process.exit(1) })
