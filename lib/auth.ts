import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
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

export async function verifySession(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<AuthPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null
  return verifySession(token)
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
