import { randomBytes } from 'crypto'

/**
 * Bỏ ký tự dễ nhầm lẫn (0/O, 1/I/l) để khách đọc/gõ ít sai (T-016c D19).
 */
const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Sinh mật khẩu tạm random (default 8 ký tự). */
export function genTempPassword(len: number = 8): string {
  return Array.from(randomBytes(len))
    .map(b => PASSWORD_CHARS[b % PASSWORD_CHARS.length])
    .join('')
}
