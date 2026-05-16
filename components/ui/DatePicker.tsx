'use client'
import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { vi } from 'react-day-picker/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
  minDate?: Date
  className?: string
}

function fmt(d: Date | undefined) {
  if (!d) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function DatePicker({ value, onChange, placeholder = 'DD/MM/YYYY', minDate, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input-field text-sm flex items-center gap-2 w-full text-left"
        style={{ color: value ? '#1a1a1a' : '#9ca3af' }}>
        <CalendarDays size={15} strokeWidth={1.8} color={value ? '#1D9E75' : '#9ca3af'} />
        <span className="flex-1">{value ? fmt(value) : placeholder}</span>
      </button>

      {open && (
        <div className="absolute left-0 z-[9999] mt-1 bg-white rounded-2xl p-3 animate-slide-down"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: 280 }}>
          <DayPicker
            mode="single"
            locale={vi}
            selected={value}
            onSelect={d => { onChange(d); setOpen(false) }}
            disabled={minDate ? { before: minDate } : undefined}
            showOutsideDays
            classNames={{
              root:            'font-[Nunito]',
              months:          'flex flex-col',
              month:           'space-y-2',
              month_caption:   'flex items-center justify-between px-1 py-1',
              caption_label:   'text-sm font-black text-gray-800',
              nav:             'flex items-center gap-1',
              button_previous: 'w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 cursor-pointer',
              button_next:     'w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 cursor-pointer',
              month_grid:      'w-full border-collapse',
              weekdays:        'flex',
              weekday:         'flex-1 text-center text-[11px] font-bold text-gray-400 py-1',
              weeks:           '',
              week:            'flex w-full mt-1',
              day:             'flex-1 text-center',
              day_button:      'w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold text-gray-700 hover:bg-[#E8F5EE] transition-colors cursor-pointer',
              selected:        '[&>button]:!bg-[#1D9E75] [&>button]:!text-white',
              today:           '[&>button]:!border-2 [&>button]:!border-[#1D9E75] [&>button]:!font-bold [&>button]:!text-[#1D9E75]',
              outside:         '[&>button]:text-gray-300',
              disabled:        '[&>button]:text-gray-200 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent',
            }}
            components={{
              Chevron: ({ orientation, ...rest }) =>
                orientation === 'left'
                  ? <ChevronLeft  size={14} strokeWidth={2.5} />
                  : <ChevronRight size={14} strokeWidth={2.5} />,
            }}
          />
        </div>
      )}
    </div>
  )
}
