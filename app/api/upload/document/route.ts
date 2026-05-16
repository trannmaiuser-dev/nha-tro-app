import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form     = await req.formData()
  const file     = form.get('file') as File | null
  const docType  = (form.get('type') as string) || 'custom'
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File tối đa 10MB' }, { status: 400 })

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.userId}/${docType}/${Date.now()}.${ext}`
  const buf  = Buffer.from(await file.arrayBuffer())
  const sb   = createServerSupabaseClient()

  const { error } = await sb.storage.from('documents').upload(path, buf, {
    contentType: file.type, upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Documents bucket is private — return signed URL (24h)
  const { data: signedData } = await sb.storage.from('documents').createSignedUrl(path, 86400)
  return NextResponse.json({ url: signedData?.signedUrl || path, path, fileType: ext })
}
