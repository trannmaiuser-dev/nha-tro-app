// Custom hand-drawn SVG icons — line art style, strokeWidth 1.5

interface IconProps {
  size?: number
  color?: string
  className?: string
}

export function PinIcon({ size = 16, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Round head */}
      <circle cx="9" cy="6" r="4" />
      {/* Flat base connecting head to shaft */}
      <path d="M6 10 L12 10" />
      {/* Shaft going diagonally */}
      <path d="M9 10 L15 20" />
      {/* Small perpendicular holder at top */}
      <path d="M7 4 L11 8" />
    </svg>
  )
}

export function HouseIcon({ size = 16, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Roof */}
      <path d="M3 11 L12 3 L21 11" />
      {/* Walls */}
      <path d="M5 11 L5 21 L19 21 L19 11" />
      {/* Door */}
      <path d="M10 21 L10 15 Q10 14 11 14 L13 14 Q14 14 14 15 L14 21" />
      {/* Window */}
      <rect x="15" y="13" width="3" height="3" rx="0.5" />
    </svg>
  )
}

export function GlobeIcon({ size = 16, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Outer sphere */}
      <circle cx="12" cy="12" r="9" />
      {/* Equator (horizontal) */}
      <ellipse cx="12" cy="12" rx="9" ry="3.5" />
      {/* Prime meridian (vertical) */}
      <ellipse cx="12" cy="12" rx="3.5" ry="9" />
      {/* Tropic lines */}
      <path d="M3.5 7.5 Q12 9 20.5 7.5" />
      <path d="M3.5 16.5 Q12 15 20.5 16.5" />
    </svg>
  )
}

export function LockIcon({ size = 16, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Shackle (curved top) */}
      <path d="M8 11 L8 7 Q8 3 12 3 Q16 3 16 7 L16 11" />
      {/* Lock body */}
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      {/* Keyhole */}
      <circle cx="12" cy="16" r="1.5" />
      <path d="M12 17.5 L12 19" />
    </svg>
  )
}

export function StarIcon({ size = 16, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <polygon points="12,2 15.1,8.6 22.5,9.3 17.3,14.1 18.9,21.5 12,17.8 5.1,21.5 6.7,14.1 1.5,9.3 8.9,8.6" />
    </svg>
  )
}

export function SmileIcon({ size = 16, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Face */}
      <circle cx="12" cy="12" r="9" />
      {/* Eyes */}
      <circle cx="9" cy="10" r="1" fill={color} />
      <circle cx="15" cy="10" r="1" fill={color} />
      {/* Smile */}
      <path d="M8 14.5 Q12 18.5 16 14.5" />
    </svg>
  )
}

// ─── Watermark Illustrations (60×60 viewBox, opacity used in card bg) ──────

export function CatSleepingWatermark({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {/* Ears */}
      <path d="M14 22 L18 10 L24 22" />
      <path d="M36 22 L42 10 L46 22" />
      {/* Head */}
      <circle cx="30" cy="32" r="16" />
      {/* Sleeping eyes (~) */}
      <path d="M22 30 Q25 27 28 30" />
      <path d="M32 30 Q35 27 38 30" />
      {/* Nose */}
      <path d="M29 34 L30 35 L31 34" />
      {/* Smile */}
      <path d="M27 37 Q30 40 33 37" />
      {/* Whiskers */}
      <path d="M16 33 L26 34" opacity="0.6" />
      <path d="M16 37 L26 36" opacity="0.6" />
      <path d="M44 33 L34 34" opacity="0.6" />
      <path d="M44 37 L34 36" opacity="0.6" />
      {/* ZZZ */}
      <path d="M44 16 L50 16 L44 22 L50 22" strokeWidth="1.8" />
      <path d="M48 10 L52 10 L48 14 L52 14" strokeWidth="1.5" />
    </svg>
  )
}

