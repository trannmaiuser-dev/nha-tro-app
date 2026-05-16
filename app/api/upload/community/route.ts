import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ảnh tối đa 5MB' }, { status: 400 })
  }

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.userId}/${Date.now()}.${ext}`
  const buf  = Buffer.from(await file.arrayBuffer())

  const sb = createServerSupabaseClient()
  const { error } = await sb.storage.from('community-images').upload(path, buf, {
    contentType: file.type,
    upsert: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = sb.storage.from('community-images').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
