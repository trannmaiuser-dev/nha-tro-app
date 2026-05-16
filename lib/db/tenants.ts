import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { addTenantToRoom } from '@/lib/db/room-tenants'
import { genTempPassword } from '@/lib/utils/password'
import type { User, TenantProfile, EmergencyContact, TenantBankAccount } from '@/types'

// ─── Kiểu dùng nội bộ ────────────────────────────────────────
export interface TenantRow extends User {
  is_profile_complete: boolean
  tenant_status: string
  has_debt: boolean
  tenant_profiles?: TenantProfile | null
  room?: { id: string; name: string; floor: number } | null
}

// ─── Tạo tài khoản khách thuê mới (UC-01) ────────────────────
// T-016c D22: idCardNumber giờ optional (không còn dùng làm password).
// Password sinh random 8 ký tự bằng genTempPassword (D19) — an toàn hơn 6 số CCCD.
export async function createTenantAccount(
  roomId: string,
  phone: string,
  idCardNumber: string | undefined,
  fullName?: string,
): Promise<{ user: { id: string; phone: string }; tempPassword: string; loginToken: string }> {
  const sb = createServerSupabaseClient()
  void idCardNumber  // giữ param signature cho backward compat — CCCD điền sau ở onboarding

  // Kiểm tra SĐT chưa tồn tại
  const { data: existing } = await sb.from('users').select('id').eq('phone', phone).maybeSingle()
  if (existing) throw new Error('Số điện thoại đã được đăng ký')

  // Kiểm tra phòng tồn tại
  const { data: room } = await sb.from('rooms').select('id, name, status').eq('id', roomId).single()
  if (!room) throw new Error('Phòng không tồn tại')

  // Mật khẩu tạm random 8 ký tự (T-016c D19)
  const tempPassword = genTempPassword(8)
  const passwordHash = await bcrypt.hash(tempPassword, 10)
  const token        = randomBytes(32).toString('hex')
  const expires      = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: newUser, error } = await sb
    .from('users')
    .insert({
      phone,
      password_hash:       passwordHash,
      role:                'tenant',
      full_name:           fullName ?? `Khách phòng ${room.name}`,
      first_login_token:   token,
      first_login_expires: expires,
      is_profile_complete: false,
      tenant_status:       'invited',
    })
    .select('id, phone')
    .single()

  if (error) throw new Error('Không thể tạo tài khoản: ' + error.message)

  // Gán phòng cho khách (T-016 Phase B):
  // - Insert vào room_tenants. Nếu phòng đang trống → user mới là primary
  //   (addTenantToRoom dual-write rooms.tenant_id + status='occupied' khi isPrimary=true).
  // - Nếu phòng đã có người → user mới chỉ join, primary cũ giữ nguyên.
  const { count: activeCount } = await sb
    .from('room_tenants')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .is('left_at', null)
  const isPrimary = (activeCount ?? 0) === 0
  await addTenantToRoom(roomId, newUser.id, isPrimary)

  // Tạo bản ghi profile trống
  await sb.from('tenant_profiles').insert({ user_id: newUser.id, profile_status: 'draft' })

  return { user: newUser, tempPassword, loginToken: token }
}

// ─── Lấy tất cả khách thuê ───────────────────────────────────
export async function getAllTenants(): Promise<TenantRow[]> {
  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('users')
    .select(`
      id, phone, full_name, role, is_profile_complete, tenant_status, has_debt,
      tenant_profiles(id, avatar_url, profile_status),
      rooms!tenant_id(id, name, floor)
    `)
    .eq('role', 'tenant')
    .order('full_name')
  if (error) throw new Error('Không thể lấy danh sách khách thuê')
  return (data ?? []) as unknown as TenantRow[]
}

// ─── Lấy 1 khách theo ID ─────────────────────────────────────
export async function getTenantById(id: string): Promise<TenantRow | null> {
  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('users')
    .select(`
      id, phone, full_name, role, is_profile_complete, tenant_status, has_debt,
      tenant_profiles(id, full_name, dob, gender, cccd_number, address, occupation, avatar_url, profile_status),
      rooms!tenant_id(id, name, floor)
    `)
    .eq('id', id)
    .eq('role', 'tenant')
    .single()
  return (data as TenantRow | null)
}