export function DogWavingWatermark({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {/* Floppy ears */}
      <ellipse cx="16" cy="30" rx="6" ry="11" transform="rotate(-10 16 30)" />
      <ellipse cx="44" cy="30" rx="6" ry="11" transform="rotate(10 44 30)" />
      {/* Head */}
      <circle cx="30" cy="32" r="14" />
      {/* Eyes */}
      <circle cx="25" cy="28" r="2.5" fill={color} />
      <circle cx="35" cy="28" r="2.5" fill={color} />
      <circle cx="25.8" cy="27.2" r="1" fill="white" stroke="none" />
      <circle cx="35.8" cy="27.2" r="1" fill="white" stroke="none" />
      {/* Nose */}
      <ellipse cx="30" cy="34" rx="3" ry="2" />
      {/* Smile */}
      <path d="M25 38 Q30 43 35 38" />
      {/* Waving paw */}
      <path d="M44 40 Q52 32 50 24 Q48 18 44 22" />
      <circle cx="50" cy="22" r="3" />
    </svg>
  )
}

export function GoldfishWatermark({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {/* Body */}
      <ellipse cx="28" cy="32" rx="16" ry="11" />
      {/* Tail fin */}
      <path d="M12 32 Q2 22 6 38 Q4 46 12 36" />
      {/* Top fin */}
      <path d="M26 21 Q32 14 40 21" />
      {/* Bottom fin */}
      <path d="M26 43 Q30 50 36 43" />
      {/* Pectoral fin */}
      <path d="M36 36 Q44 32 42 26 Q38 22 34 28" />
      {/* Eye */}
      <circle cx="40" cy="29" r="3.5" />
      <circle cx="41" cy="28" r="1.2" fill={color} />
      {/* Smile */}
      <path d="M40 34 Q43 37 46 34" />
      {/* Bubbles */}
      <circle cx="50" cy="20" r="2.5" />
      <circle cx="54" cy="14" r="1.8" />
      <circle cx="50" cy="9" r="1.2" />
    </svg>
  )
}

export function RabbitHeartWatermark({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {/* Long ears */}
      <ellipse cx="22" cy="16" rx="5" ry="13" transform="rotate(-8 22 16)" />
      <ellipse cx="38" cy="16" rx="5" ry="13" transform="rotate(8 38 16)" />
      {/* Inner ear */}
      <ellipse cx="22" cy="16" rx="2.5" ry="10" transform="rotate(-8 22 16)" opacity="0.5" />
      <ellipse cx="38" cy="16" rx="2.5" ry="10" transform="rotate(8 38 16)" opacity="0.5" />
      {/* Head */}
      <circle cx="30" cy="34" r="14" />
      {/* Eyes */}
      <circle cx="25" cy="30" r="2.5" fill={color} />
      <circle cx="35" cy="30" r="2.5" fill={color} />
      {/* Nose */}
      <path d="M28 35 L30 37 L32 35" />
      {/* Smile */}
      <path d="M26 39 Q30 43 34 39" />
      {/* Heart held in arms */}
      <path d="M22 48 Q22 44 26 44 Q30 44 30 48 Q30 44 34 44 Q38 44 38 48 Q38 54 30 58 Q22 54 22 48Z" />
    </svg>
  )
}

export function CatTeaWatermark({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {/* Ears */}
      <path d="M14 20 L18 8 L24 20" />
      <path d="M36 20 L42 8 L46 20" />
      {/* Head */}
      <circle cx="30" cy="28" r="14" />
      {/* Happy squint eyes */}
      <path d="M22 25 Q26 22 29 25" />
      <path d="M31 25 Q34 22 38 25" />
      {/* Nose */}
      <path d="M29 29 L30 30 L31 29" />
      {/* Smile */}
      <path d="M26 33 Q30 37 34 33" />
      {/* Whiskers */}
      <path d="M14 27 L24 29" opacity="0.5" />
      <path d="M36 29 L46 27" opacity="0.5" />
      {/* Teacup */}
      <path d="M18 46 L42 46" />
      <path d="M20 46 Q20 55 30 55 Q40 55 40 46" />
      {/* Cup handle */}
      <path d="M40 48 Q46 48 46 52 Q46 56 40 54" />
      {/* Steam */}
      <path d="M26 40 Q27 37 26 34" strokeWidth="1.5" />
      <path d="M30 40 Q31 37 30 34" strokeWidth="1.5" />
      <path d="M34 40 Q35 37 34 34" strokeWidth="1.5" />
    </svg>
  )
}

