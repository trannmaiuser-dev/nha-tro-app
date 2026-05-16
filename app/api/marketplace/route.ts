import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('marketplace_posts')
    .select('*, author:users!author_id(id, full_name)')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, title, description, imageUrl } = await req.json()
  if (!title?.trim() || !type) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('marketplace_posts')
    .insert({ author_id: user.userId, type, title: title.trim(), description: description || null, image_url: imageUrl || null })
    .select('*, author:users!author_id(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
