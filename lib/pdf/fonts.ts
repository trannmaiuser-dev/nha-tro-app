import path from 'path'
import { Font } from '@react-pdf/renderer'

let registered = false

/**
 * Register Be Vietnam Pro font (Vietnamese-optimized) so @react-pdf
 * can render diacritics correctly. Reads TTF files from public/fonts.
 *
 * Idempotent — safe to call multiple times.
 */
export function ensureVietnameseFontRegistered() {
  if (registered) return
  const fontsDir = path.join(process.cwd(), 'public', 'fonts')
  Font.register({
    family: 'BeVietnamPro',
    fonts: [
      { src: path.join(fontsDir, 'BeVietnamPro-Regular.ttf'), fontWeight: 'normal' },
      { src: path.join(fontsDir, 'BeVietnamPro-Bold.ttf'),    fontWeight: 'bold' },
    ],
  })
  registered = true
}

export const PDF_FONT_FAMILY = 'BeVietnamPro'
