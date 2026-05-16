'use client'
import { useState, useRef } from 'react'
import { X } from 'lucide-react'

export interface TagUser { id: string; full_name: string; role?: string }

interface Props {
  users:        TagUser[]
  selected:     TagUser[]
  onChange:     (users: TagUser[]) => void
  placeholder?: string
  maxItems?:    number
  singleSelect?: boolean
}

export default function TagInput({
  users, selected, onChange,
  placeholder = 'Tìm theo tên...', maxItems, singleSelect = false,
}: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedIds  = new Set(selected.map(u => u.id))
  const suggestions  = query.trim()
    ? users.filter(u => !selectedIds.has(u.id) && u.full_name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []
  const canAddMore   = !maxItems || selected.length < maxItems

  function add(u: TagUser) {
    if (!canAddMore) return
    onChange(singleSelect ? [u] : [...selected, u])
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function remove(id: string) { onChange(selected.filter(u => u.id !== id)) }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(u => (
            <span key={u.id} className="inline-flex items-center gap-1.5"
              style={{ background: '#F0FFF4', border: '1px solid #86EFAC', borderRadius: 99, padding: '3px 8px 3px 4px' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                style={{ background: u.role === 'owner' ? '#1D9E75' : '#5B6AD0' }}>
                {u.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[100px] truncate font-semibold" style={{ fontSize: 12, color: '#166534' }}>{u.full_name}</span>
              <button onMouseDown={e => { e.preventDefault(); remove(u.id) }}
                className="transition-opacity ml-0.5" style={{ color: '#166534', opacity: 0.6 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>
                <X size={10} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      {(!singleSelect || selected.length === 0) && canAddMore && (
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            className="input-field text-sm w-full"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl p-1.5 animate-slide-down"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 9999 }}>
              {suggestions.map(u => (
                <button key={u.id} onMouseDown={e => { e.preventDefault(); add(u) }}
                  className="w-full text-left flex items-center gap-2.5 rounded-lg transition-colors hover:bg-[#F0FFF4]"
                  style={{ padding: '8px 12px' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                    style={{ background: u.role === 'owner' ? '#1D9E75' : '#5B6AD0' }}>
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 font-semibold text-gray-700" style={{ fontSize: 13 }}>{u.full_name}</span>
                  {u.role === 'owner' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#E8F5EE', color: '#1D9E75' }}>
                      Chủ nhà
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
