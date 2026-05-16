'use client'
import { Clock, Loader2, CheckCircle2, Check, X } from 'lucide-react'

type StatusKey = 'pending' | 'in_progress' | 'done' | 'yes' | 'no' | 'new'

interface StatusConfig {
  icon: React.ReactNode
  bg: string
  color: string
  border: string
  defaultLabel: string
}

const CONFIGS: Record<StatusKey, StatusConfig> = {
  pending:     { icon: <Clock     size={11} strokeWidth={2.5} />,                                              bg: '#FEF3C7', color: '#D97706', border: '#FCD34D', defaultLabel: 'Chờ xử lý'  },
  in_progress: { icon: <Loader2   size={11} strokeWidth={2.5} className="animate-spin" />,                    bg: '#DBEAFE', color: '#2563EB', border: '#93C5FD', defaultLabel: 'Đang xử lý' },
  done:        { icon: <CheckCircle2 size={11} strokeWidth={2.5} />,                                          bg: '#D1FAE5', color: '#059669', border: '#6EE7B7', defaultLabel: 'Hoàn thành' },
  new:         { icon: <Clock     size={11} strokeWidth={2.5} />,                                             bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5', defaultLabel: 'Mới báo'    },
  yes:         { icon: <Check     size={11} strokeWidth={2.5} />,                                             bg: '#D1FAE5', color: '#059669', border: '#6EE7B7', defaultLabel: 'Tham gia'   },
  no:          { icon: <X         size={11} strokeWidth={2.5} />,                                             bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5', defaultLabel: 'Không được' },
}

interface Props {
  status: StatusKey | string
  label?: string
  light?: boolean
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, label, light, size = 'md' }: Props) {
  const cfg = CONFIGS[status as StatusKey] ?? CONFIGS.pending
  const bg     = light ? 'rgba(255,255,255,0.25)' : cfg.bg
  const color  = light ? '#fff' : cfg.color
  const border = light ? '1px solid rgba(255,255,255,0.35)' : `1px solid ${cfg.border}`
  const pad    = size === 'sm' ? '2px 8px' : '3px 10px'
  const fs     = size === 'sm' ? 11 : 12

  return (
    <span className="inline-flex items-center gap-1 font-semibold shrink-0 select-none"
      style={{ background: bg, color, border, borderRadius: 99, padding: pad, fontSize: fs, fontWeight: 600 }}>
      {cfg.icon}
      {label ?? cfg.defaultLabel}
    </span>
  )
}
