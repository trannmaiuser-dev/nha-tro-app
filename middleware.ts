import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

const PROTECTED  = ['/home', '/dashboard', '/community', '/chat', '/notifications', '/profile', '/rooms', '/tenant', '/admin']
const OWNER_ONLY = ['/home', '/rooms', '/admin']

// Routes tenant được phép dù chưa hoàn thiện profile
const ONBOARDING_ALLOWED = ['/tenant/change-password', '/profile/setup', '/first-login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth-token')?.value
  const user  = token ? await verifySession(token) : null

  const isProtected = PROTECTED.some(r => pathname.startsWith(r))

  // Chưa đăng nhập, cố vào route bảo vệ → /login
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Đã đăng nhập, vào /login → community
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/community', request.url))
  }

  // Tenant cố vào route chỉ dành cho owner → /dashboard
  if (user && user.role === 'tenant' && OWNER_ONLY.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Tenant chưa hoàn thiện profile → /profile/setup (trừ các route onboarding)
  if (
    user &&
    user.role === 'tenant' &&
    user.isProfileComplete === false &&
    !ONBOARDING_ALLOWED.some(r => pathname.startsWith(r))
  ) {
    return NextResponse.redirect(new URL('/profile/setup', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.svg|.*\\.png|.*\\.webp).*)'],
}
