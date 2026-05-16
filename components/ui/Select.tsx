'use client'

import { useState, useRef, useEffect, useId } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value:        string
  onChange:     (value: string) => void
  options:      SelectOption[]
  placeholder?: string
  className?:   string
  disabled?:    boolean
  required?:    boolean
}

const MAX_DROP_HEIGHT = 200  // px
const DROP_GAP        = 6   // px between trigger and dropdown

export default function Select({
  value, onChange, options, placeholder = 'Chọn...', className = '', disabled, required,
}: Props) {
  const [open,      setOpen]      = useState(false)
  const [focused,   setFocused]   = useState(false)
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef   = useRef<HTMLButtonElement>(null)
  const id = useId()

  const selected = options.find(o => o.value === value)

  // Calculate fixed position for dropdown
  function calcDropPosition() {
    const el = triggerRef.current
    if (!el) return
    const rect       = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - DROP_GAP
    const spaceAbove = rect.top - DROP_GAP
    const dropH      = Math.min(options.length * 48 + 4, MAX_DROP_HEIGHT)
    const openUp     = spaceBelow < dropH && spaceAbove > spaceBelow

    setDropStyle(
      openUp
        ? { bottom: window.innerHeight - rect.top + DROP_GAP, maxHeight: Math.min(dropH, spaceAbove) }
        : { top:    rect.bottom + DROP_GAP,                   maxHeight: Math.min(dropH, spaceBelow) },
    )
  }

  function openDropdown() {
    if (disabled) return
    calcDropPosition()
    setOpen(true)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current?.contains(e.target as Node)) return
      // check dropdown portal
      const portal = document.getElementById('select-portal')
      if (portal?.contains(e.target as Node)) return
      setOpen(false)
      setFocused(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Close on scroll / resize
  useEffect(() => {
    if (!open) return
    const close = () => { setOpen(false); setFocused(false) }
    window.addEventListener('scroll',  close, { capture: true, passive: true })
    window.addEventListener('resize',  close, { passive: true })
    return () => {
      window.removeEventListener('scroll',  close, true)
      window.removeEventListener('resize',  close)
    }
  }, [open])

  // Keyboard navigation
  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open ? setOpen(false) : openDropdown() }
    if (e.key === 'Escape') { setOpen(false); setFocused(false) }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open) {
      e.preventDefault()
      const idx  = options.findIndex(o => o.value === value)
      const next = e.key === 'ArrowDown' ? Math.min(idx + 1, options.length - 1) : Math.max(idx - 1, 0)
      onChange(options[next].value)
    }
  }

  function select(val: string) {
    onChange(val)
    setOpen(false)
    setFocused(false)
  }

  // Trigger width for fixed dropdown
  const triggerWidth = triggerRef.current?.getBoundingClientRect().width
  const triggerLeft  = triggerRef.current?.getBoundingClientRect().left

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-required={required}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openDropdown()}
        onFocus={() => setFocused(true)}
        onBlur={() => !open && setFocused(false)}
        onKeyDown={onKeyDown}
        className={[
          'select-trigger',
          !selected ? 'placeholder' : '',
          open || focused ? 'border-primary-600 bg-white' : '',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].filter(Boolean).join(' ')}
        style={open || focused ? { boxShadow: 'var(--shadow-focus)' } : undefined}
      >
        <span style={{ color: selected ? 'var(--text-1)' : 'var(--text-3)' }}>
          {selected?.label || placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>

      {/* Dropdown — rendered via fixed positioning to escape any overflow:hidden parent */}
      {open && (
        <DropdownPortal
          style={{
            left:     triggerLeft,
            width:    triggerWidth,
            overflowY: 'auto',
            overflowX: 'hidden',
            borderRadius: 12,
            background: 'white',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.06)',
            zIndex: 99999,
            position: 'fixed',
            ...dropStyle,
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onPointerDown={e => { e.preventDefault(); select(opt.value) }}
              className={`select-option ${opt.value === value ? 'selected' : ''}`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <CheckIcon />}
            </button>
          ))}
        </DropdownPortal>
      )}
    </div>
  )
}

// Renders dropdown directly into body to escape parent overflow constraints
function DropdownPortal({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted || typeof document === 'undefined') return null

  // Use ReactDOM.createPortal when available, fallback to inline for SSR
  const { createPortal } = require('react-dom') as typeof import('react-dom')
  return createPortal(
    <div
      id="select-portal"
      role="listbox"
      style={style}
      className="animate-slide-down"
    >
      {children}
    </div>,
    document.body,
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      style={{ color: 'var(--text-3)' }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className="shrink-0 text-primary-600 flex-shrink-0">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
