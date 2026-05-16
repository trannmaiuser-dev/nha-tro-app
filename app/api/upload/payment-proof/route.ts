import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
// 10 năm — payment proof có thể cần xem lại để tra cứu lịch sử lâu dài
const SIGNED_URL_EXPIRES = 60 * 60 * 24 * 365 * 10

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (!ACCEPTED.includes(file.type)) {
    return NextResponse.json({ error: 'Chỉ chấp nhận ảnh JPG/PNG/WebP' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Ảnh tối đa 5MB' }, { status: 400 })
  }

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buf  = Buffer.from(await file.arrayBuffer())

  const sb = createServerSupabaseClient()
  const { error: upErr } = await sb.storage.from('payment-proofs').upload(path, buf, {
    contentType: file.type,
    upsert:      false,
  })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: signed, error: signErr } = await sb.storage
    .from('payment-proofs')
    .createSignedUrl(path, SIGNED_URL_EXPIRES)
  if (signErr || !signed) {
    return NextResponse.json({ error: 'Không tạo được URL ảnh' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl, path })
}
