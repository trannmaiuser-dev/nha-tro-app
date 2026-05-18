import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { AuthPayload } from '@/types'

const secret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-change-in-prod')

export async function createSession(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret())
}

/**
 * Decode + verify JWT signature ONLY. KHÔNG check DB.
 *
 * Dùng cho middleware (lightweight check ở edge, không afford DB roundtrip mọi request).
 * Server components nên dùng `getCurrentUser` (verify-with-DB, fail-fast nếu user đã xóa).
 */
export async function verifySession(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

/* ───────────── T-031: verify-with-DB + cache ──────────────
 * In-process cache 60s để tránh DB hit mỗi request page load.
 * Scale: 4-room app → max ~10 active users → Map size negligible.
 * NOT thread-safe across Next.js worker processes — mỗi worker có cache riêng,
 * dẫn đến TTL effective ~60s mỗi worker. Acceptable cho 4-room scale.
 */
const USER_VERIFY_CACHE_TTL_MS = 60 * 1000
type CacheEntry = { expiresAt: number; valid: boolean }
const userVerifyCache = new Map<string, CacheEntry>()

/**
 * Check user còn tồn tại + active trong DB. Cache 60s in-process.
 *
 * Trả TRUE nếu user exists VÀ (role='owner' OR tenant_status != 'moved_out').
 * Trả FALSE nếu user đã xóa hoặc tenant moved_out.
 *
 * Best-effort: DB lỗi → return TRUE (fail-open, không log out user khi DB down).
 */
async function verifyUserExistsInDB(userId: string): Promise<boolean> {
  const now = Date.now()
  const cached = userVerifyCache.get(userId)
  if (cached && cached.expiresAt > now) return cached.valid

  try {
    const sb = createServerSupabaseClient()
    const { data } = await sb
      .from('users')
      .select('id, role, tenant_status')
      .eq('id', userId)
      .maybeSingle()

    let valid = false
    if (data) {
      // Owner luôn valid. Tenant: chỉ valid nếu chưa moved_out.
      valid = data.role === 'owner' || data.tenant_status !== 'moved_out'
    }
    userVerifyCache.set(userId, { expiresAt: now + USER_VERIFY_CACHE_TTL_MS, valid })
    return valid
  } catch (err) {
    console.error('[auth] verifyUserExistsInDB error (fail-open):', err)
    return true
  }
}

/**
 * Lấy AuthPayload từ cookie + verify user còn tồn tại trong DB.
 *
 * T-031 (T-024 Bonus #2): trước đây chỉ JWT decode → token valid 30 ngày = user
 * vẫn login được dù admin đã xóa khỏi DB. Giờ thêm DB check (cache 60s).
 *
 * Trả NULL khi:
 *   - Không có cookie
 *   - JWT invalid/expired
 *   - User không tồn tại trong DB (đã xóa)
 *   - Tenant đã moved_out
 */
export async function getCurrentUser(): Promise<AuthPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null

  const payload = await verifySession(token)
  if (!payload) return null

  const valid = await verifyUserExistsInDB(payload.userId)
  if (!valid) return null

  return payload
}

/**
 * Invalidate cache khi user state thay đổi (vd: owner xóa tenant, tenant tự logout).
 * Server actions có thể gọi sau mutation users table để force re-check next request.
 */
export function invalidateUserCache(userId: string): void {
  userVerifyCache.delete(userId)
}

export function setAuthCookie(token: string) {
  cookies().set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
}

export function clearAuthCookie() {
  cookies().delete('auth-token')
}
