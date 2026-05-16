/**
 * Tạo Storage buckets cho module Thu chi (T-011)
 * Chạy: npm run buckets:finance
 *
 *   - payment-proofs    : tenant upload ảnh sao kê chứng minh thanh toán
 *   - expense-receipts  : owner upload ảnh biên lai chi tiêu
 *
 * Cả 2 đều PRIVATE (public = false). Truy cập đi qua API route
 * dùng SUPABASE_SERVICE_ROLE_KEY → không cần Storage RLS policy.
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

const BUCKETS: Array<{
  id: string
  desc: string
  config: { public: boolean; fileSizeLimit: number; allowedMimeTypes: string[] }
}> = [
  {
    id:     'payment-proofs',
    desc:   'Ảnh sao kê tenant upload (UC-10)',
    config: {
      public:           false,
      fileSizeLimit:    5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  },
  {
    id:     'expense-receipts',
    desc:   'Ảnh biên lai owner upload (UC-12)',
    config: {
      public:           false,
      fileSizeLimit:    5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  },
]

async function run() {
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env')
    process.exit(1)
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  console.log('🔍 Lấy danh sách buckets hiện có...')
  const { data: existing, error: listError } = await sb.storage.listBuckets()
  if (listError) {
    console.error('❌ Không thể list buckets:', listError.message)
    process.exit(1)
  }
  const existingIds = new Set(existing.map(b => b.id))

  for (const { id, desc, config } of BUCKETS) {
    if (existingIds.has(id)) {
      console.log(`⏭️   Bucket "${id}" đã tồn tại — bỏ qua`)
      continue
    }
    console.log(`📦 Tạo bucket "${id}" — ${desc}...`)
    const { error } = await sb.storage.createBucket(id, config)
    if (error) {
      console.error(`❌ Lỗi tạo "${id}":`, error.message)
      process.exit(1)
    }
    console.log(`✅ Đã tạo "${id}" (private, max 5MB, JPG/PNG/WebP)`)
  }

  console.log('')
  console.log('🎉 Hoàn tất! Mở Supabase Dashboard → Storage để kiểm tra.')
}

run().catch(err => { console.error('❌ Lỗi:', err); process.exit(1) })
