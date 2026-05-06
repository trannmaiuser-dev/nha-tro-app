export const RP_NAME = 'Aloha Tran Home'
export const RP_ID  = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost'
export const ORIGIN = process.env.NEXT_PUBLIC_APP_URL    || 'http://localhost:3000'

export {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
