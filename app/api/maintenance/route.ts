import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('maintenance_requests')
    .select('*, reporter:users!reporter_id(id, full_name, role)')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description, imageUrl } = await req.json()
  if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('maintenance_requests')
    .insert({ reporter_id: user.userId, description: description.trim(), image_url: imageUrl || null })
    .select('*, reporter:users!reporter_id(id, full_name, role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