// ─── Lấy khách theo phòng ────────────────────────────────────
export async function getTenantsByRoomId(roomId: string): Promise<TenantRow[]> {
  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('users')
    .select('id, phone, full_name, role, is_profile_complete, tenant_status, has_debt, tenant_profiles(avatar_url, profile_status)')
    .eq('role', 'tenant')
    .in('id',
      sb.from('rooms').select('tenant_id').eq('id', roomId).not('tenant_id', 'is', null) as unknown as string[]
    )
  return (data ?? []) as unknown as TenantRow[]
}

// ─── Cập nhật profile (khách tự sửa) ─────────────────────────
export async function updateTenantProfile(
  userId: string,
  data: Partial<TenantProfile>,
): Promise<TenantProfile> {
  const sb = createServerSupabaseClient()
  const { data: updated, error } = await sb
    .from('tenant_profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error('Không thể cập nhật thông tin')
  return updated
}

// ─── Thêm liên hệ khẩn cấp ───────────────────────────────────
export async function addEmergencyContact(
  tenantProfileId: string,
  data: Omit<EmergencyContact, 'id'>,
) {
  const sb = createServerSupabaseClient()
  const { data: result, error } = await sb
    .from('emergency_contacts')
    .insert({ tenant_id: tenantProfileId, ...data })
    .select()
    .single()
  if (error) throw new Error('Không thể thêm liên hệ khẩn cấp')
  return result
}

// ─── Thêm tài khoản ngân hàng ────────────────────────────────
export async function addBankAccount(
  userId: string,
  data: Omit<TenantBankAccount, 'id' | 'user_id' | 'created_at'>,
) {
  const sb = createServerSupabaseClient()
  const { data: result, error } = await sb
    .from('tenant_bank_accounts')
    .insert({ user_id: userId, ...data })
    .select()
    .single()
  if (error) throw new Error('Không thể thêm tài khoản ngân hàng')
  return result
}

// ─── Tìm kiếm khách (tên hoặc SĐT) ──────────────────────────
export async function searchTenants(query: string): Promise<TenantRow[]> {
  const sb   = createServerSupabaseClient()
  const kw   = query.trim()
  if (!kw) return getAllTenants()

  const { data } = await sb
    .from('users')
    .select('id, phone, full_name, role, is_profile_complete, tenant_status, has_debt, tenant_profiles(avatar_url, profile_status), rooms!tenant_id(id, name, floor)')
    .eq('role', 'tenant')
    .or(`phone.ilike.%${kw}%,full_name.ilike.%${kw}%`)
    .order('full_name')
  return (data ?? []) as unknown as TenantRow[]
}

// ─── Đánh dấu đã đổi mật khẩu lần đầu ───────────────────────
export async function markPasswordChanged(userId: string) {
  const sb = createServerSupabaseClient()
  await sb.from('users').update({
    first_login_token:   null,
    first_login_expires: null,
  }).eq('id', userId)
}

// ─── Kiểm tra và cập nhật is_profile_complete ─────────────────
// T-021: phân biệt rõ required (block complete) vs optional (cho qua, bổ sung 7 ngày).
// Required (8): full_name, dob, cccd_number, address, occupation, avatar_url,
//               ≥ 1 emergency_contact, ≥ 1 tenant_bank_account.
// Optional (cho qua): cccd_front_url, cccd_back_url, rental_contract_url
//                     (kiểm qua tenant_documents type='cccd_front'/'cccd_back'/'contract').
export async function checkProfileComplete(userId: string): Promise<boolean> {
  const sb = createServerSupabaseClient()

  const [{ data: profile }, { data: contacts }, { data: banks }] = await Promise.all([
    sb.from('tenant_profiles').select('full_name, dob, cccd_number, address, occupation, avatar_url').eq('user_id', userId).single(),
    sb.from('emergency_contacts').select('id').eq('tenant_id',
      (await sb.from('tenant_profiles').select('id').eq('user_id', userId).single()).data?.id ?? ''
    ).limit(1),
    sb.from('tenant_bank_accounts').select('id').eq('user_id', userId).limit(1),
  ])

  const hasProfile  = !!(profile?.full_name && profile.dob && profile.cccd_number && profile.address && profile.occupation && profile.avatar_url)
  const hasContact  = (contacts?.length ?? 0) > 0
  const hasBank     = (banks?.length ?? 0) > 0
  const isComplete  = hasProfile && hasContact && hasBank

  if (isComplete) {
    await sb.from('users').update({ is_profile_complete: true, tenant_status: 'active' }).eq('id', userId)
    await sb.from('tenant_profiles').update({ profile_status: 'confirmed' }).eq('user_id', userId)
  }
  return isComplete
}
