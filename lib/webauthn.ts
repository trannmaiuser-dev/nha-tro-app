export const RP_NAME = 'Aloha Tran Home'

export function getRpId(): string {
  if (process.env.NEXT_PUBLIC_APP_DOMAIN) return process.env.NEXT_PUBLIC_APP_DOMAIN
  if (process.env.VERCEL_URL) return process.env.VERCEL_URL
  return 'localhost'
}

export function getOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// Keep for backward compat — evaluated at module load
export const RP_ID  = getRpId()
export const ORIGIN = getOrigin()

export {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
