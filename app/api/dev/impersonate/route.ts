// T-022: Dev-only impersonate endpoint cho Phase E auto test.
// CẢNH BÁO: KHÔNG enable trên production. 4 layer defense bắt buộc.
//
// Defense layers (in order):
//   L1: NODE_ENV !== 'production' (endpoint trả 404 nếu prod)
//   L2: DEV_IMPERSONATE_TOKEN env phải tồn tại (chưa setup → 404)
//   L3: timingSafeEqual cho token compare (chống timing attack)
//   L4: User phải tồn tại trong DB
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSession } from '@/lib/auth'
import type { UserRole } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // ── Layer 1: production strip ───────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  // ── Layer 2: token env phải tồn tại ─────────────────────────
  const expectedToken = process.env.DEV_IMPERSONATE_TOKEN
  if (!expectedToken) {
    console.warn('[dev/impersonate] DEV_IMPERSONATE_TOKEN not set — endpoint disabled')
    return new NextResponse('Not found', { status: 404 })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const userId = url.searchParams.get('user_id')
  const forceComplete = url.searchParams.get('force_complete') === 'true'

  if (!token || !userId) {
    return new NextResponse('Missing params', { status: 400 })
  }

  // ── Layer 3: timingSafeEqual ────────────────────────────────
  let tokenValid = false
  try {
    const a = Buffer.from(token)
    const b = Buffer.from(expectedToken)
    tokenValid = a.length === b.length && timingSafeEqual(a, b)
  } catch {
    tokenValid = false
  }
  if (!tokenValid) {
    console.warn(
      `[dev/impersonate] Invalid token from IP ${req.headers.get('x-forwarded-for') ?? 'unknown'}`,
    )
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // ── Layer 4: user phải tồn tại ──────────────────────────────
  const sb = createServerSupabaseClient()
  const { data: user } = await sb
    .from('users')
    .select('id, phone, role, full_name, is_profile_complete')
    .eq('id', userId)
    .maybeSingle()

  if (!user) {
    return new NextResponse('User not found', { status: 404 })
  }

  // ── Audit log ───────────────────────────────────────────────
  // T-029: dual write console (dev observability) + audit_logs table (persistent).
  // Fail-open: nếu audit insert fail (vd migration v17 chưa apply, table không tồn tại) →
  // log error nhưng vẫn impersonate. Lý do: endpoint chỉ active ở dev (L1 production strip),
  // console.log đã capture event. Audit DB lỗi không nên block dev workflow.
  // Production case: L1 chặn trước, code này không bao giờ chạy.
  const ip = req.headers.get('x-forwarded-for') ?? 'localhost'
  console.log(
    `[dev/impersonate] ${new Date().toISOString()} ` +
      `IP=${ip} ` +
      `user_id=${user.id} role=${user.role} full_name="${user.full_name}"` +
      (forceComplete ? ' [force_complete=true]' : ''),
  )
  const { error: auditError } = await sb.from('audit_logs').insert({
    event_type:     'dev_impersonate',
    target_user_id: user.id,
    ip,
    metadata:       {
      role:           user.role,
      full_name:      user.full_name,
      force_complete: forceComplete,
    },
  })
  if (auditError) {
    console.error('[dev/impersonate] audit_logs insert failed (continuing):', auditError.message)
  }

  // ── Tạo JWT (reuse createSession từ lib/auth.ts) ────────────
  // Payload format đồng bộ với app/api/auth/login/route.ts:29-35
  //
  // T-028: force_complete=true override isProfileComplete cho dev tooling.
  // Use case: impersonate tenant có is_profile_complete=false trong DB để test
  // dashboard/community flow mà không bị middleware redirect /profile/setup.
  // Bypass chỉ active trong dev (L1 production strip + L3 token đảm bảo).
  const jwt = await createSession({
    userId: user.id,
    phone: user.phone,
    role: user.role as UserRole,
    fullName: user.full_name,
    isProfileComplete: forceComplete ? true : (user.is_profile_complete ?? true),
  })

  // ── Redirect theo role ──────────────────────────────────────
  // Middleware enforce render đúng UI ở /dashboard cho cả owner và tenant
  // (DashboardPage server component dispatch OwnerDashboard / TenantDashboard).
  // Note: tenant với isProfileComplete=false sẽ bị middleware đẩy về /profile/setup
  // (trừ khi gọi với ?force_complete=true để bypass — T-028).
  const response = NextResponse.redirect(new URL('/dashboard', req.url), { status: 302 })

  // Cookie options copy từ app/api/auth/login/route.ts:42-48
  // secure: false vì L1 đã loại bỏ production case — endpoint chỉ active ở dev.
  response.cookies.set('auth-token', jwt, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return response
}
