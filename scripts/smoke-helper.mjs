#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const envFile = readFileSync('.env', 'utf8') + '\n' + (() => {
  try { return readFileSync('.env.local', 'utf8') } catch { return '' }
})()
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i+1).trim()] })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing SUPABASE env'); process.exit(1) }

const sb = createClient(url, key, { auth: { persistSession: false } })
const cmd = process.argv[2]

async function inspect() {
  console.log('=== Existing data inspection ===\n')

  const { data: owners } = await sb.from('users').select('id, phone, full_name, role').eq('role', 'owner').limit(5)
  console.log('OWNERS:'); owners?.forEach(u => console.log(`  ${u.id}  ${u.phone}  ${u.full_name || ''}`)); console.log()

  const { data: tenants } = await sb.from('users').select('id, phone, full_name, role, tenant_status, is_profile_complete').eq('role', 'tenant').limit(10)
  console.log('TENANTS:'); tenants?.forEach(u => console.log(`  ${u.id}  ${u.phone}  ${u.full_name || ''}  status=${u.tenant_status}  complete=${u.is_profile_complete}`)); console.log()

  const { data: rooms } = await sb.from('rooms').select('id, name, status, floor').order('name')
  console.log('ROOMS:'); rooms?.forEach(r => console.log(`  ${r.id}  ${r.name}  floor=${r.floor}  ${r.status}`)); console.log()

  const { data: memberships } = await sb.from('room_tenants').select('room_id, user_id, is_primary, joined_at, left_at').is('left_at', null)
  console.log('ACTIVE MEMBERSHIPS:'); memberships?.forEach(m => console.log(`  room=${m.room_id} user=${m.user_id} primary=${m.is_primary}`)); console.log()

  const { data: vacantRooms } = await sb.from('rooms').select('id, name').eq('status', 'vacant')
  console.log(`VACANT ROOMS: ${vacantRooms?.length || 0}`); vacantRooms?.forEach(r => console.log(`  ${r.id}  ${r.name}`)); console.log()
}

async function s10Setup() {
  const { data: ms } = await sb.from('room_tenants')
    .select('room_id, user_id, rooms(name), users(phone, role)')
    .is('left_at', null)
  const t = ms?.find(m => m.users?.role === 'tenant')
  if (!t) { console.error('No active tenant'); process.exit(1) }
  console.log(`Using room=${t.room_id} (${t.rooms?.name}) tenant=${t.user_id} (${t.users?.phone})`)
  const { data, error } = await sb.from('invoices').insert({
    room_id: t.room_id, month: 1, year: 2025,
    rent_amount: 4000000, electricity_amount: 500000, water_amount: 100000,
    trash_fee: 50000, parking_fee: 0, internet_fee: 100000, over_capacity_fee: 0,
    total: 4750000, paid_amount: 0, due_date: '2025-01-31', status: 'unpaid', has_debt: true,
  }).select().single()
  if (error) { console.error('Insert error:', error); process.exit(1) }
  console.log(`INSERTED invoice ${data.id} for room ${t.room_id}`)
  console.log(`TENANT_ID=${t.user_id}`)
  console.log(`ROOM_NAME=${t.rooms?.name}`)
}

async function s10Cleanup() {
  const { error } = await sb.from('invoices').delete().eq('month', 1).eq('year', 2025).eq('total', 4750000)
  console.log(error ? `Error: ${error.message}` : 'S10 invoice deleted')
}

async function s18Precheck() {
  const { data: rooms } = await sb.from('rooms').select('id, name, status').eq('status', 'occupied')
  for (const r of rooms || []) {
    const { count } = await sb.from('room_tenants').select('*', { count: 'exact', head: true }).eq('room_id', r.id).is('left_at', null)
    console.log(`  ${r.name} (${r.id}) tenants=${count}`)
  }
}

async function s18Verify() {
  const { data: u } = await sb.from('users').select('id, phone, is_profile_complete, tenant_status').eq('phone', '0911000088').maybeSingle()
  if (!u) { console.log('No user 0911000088'); return }
  console.log('USER:', u)
  const { data: rt } = await sb.from('room_tenants').select('room_id, user_id, is_primary, joined_at, left_at').eq('user_id', u.id)
  console.log('MEMBERSHIPS:', rt)
  const { data: tp } = await sb.from('tenant_profiles').select('user_id, profile_status').eq('user_id', u.id)
  console.log('TENANT_PROFILES:', tp)
}

async function s18Cleanup() {
  const { data: u } = await sb.from('users').select('id').eq('phone', '0911000088').maybeSingle()
  if (!u) { console.log('Nothing to clean'); return }
  await sb.from('room_tenants').delete().eq('user_id', u.id)
  await sb.from('tenant_profiles').delete().eq('user_id', u.id)
  await sb.from('users').delete().eq('id', u.id)
  console.log('S18 cleanup done for user', u.id)
}

async function s23Precheck() {
  const { data: tenants } = await sb.from('room_tenants')
    .select('user_id, room_id, rooms(name), users(phone, role)')
    .is('left_at', null)
  console.log('Active tenants:')
  tenants?.filter(t => t.users?.role === 'tenant').forEach(t => console.log(`  user=${t.user_id} phone=${t.users?.phone} from=${t.rooms?.name}`))
  const { data: vacant } = await sb.from('rooms').select('id, name').eq('status', 'vacant')
  console.log('Vacant rooms:')
  vacant?.forEach(r => console.log(`  ${r.id} ${r.name}`))
}

async function s23Verify() {
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data } = await sb.from('move_requests').select('id, reason, status, created_at, transfer_to_room_id').gte('created_at', since)
  console.log(`Recent move_requests (last 5 min): ${data?.length || 0}`)
  data?.forEach(r => console.log(' ', r))
}

const cmds = {
  inspect, s10Setup, s10Cleanup, s18Precheck, s18Verify, s18Cleanup, s23Precheck, s23Verify,
}
const fn = cmds[cmd]
if (!fn) { console.error('Unknown cmd. Available:', Object.keys(cmds).join(', ')); process.exit(1) }
fn().catch(e => { console.error(e); process.exit(1) })
