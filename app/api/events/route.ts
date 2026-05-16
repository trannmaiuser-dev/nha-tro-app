import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { RawCommunityEventRow } from '@/lib/types/community'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb    = createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  // Try full query (post migrations-v8), fall back to base query if new columns missing
  let { data, error } = await sb
    .from('community_events')
    .select('*, creator:users!creator_id(id, full_name), responses:event_responses(user_id, response, user:users!user_id(full_name))')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(10)

  if (error) ({ data } = await sb
    .from('community_events')
    .select('*, creator:users!creator_id(id, full_name), responses:event_responses(user_id, response, user:users!user_id(full_name))')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(10))

  // Normalize: add default values for columns that may not exist yet
  const normalized = ((data ?? []) as RawCommunityEventRow[]).map(e => ({
    ...e,
    creator_id:          e.creator_id          ?? '',
    response_option_yes: e.response_option_yes ?? 'Tham gia',
    response_option_no:  e.response_option_no  ?? 'Không tham gia',
    deleted_at:          e.deleted_at          ?? null,
    tags:                [],
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, eventDate, responseOptionYes, responseOptionNo, taggedUserIds } = await req.json()
  if (!title?.trim() || !eventDate) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

  const sb = createServerSupabaseClient()

  // Try inserting with new columns; fall back to base insert if columns missing
  let { data, error } = await sb
    .from('community_events')
    .insert({
      creator_id: user.userId,
      title: title.trim(),
      description: description || null,
      event_date: eventDate,
      response_option_yes: responseOptionYes || 'Tham gia',
      response_option_no:  responseOptionNo  || 'Không tham gia',
    })
    .select('*, creator:users!creator_id(id, full_name)')
    .single()

  if (error?.message?.includes('column') || error?.message?.includes('schema cache')) {
    // Columns not migrated yet — insert without new fields
    ;({ data, error } = await sb
      .from('community_events')
      .insert({ creator_id: user.userId, title: title.trim(), description: description || null, event_date: eventDate })
      .select('*, creator:users!creator_id(id, full_name)')
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (taggedUserIds?.length) {
    await sb.from('event_tags').insert(taggedUserIds.map((uid: string) => ({ event_id: data.id, user_id: uid })))
  }

  return NextResponse.json({ ...data, responses: [], tags: [] })
}