// ── Post Decoration Stickers (60×60, single-color, flat outline) ─────────────

interface DecorProps { color?: string }
const DS = ({ color = 'white', children }: { color?: string; children: React.ReactNode }) => (
  <svg viewBox="0 0 60 60" fill="none" stroke={color} strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

export function DecorationCat({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <path d="M14 24 L18 10 L26 21" /><path d="M34 21 L42 10 L46 24" />
      <circle cx="30" cy="30" r="14" />
      <circle cx="24" cy="27" r="2.5" fill={color} /><circle cx="36" cy="27" r="2.5" fill={color} />
      <path d="M28 32 L30 34 L32 32" /><path d="M26 36 Q30 39 34 36" />
      <ellipse cx="30" cy="49" rx="11" ry="7" />
      <path d="M41 48 Q52 40 50 53 Q47 58 41 54" />
    </DS>
  )
}

export function DecorationCorgi({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <ellipse cx="12" cy="28" rx="8" ry="13" transform="rotate(-12 12 28)" />
      <ellipse cx="48" cy="28" rx="8" ry="13" transform="rotate(12 48 28)" />
      <circle cx="30" cy="28" r="16" />
      <ellipse cx="30" cy="36" rx="9" ry="6" />
      <circle cx="22" cy="24" r="2.5" fill={color} /><circle cx="38" cy="24" r="2.5" fill={color} />
      <ellipse cx="30" cy="33" rx="2.5" ry="2" fill={color} />
      <path d="M27 42 Q28 47 30 47 Q32 47 33 42" fill={color} stroke="none" opacity="0.7" />
    </DS>
  )
}

export function DecorationRabbit({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <ellipse cx="21" cy="16" rx="6" ry="14" transform="rotate(-8 21 16)" />
      <ellipse cx="39" cy="16" rx="6" ry="14" transform="rotate(8 39 16)" />
      <circle cx="30" cy="32" r="14" />
      <circle cx="24" cy="30" r="2.5" fill={color} /><circle cx="36" cy="30" r="2.5" fill={color} />
      <circle cx="30" cy="35" r="1.5" fill={color} />
      <path d="M26 38 Q30 42 34 38" />
      <circle cx="19" cy="34" r="3" fill={color} opacity="0.3" stroke="none" />
      <circle cx="41" cy="34" r="3" fill={color} opacity="0.3" stroke="none" />
    </DS>
  )
}

export function DecorationPanda({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <circle cx="30" cy="28" r="16" />
      <circle cx="14" cy="14" r="7" /><circle cx="46" cy="14" r="7" />
      <ellipse cx="22" cy="26" rx="5" ry="4" fill={color} opacity="0.25" />
      <ellipse cx="38" cy="26" rx="5" ry="4" fill={color} opacity="0.25" />
      <circle cx="22" cy="26" r="2.5" fill={color} /><circle cx="38" cy="26" r="2.5" fill={color} />
      <path d="M27 32 L30 35 L33 32" /><path d="M25 37 Q30 41 35 37" />
      <ellipse cx="30" cy="50" rx="12" ry="8" />
    </DS>
  )
}

export function DecorationSmileyStar({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <polygon points="30,3 36.5,20 55,20 41,31 46,49 30,38 14,49 19,31 5,20 23.5,20" />
      <circle cx="24" cy="25" r="2" fill={color} /><circle cx="36" cy="25" r="2" fill={color} />
      <path d="M23 30 Q30 36 37 30" />
    </DS>
  )
}

export function DecorationWingedHeart({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <path d="M30 48 Q15 37 13 27 Q12 18 19 17 Q25 15 30 23 Q35 15 41 17 Q48 18 47 27 Q45 37 30 48Z" />
      <path d="M13 28 Q5 24 7 15 Q11 21 15 25" />
      <path d="M7 15 Q11 11 15 13" />
      <path d="M47 28 Q55 24 53 15 Q49 21 45 25" />
      <path d="M53 15 Q49 11 45 13" />
    </DS>
  )
}

export function DecorationSmileFlower({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <ellipse cx="30" cy="14" rx="6" ry="9" />
      <ellipse cx="30" cy="14" rx="6" ry="9" transform="rotate(60 30 30)" />
      <ellipse cx="30" cy="14" rx="6" ry="9" transform="rotate(120 30 30)" />
      <ellipse cx="30" cy="14" rx="6" ry="9" transform="rotate(180 30 30)" />
      <ellipse cx="30" cy="14" rx="6" ry="9" transform="rotate(240 30 30)" />
      <ellipse cx="30" cy="14" rx="6" ry="9" transform="rotate(300 30 30)" />
      <circle cx="30" cy="30" r="10" fill={color} opacity="0.15" />
      <circle cx="26" cy="28" r="1.5" fill={color} /><circle cx="34" cy="28" r="1.5" fill={color} />
      <path d="M25 33 Q30 37 35 33" />
    </DS>
  )
}

export function DecorationSleepyMoon({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <path d="M34 6 A22 22 0 1 0 34 54 A16 16 0 1 1 34 6Z" fill={color} opacity="0.15" />
      <path d="M22 30 Q25 27 28 30" strokeWidth="2" />
      <path d="M32 30 Q35 27 38 30" strokeWidth="2" />
      <polygon points="46,10 47.5,14.5 52,14.5 48.5,17.5 49.8,22 46,19 42.2,22 43.5,17.5 40,14.5 44.5,14.5"
        fill={color} opacity="0.6" stroke="none" />
      <circle cx="52" cy="30" r="2" fill={color} opacity="0.5" stroke="none" />
      <circle cx="48" cy="42" r="1.5" fill={color} opacity="0.4" stroke="none" />
    </DS>
  )
}

export function DecorationBirthdayCake({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <rect x="8" y="38" width="44" height="17" rx="4" />
      <rect x="16" y="24" width="28" height="14" rx="3" />
      <rect x="26" y="14" width="8" height="10" rx="2" />
      <path d="M30 8 Q33 11 30 14 Q27 11 30 8Z" fill={color} opacity="0.7" stroke="none" />
      <path d="M8 44 Q18 40 30 44 Q42 40 52 44" />
      <path d="M16 29 Q22 26 30 29 Q38 26 44 29" />
    </DS>
  )
}

export function DecorationCoffee({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <path d="M14 28 L18 54 Q18 56 20 56 L40 56 Q42 56 42 54 L46 28Z" />
      <path d="M42 36 Q52 36 52 44 Q52 52 42 50" />
      <path d="M12 28 Q30 32 48 28" />
      <path d="M30 22 Q26 16 22 18 Q18 20 22 25 Q26 29 30 22 Q34 29 38 25 Q42 20 38 18 Q34 16 30 22Z"
        fill={color} opacity="0.25" />
    </DS>
  )
}

export function DecorationRainbow({ color = 'white' }: DecorProps) {
  return (
    <DS color={color}>
      <path d="M4 46 Q4 14 30 14 Q56 14 56 46" strokeWidth="2.5" />
      <path d="M9 46 Q9 19 30 19 Q51 19 51 46" strokeWidth="2" />
      <path d="M14 46 Q14 24 30 24 Q46 24 46 46" strokeWidth="1.5" />
      <path d="M1 48 Q1 40 8 40 Q8 36 15 38 Q15 42 10 44 Q11 50 6 50 Q1 50 1 48Z"
        fill={color} opacity="0.3" />
      <path d="M59 48 Q59 40 52 40 Q52 36 45 38 Q45 42 50 44 Q49 50 54 50 Q59 50 59 48Z"
        fill={color} opacity="0.3" />
    </DS>
  )
}
