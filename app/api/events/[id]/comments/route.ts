import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('event_comments')
    .select('*, author:users!author_id(id, full_name, role)')
    .eq('event_id', params.id)
    .order('created_at', { ascending: true })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, imageUrl } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('event_comments')
    .insert({ event_id: params.id, author_id: user.userId, content: content.trim(), image_url: imageUrl || null })
    .select('*, author:users!author_id(id, full_name, role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
