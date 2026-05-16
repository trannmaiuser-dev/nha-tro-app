'use client'
import Image from 'next/image'
import { useState, useRef } from 'react'
import { ImagePlus, SendHorizonal, X, Loader2 } from 'lucide-react'

interface MentionUser { id: string; full_name: string; role: string }

interface Props {
  currentUser: { fullName: string; role: string }
  onSubmit: (content: string, imageUrl: string | null) => Promise<void>
  placeholder?: string
  users?: MentionUser[]
  accentColor?: string
}

function renderMentions(text: string) {
  return text.split(/(@\S+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-semibold" style={{ color: '#1D9E75' }}>{part}</span>
      : <span key={i}>{part}</span>
  )
}

// Simple lightbox for full-size image view
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="max-w-full max-h-full rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
      <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white">
        <X size={16} strokeWidth={2.5} />
      </button>
    </div>
  )
}

export { renderMentions, Lightbox }

export default function CommentInput({ currentUser, onSubmit, placeholder = 'Viết bình luận...', users = [], accentColor = '#1D9E75' }: Props) {
  const [text,       setText]       = useState('')
  const [imgUrl,     setImgUrl]     = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [mentionQ,   setMentionQ]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value; setText(val)
    const cursor = e.target.selectionStart ?? val.length
    const before = val.slice(0, cursor); const atIdx = before.lastIndexOf('@')
    if (atIdx !== -1) {
      const q = before.slice(atIdx + 1)
      if (!q.includes(' ') && q.length <= 30) { setMentionQ(q); return }
    }
    setMentionQ(null)
  }

  function insertMention(name: string) {
    const cursor = inputRef.current?.selectionStart ?? text.length
    const before = text.slice(0, cursor); const atIdx = before.lastIndexOf('@')
    setText(text.slice(0, atIdx) + '@' + name + ' ' + text.slice(cursor))
    setMentionQ(null); setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function uploadFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh tối đa 5MB'); return }
    setUploading(true); setError('')
    try {
      const form = new FormData(); form.append('file', file)
      const res = await fetch('/api/upload/community', { method: 'POST', body: form })
      const { url, error: err } = await res.json()
      if (err) { setError(err); return }
      if (url) setImgUrl(url)
    } catch { setError('Lỗi upload ảnh') } finally { setUploading(false) }
  }

  async function submit() {
    if (!text.trim() || submitting) return
    setSubmitting(true); setError('')
    try {
      await onSubmit(text.trim(), imgUrl || null)
      setText(''); setImgUrl('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi gửi bình luận')
    } finally { setSubmitting(false) }
  }

  const filteredUsers = users
    .filter(u => u.full_name.toLowerCase().includes((mentionQ ?? '').toLowerCase()))
    .slice(0, 5)

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-1.5 rounded-xl">{error}</p>}

      {/* Image preview */}
      {imgUrl && (
        <div className="relative inline-block">
          <Image src={imgUrl} alt="" width={160} height={80} className="h-20 max-w-[160px] rounded-xl object-cover" />
          <button onClick={() => setImgUrl('')}
            className="absolute top-1 right-1 bg-black/60 text-white w-5 h-5 rounded-full flex items-center justify-center">
            <X size={9} strokeWidth={3} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Mini avatar */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white text-xs shrink-0"
          style={{ background: currentUser.role === 'owner' ? '#1D9E75' : '#5B6AD0' }}>
          {currentUser.fullName.charAt(0).toUpperCase()}
        </div>

        {/* Input + mention dropdown */}
        <div className="flex-1 relative">
          {mentionQ !== null && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl p-1.5"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 9999 }}>
              {filteredUsers.map(u => (
                <button key={u.id} onMouseDown={e => { e.preventDefault(); insertMention(u.full_name) }}
                  className="w-full text-left flex items-center gap-2.5 rounded-lg transition-colors hover:bg-[#F0FFF4]"
                  style={{ padding: '8px 12px' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                    style={{ background: u.role === 'owner' ? '#1D9E75' : '#5B6AD0' }}>
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 font-semibold text-gray-700" style={{ fontSize: 13 }}>@{u.full_name}</span>
                  {u.role === 'owner' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#E8F5EE', color: '#1D9E75' }}>Chủ nhà</span>}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200"
            style={{ background: '#F3F3F3', border: '1.5px solid transparent' }}
            onFocus={e => (e.currentTarget.style.borderColor = `${accentColor}55`)}
            onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}>
            <input ref={inputRef} value={text} onChange={handleInput}
              placeholder={`${placeholder}${users.length > 0 ? ' (@ mention)' : ''}`}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400"
              style={{ outline: 'none', border: 'none' }}
              onKeyDown={e => {
                if (e.key === 'Escape') { setMentionQ(null); return }
                if (e.key === 'Enter' && !e.shiftKey && mentionQ === null) { e.preventDefault(); submit() }
              }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors">
              {uploading ? <Loader2 size={15} strokeWidth={2} className="animate-spin" /> : <ImagePlus size={15} strokeWidth={1.5} />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
          </div>
        </div>

        {/* Send */}
        <button onClick={submit} disabled={!text.trim() || submitting}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 transition-all active:scale-95 disabled:opacity-40"
          style={{ background: accentColor }}>
          {submitting ? <Loader2 size={14} strokeWidth={2} className="animate-spin" /> : <SendHorizonal size={14} strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}
