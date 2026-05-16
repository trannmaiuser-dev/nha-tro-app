// App-specific custom SVG icons — line art, strokeWidth 1.5, rounded
// All accept: size, color, className

interface IconProps {
  size?: number
  color?: string
  className?: string
}

export function HouseIcon({ size = 20, color = '#1D9E75', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Roof */}
      <path d="M3 11 L12 3 L21 11" />
      {/* Walls */}
      <path d="M5 11 L5 21 L19 21 L19 11" />
      {/* Door */}
      <path d="M10 21 L10 15.5 Q10 14.5 11.5 14.5 L12.5 14.5 Q14 14.5 14 15.5 L14 21" />
      {/* Left window */}
      <rect x="6" y="13" width="3" height="2.5" rx="0.5" />
      {/* Right window */}
      <rect x="15" y="13" width="3" height="2.5" rx="0.5" />
    </svg>
  )
}

export function WeatherCloudIcon({ size = 32, color = '#64B5F6', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Cloud body */}
      <path d="M8 21 Q4 21 4 17 Q4 13 8 13 Q8.5 9 13 9 Q17.5 9 18.5 13 Q22 12.5 23 16 Q25 16 25 19 Q25 22 22 22 L8 22Z" />
      {/* Rain drops */}
      <line x1="11" y1="25" x2="9.5" y2="29" />
      <line x1="16" y1="25" x2="14.5" y2="29" />
      <line x1="21" y1="25" x2="19.5" y2="29" />
    </svg>
  )
}

export function CalendarIcon({ size = 20, color = '#EF5350', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Outer frame */}
      <rect x="2" y="4" width="20" height="18" rx="3" />
      {/* Binding tabs */}
      <path d="M7 2 L7 6 M17 2 L17 6" />
      {/* Header divider */}
      <line x1="2" y1="10" x2="22" y2="10" />
      {/* Date grid dots */}
      <circle cx="7"  cy="15" r="1" fill={color} stroke="none" />
      <circle cx="12" cy="15" r="1" fill={color} stroke="none" />
      <circle cx="17" cy="15" r="1" fill={color} stroke="none" />
      <circle cx="7"  cy="19" r="1" fill={color} stroke="none" />
      <circle cx="12" cy="19" r="1" fill={color} stroke="none" />
    </svg>
  )
}

export function PinIcon({ size = 18, color = '#F59E0B', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Map-pin: round head, tapered body, pointed tip */}
      <path d="M12 2C8.69 2 6 4.69 6 8c0 4.7 5 12 6 13.5C13 20 18 12.7 18 8c0-3.31-2.69-6-6-6z" />
      <circle cx="12" cy="8" r="2.5" />
    </svg>
  )
}

export function ClipboardIcon({ size = 18, color = '#6B7280', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Body */}
      <rect x="5" y="4" width="14" height="17" rx="2" />
      {/* Clip at top */}
      <path d="M9 4 Q9 2 12 2 Q15 2 15 4" />
      {/* Lines */}
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="13" y2="18" />
    </svg>
  )
}
